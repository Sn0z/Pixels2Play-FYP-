from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from .models import Module, QuizQuestion, QuizChoice, UserModuleProgress, ParentChildLink, WatchEvent
from .serializers import ModuleSerializer, QuizQuestionSerializer, ParentChildLinkSerializer
from payments.firebase import verify_firebase_token
from django.utils import timezone


@api_view(['GET'])
def module_list(request):
    modules = Module.objects.filter(published=True).order_by('order')
    serializer = ModuleSerializer(modules, many=True)
    return Response(serializer.data)


@api_view(['POST'])
def import_module(request):
    """Accept module JSON (from Firestore admin) and create/update Module and questions.
    Requires Firebase token and admin UID configured in settings.COURSE_ADMIN_UIDS (or DEBUG True).
    """
    decoded = verify_firebase_token(request)
    if not decoded:
        return Response({'error': 'Unauthorized'}, status=status.HTTP_401_UNAUTHORIZED)

    uid = decoded.get('uid')
    from django.conf import settings

    if settings.COURSE_ADMIN_UIDS:
        if uid not in settings.COURSE_ADMIN_UIDS:
            return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
    else:
        # Allow in DEBUG for easy development
        if not settings.DEBUG:
            return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

    payload = request.data.get('module')
    if not isinstance(payload, dict):
        return Response({'error': 'module payload required'}, status=status.HTTP_400_BAD_REQUEST)

    title = payload.get('title')
    if not title:
        return Response({'error': 'title required'}, status=status.HTTP_400_BAD_REQUEST)

    module_id = payload.get('id')
    if module_id:
        module, _ = Module.objects.update_or_create(id=module_id, defaults={
            'title': payload.get('title'),
            'description': payload.get('description', ''),
            'order': payload.get('order', 0),
            'video_url': payload.get('video_url', ''),
            'video_host': payload.get('video_host', 'youtube'),
            'video_duration': float(payload.get('video_duration') or 0.0),
            'required_percent': float(payload.get('required_percent', 0.95)),
            'quiz_passing_score': float(payload.get('quiz_passing_score', 0.7)),
            'published': bool(payload.get('published', True)),
        })
    else:
        module, _ = Module.objects.update_or_create(title=title, defaults={
            'description': payload.get('description', ''),
            'order': payload.get('order', 0),
            'video_url': payload.get('video_url', ''),
            'video_host': payload.get('video_host', 'youtube'),
            'video_duration': float(payload.get('video_duration') or 0.0),
            'required_percent': float(payload.get('required_percent', 0.95)),
            'quiz_passing_score': float(payload.get('quiz_passing_score', 0.7)),
            'published': bool(payload.get('published', True)),
        })

    # Replace (clear) existing questions and choices
    module.questions.all().delete()

    for qdata in payload.get('questions', []):
        q = QuizQuestion.objects.create(module=module, text=qdata.get('text', ''))
        for c in qdata.get('choices', []):
            QuizChoice.objects.create(question=q, text=c.get('text', ''), is_correct=bool(c.get('is_correct', False)))

    return Response({'ok': True, 'module_id': module.id})


@api_view(['POST'])
def attention_event(request, module_id):
    """Receive attention events from trusted tracker or from authenticated user.

    Expected body: {
        'status': 'LOOKING' | 'NOT_LOOKING' | 'AWAY_ALERT',
        optional: 'uid' when using secret key auth (server-side tracker)
    }

    Auth: either Firebase token (Bearer) or header X-EYE-KEY with settings.EYE_TRACKER_SECRET.
    """
    from django.conf import settings

    # Try Firebase-based auth first
    decoded = verify_firebase_token(request)
    secret = request.headers.get('X-EYE-KEY') or request.headers.get('X-Eye-Key')

    if decoded:
        firebase_uid = decoded.get('uid')
    elif secret and secret == settings.EYE_TRACKER_SECRET:
        firebase_uid = request.data.get('uid')
        if not firebase_uid:
            return Response({'error': 'uid required when using secret key'}, status=status.HTTP_400_BAD_REQUEST)
    else:
        return Response({'error': 'Unauthorized'}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        module = Module.objects.get(pk=module_id)
    except Module.DoesNotExist:
        return Response({'error': 'Module not found'}, status=status.HTTP_404_NOT_FOUND)

    status_val = request.data.get('status')
    if status_val not in ['LOOKING', 'NOT_LOOKING', 'AWAY_ALERT']:
        return Response({'error': 'invalid status'}, status=status.HTTP_400_BAD_REQUEST)

    AttentionEvent.objects.create(firebase_uid=firebase_uid, module=module, status=status_val, note=request.data.get('note', ''))

    progress, _ = UserModuleProgress.objects.get_or_create(firebase_uid=firebase_uid, module=module)

    now = timezone.now()

    if status_val == 'LOOKING':
        progress.away_start = None
        progress.save()
        return Response({'action': 'play'})

    if status_val == 'NOT_LOOKING':
        if not progress.away_start:
            progress.away_start = now
            progress.save()
        # If they've been away > 60 seconds, mark ended
        if progress.away_start and (now - progress.away_start).total_seconds() > 60:
            progress.ended = True
            progress.ended_reason = 'Away too long'
            progress.save()
            return Response({'action': 'end', 'message': 'Course ended due to inactivity'})
        return Response({'action': 'pause'})

    if status_val == 'AWAY_ALERT':
        progress.ended = True
        progress.ended_reason = 'Away alert'
        progress.save()
        return Response({'action': 'end', 'message': 'Course ended due to inactivity'})

    return Response({'ok': True})


@api_view(['GET'])
def attention_status(request, module_id):
    decoded = verify_firebase_token(request)
    if not decoded:
        return Response({'error': 'Unauthorized'}, status=status.HTTP_401_UNAUTHORIZED)

    firebase_uid = decoded['uid']

    try:
        module = Module.objects.get(pk=module_id)
    except Module.DoesNotExist:
        return Response({'error': 'Module not found'}, status=status.HTTP_404_NOT_FOUND)

    last = AttentionEvent.objects.filter(firebase_uid=firebase_uid, module=module).order_by('-created_at').first()

    if not last:
        return Response({'status': 'UNKNOWN', 'action': 'play'})

    elapsed = (timezone.now() - last.created_at).total_seconds()

    # Determine action
    if last.status == 'LOOKING':
        return Response({'status': 'LOOKING', 'elapsed': elapsed, 'action': 'play'})

    if last.status == 'NOT_LOOKING':
        # If away over 60s return end
        if elapsed > 60:
            return Response({'status': 'NOT_LOOKING', 'elapsed': elapsed, 'action': 'end', 'message': 'Away too long'})
        return Response({'status': 'NOT_LOOKING', 'elapsed': elapsed, 'action': 'pause'})

    if last.status == 'AWAY_ALERT':
        return Response({'status': 'AWAY_ALERT', 'elapsed': elapsed, 'action': 'end', 'message': 'Away alert'})

    return Response({'status': last.status, 'elapsed': elapsed, 'action': 'pause'})
    """Accept module JSON (from Firestore admin) and create/update Module and questions.
    Requires Firebase token and admin UID configured in settings.COURSE_ADMIN_UIDS (or DEBUG True).
    """
    decoded = verify_firebase_token(request)
    if not decoded:
        return Response({'error': 'Unauthorized'}, status=status.HTTP_401_UNAUTHORIZED)

    uid = decoded.get('uid')
    from django.conf import settings

    if settings.COURSE_ADMIN_UIDS:
        if uid not in settings.COURSE_ADMIN_UIDS:
            return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
    else:
        # Allow in DEBUG for easy development
        if not settings.DEBUG:
            return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

    payload = request.data.get('module')
    if not isinstance(payload, dict):
        return Response({'error': 'module payload required'}, status=status.HTTP_400_BAD_REQUEST)

    title = payload.get('title')
    if not title:
        return Response({'error': 'title required'}, status=status.HTTP_400_BAD_REQUEST)

    module_id = payload.get('id')
    if module_id:
        module, _ = Module.objects.update_or_create(id=module_id, defaults={
            'title': payload.get('title'),
            'description': payload.get('description', ''),
            'order': payload.get('order', 0),
            'video_url': payload.get('video_url', ''),
            'video_host': payload.get('video_host', 'youtube'),
            'video_duration': float(payload.get('video_duration') or 0.0),
            'required_percent': float(payload.get('required_percent', 0.95)),
            'quiz_passing_score': float(payload.get('quiz_passing_score', 0.7)),
            'published': bool(payload.get('published', True)),
        })
    else:
        module, _ = Module.objects.update_or_create(title=title, defaults={
            'description': payload.get('description', ''),
            'order': payload.get('order', 0),
            'video_url': payload.get('video_url', ''),
            'video_host': payload.get('video_host', 'youtube'),
            'video_duration': float(payload.get('video_duration') or 0.0),
            'required_percent': float(payload.get('required_percent', 0.95)),
            'quiz_passing_score': float(payload.get('quiz_passing_score', 0.7)),
            'published': bool(payload.get('published', True)),
        })

    # Replace (clear) existing questions and choices
    module.questions.all().delete()

    for qdata in payload.get('questions', []):
        q = QuizQuestion.objects.create(module=module, text=qdata.get('text', ''))
        for c in qdata.get('choices', []):
            QuizChoice.objects.create(question=q, text=c.get('text', ''), is_correct=bool(c.get('is_correct', False)))

    return Response({'ok': True, 'module_id': module.id})

@api_view(['GET'])
def module_detail(request, module_id):
    try:
        module = Module.objects.get(pk=module_id, published=True)
    except Module.DoesNotExist:
        return Response({'error': 'Module not found'}, status=status.HTTP_404_NOT_FOUND)

    serializer = ModuleSerializer(module)
    return Response(serializer.data)


@api_view(['POST'])
def update_watch(request, module_id):
    decoded = verify_firebase_token(request)
    if not decoded:
        return Response({'error': 'Unauthorized'}, status=status.HTTP_401_UNAUTHORIZED)

    firebase_uid = decoded['uid']

    try:
        module = Module.objects.get(pk=module_id, published=True)
    except Module.DoesNotExist:
        return Response({'error': 'Module not found'}, status=status.HTTP_404_NOT_FOUND)

    # parental approval check: if this firebase user is a child with a pending/unapproved link, block actions
    if ParentChildLink.objects.filter(child_uid=firebase_uid, approved=False).exists():
        return Response({'error': 'Parent approval required'}, status=status.HTTP_403_FORBIDDEN)

    current_time = request.data.get('current_time')

    try:
        current_time = float(current_time)
    except (TypeError, ValueError):
        return Response({'error': 'current_time must be a number'}, status=status.HTTP_400_BAD_REQUEST)

    if current_time < 0 or current_time > module.video_duration + 5:
        return Response({'error': 'Invalid current_time'}, status=status.HTTP_400_BAD_REQUEST)

    progress, _ = UserModuleProgress.objects.get_or_create(firebase_uid=firebase_uid, module=module)

    # Plausibility check: ensure time doesn't jump faster than real-time * factor
    # Use elapsed wall time since last update; if not available, use conservative limit
    try:
        elapsed = (timezone.now() - progress.updated_at).total_seconds()
    except Exception:
        elapsed = None

    if elapsed is not None and elapsed > 0:
        allowed_advance = max(5.0, elapsed * 3.0)  # allow 3x real-time or at least 5s
        if current_time > progress.max_watched_seconds + allowed_advance:
            return Response({'error': 'Unrealistic seek detected'}, status=status.HTTP_400_BAD_REQUEST)

    # record watch event
    WatchEvent.objects.create(firebase_uid=firebase_uid, module=module, current_time=current_time)

    if current_time > progress.max_watched_seconds:
        progress.max_watched_seconds = current_time
        progress.save()

    return Response({'max_watched_seconds': progress.max_watched_seconds})


@api_view(['GET'])
def quiz(request, module_id):
    try:
        module = Module.objects.get(pk=module_id, published=True)
    except Module.DoesNotExist:
        return Response({'error': 'Module not found'}, status=status.HTTP_404_NOT_FOUND)

    questions = module.questions.all()
    serializer = QuizQuestionSerializer(questions, many=True)
    return Response(serializer.data)


@api_view(['POST'])
def submit_quiz(request, module_id):
    decoded = verify_firebase_token(request)
    if not decoded:
        return Response({'error': 'Unauthorized'}, status=status.HTTP_401_UNAUTHORIZED)

    firebase_uid = decoded['uid']

    try:
        module = Module.objects.get(pk=module_id, published=True)
    except Module.DoesNotExist:
        return Response({'error': 'Module not found'}, status=status.HTTP_404_NOT_FOUND)

    # parental approval check: block if child account has an unapproved parent link
    if ParentChildLink.objects.filter(child_uid=firebase_uid, approved=False).exists():
        return Response({'error': 'Parent approval required'}, status=status.HTTP_403_FORBIDDEN)

    answers = request.data.get('answers')
    if not isinstance(answers, (list, dict)):
        return Response({'error': 'answers must be a list or dict'}, status=status.HTTP_400_BAD_REQUEST)

    # Normalize answers to dict question_id -> choice_id
    if isinstance(answers, list):
        answers_map = {int(a['question_id']): int(a['choice_id']) for a in answers}
    else:
        answers_map = {int(k): int(v) for k, v in answers.items()}

    questions = module.questions.all()
    total = questions.count()
    correct = 0

    for q in questions:
        selected_choice_id = answers_map.get(q.id)
        if not selected_choice_id:
            continue
        try:
            choice = QuizChoice.objects.get(pk=selected_choice_id, question=q)
            if choice.is_correct:
                correct += 1
        except QuizChoice.DoesNotExist:
            continue

    score = (correct / total) if total else 0

    progress, _ = UserModuleProgress.objects.get_or_create(firebase_uid=firebase_uid, module=module)
    progress.quiz_score = score

    # Build detailed per-question results for frontend feedback
    details = []
    for q in questions:
        selected_choice_id = answers_map.get(q.id)
        correct_choice = q.choices.filter(is_correct=True).first()
        details.append({
            'question_id': q.id,
            'selected_choice_id': selected_choice_id,
            'correct_choice_id': correct_choice.id if correct_choice else None,
            'is_correct': bool(selected_choice_id and correct_choice and selected_choice_id == correct_choice.id)
        })

    # completion rule: watched enough AND score >= module.quiz_passing_score
    watched_ok = progress.max_watched_seconds >= (module.video_duration * module.required_percent)
    passed_quiz = score >= module.quiz_passing_score

    if watched_ok and passed_quiz:
        progress.completed = True

    progress.save()

    return Response({'score': score, 'completed': progress.completed, 'details': details})


@api_view(['GET'])
def module_status(request, module_id):
    decoded = verify_firebase_token(request)
    if not decoded:
        return Response({'purchased': False}, status=status.HTTP_401_UNAUTHORIZED)

    firebase_uid = decoded['uid']

    try:
        module = Module.objects.get(pk=module_id)
    except Module.DoesNotExist:
        return Response({'error': 'Module not found'}, status=status.HTTP_404_NOT_FOUND)

    progress = UserModuleProgress.objects.filter(firebase_uid=firebase_uid, module=module).first()

    if not progress:
        return Response({'purchased': False, 'completed': False, 'max_watched_seconds': 0.0, 'ended': False})

    return Response({
        'completed': progress.completed,
        'max_watched_seconds': progress.max_watched_seconds,
        'quiz_score': progress.quiz_score,
        'ended': progress.ended,
        'ended_reason': progress.ended_reason,
    })


@api_view(['POST'])
def request_parent_link(request):
    decoded = verify_firebase_token(request)
    if not decoded:
        return Response({'error': 'Unauthorized'}, status=status.HTTP_401_UNAUTHORIZED)

    parent_uid = decoded['uid']
    child_uid = request.data.get('child_uid')

    if not child_uid:
        return Response({'error': 'child_uid is required'}, status=status.HTTP_400_BAD_REQUEST)

    link, created = ParentChildLink.objects.get_or_create(parent_uid=parent_uid, child_uid=child_uid)
    serializer = ParentChildLinkSerializer(link)
    return Response({'link': serializer.data, 'created': created})


@api_view(['GET'])
def parent_links(request):
    decoded = verify_firebase_token(request)
    if not decoded:
        return Response({'error': 'Unauthorized'}, status=status.HTTP_401_UNAUTHORIZED)

    parent_uid = decoded['uid']
    links = ParentChildLink.objects.filter(parent_uid=parent_uid)
    serializer = ParentChildLinkSerializer(links, many=True)
    return Response(serializer.data)


@api_view(['POST'])
def approve_link(request):
    decoded = verify_firebase_token(request)
    if not decoded:
        return Response({'error': 'Unauthorized'}, status=status.HTTP_401_UNAUTHORIZED)

    parent_uid = decoded['uid']
    child_uid = request.data.get('child_uid')

    try:
        link = ParentChildLink.objects.get(parent_uid=parent_uid, child_uid=child_uid)
    except ParentChildLink.DoesNotExist:
        return Response({'error': 'Link not found'}, status=status.HTTP_404_NOT_FOUND)

    link.approved = True
    link.save()

    return Response({'approved': True})


@api_view(['GET'])
def module_analytics(request, module_id):
    decoded = verify_firebase_token(request)
    if not decoded:
        return Response({'error': 'Unauthorized'}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        module = Module.objects.get(pk=module_id)
    except Module.DoesNotExist:
        return Response({'error': 'Module not found'}, status=status.HTTP_404_NOT_FOUND)

    # Basic analytics
    total_events = WatchEvent.objects.filter(module=module).count()
    unique_watchers = WatchEvent.objects.filter(module=module).values('firebase_uid').distinct().count()
    from django.db.models import Avg
    avg_watch = WatchEvent.objects.filter(module=module).aggregate(Avg('current_time'))['current_time__avg'] or 0
    completions = UserModuleProgress.objects.filter(module=module, completed=True).count()

    return Response({
        'total_events': total_events,
        'unique_watchers': unique_watchers,
        'avg_watch_seconds': avg_watch,
        'completions': completions,
    })
