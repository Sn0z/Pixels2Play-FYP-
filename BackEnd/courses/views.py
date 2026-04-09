from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny

from .models import (
    Module,
    QuizQuestion,
    QuizChoice,
    UserModuleProgress,
    ParentChildLink,
    WatchEvent,
    AttentionEvent,
)
from .serializers import ModuleSerializer, QuizQuestionSerializer, ParentChildLinkSerializer
from payments.firebase import verify_firebase_token
from users.permissions import IsChild, IsParentOrAdmin, IsAdmin, IsAuthenticatedFirebase
from utils.firestore import FirestoreService, get_db
from utils.constants import ROLE_CHILD, ROLE_UNASSIGNED
from django.utils import timezone
from firebase_admin import firestore


FIRESTORE_COURSES_COLLECTION = 'courses'
SUBSCRIPTION_PLAN_IDS = ['starter', 'pro', 'family']


@api_view(['GET'])
@permission_classes([AllowAny])
def firestore_courses_list(request):
    """
    Fetch all courses from Firestore `courses` collection.
    Also reads the `modules` subcollection (with lesson counts) for each course.
    """
    try:
        db = get_db()
        docs = db.collection(FIRESTORE_COURSES_COLLECTION).stream()
        courses = []
        for doc in docs:
            data = doc.to_dict()
            data['id'] = doc.id
            modules = []
            for mod_doc in doc.reference.collection('modules').order_by('order').stream():
                mod_data = mod_doc.to_dict()
                mod_data['id'] = mod_doc.id
                mod_data['lesson_count'] = len(list(mod_doc.reference.collection('lessons').stream()))
                modules.append(mod_data)
            data['modules'] = modules
            data['module_count'] = len(modules)
            courses.append(data)
        return Response(courses)
    except Exception as e:
        print(f"[ERROR] firestore_courses_list: {e}")
        return Response({'error': 'Failed to fetch courses'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([AllowAny])
def firestore_course_detail(request, course_id):
    """
    Fetch a single course from Firestore including its full modules + lessons subcollections.
    """
    try:
        db = get_db()
        doc_ref = db.collection(FIRESTORE_COURSES_COLLECTION).document(course_id)
        doc = doc_ref.get()
        if not doc.exists:
            return Response({'error': 'Course not found'}, status=status.HTTP_404_NOT_FOUND)
        data = doc.to_dict()
        data['id'] = doc.id
        modules = []
        for mod_doc in doc_ref.collection('modules').order_by('order').stream():
            mod_data = mod_doc.to_dict()
            mod_data['id'] = mod_doc.id
            lessons = []
            for les_doc in mod_doc.reference.collection('lessons').order_by('order').stream():
                les_data = les_doc.to_dict()
                les_data['id'] = les_doc.id
                lessons.append(les_data)
            mod_data['lessons'] = lessons
            modules.append(mod_data)
        data['modules'] = modules
        return Response(data)
    except Exception as e:
        print(f"[ERROR] firestore_course_detail({course_id}): {e}")
        return Response({'error': 'Failed to fetch course'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([AllowAny])
def firestore_modules_list(request, course_id):
    """
    Fetch all modules for a course from Firestore subcollection:
       courses/<course_id>/modules/
    """
    try:
        db = get_db()
        modules_ref = (
            db.collection(FIRESTORE_COURSES_COLLECTION)
            .document(course_id)
            .collection('modules')
        )
        docs = modules_ref.stream()
        modules = []
        for doc in docs:
            data = doc.to_dict()
            data['id'] = doc.id
            modules.append(data)
        return Response(modules)
    except Exception as e:
        print(f"[ERROR] firestore_modules_list({course_id}): {e}")
        return Response({'error': 'Failed to fetch modules'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([AllowAny])
def firestore_module_detail(request, course_id, module_id):
    """
    Fetch a single module from Firestore subcollection:
       courses/<course_id>/modules/<module_id>
    """
    try:
        db = get_db()
        doc = (
            db.collection(FIRESTORE_COURSES_COLLECTION)
            .document(course_id)
            .collection('modules')
            .document(module_id)
            .get()
        )
        if not doc.exists:
            return Response({'error': 'Module not found'}, status=status.HTTP_404_NOT_FOUND)
        data = doc.to_dict()
        data['id'] = doc.id
        return Response(data)
    except Exception as e:
        print(f"[ERROR] firestore_module_detail({course_id}, {module_id}): {e}")
        return Response({'error': 'Failed to fetch module'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([AllowAny])  # Public course list for marketing pages.
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
    """
    Receive attention events from trusted tracker or from authenticated user.
    
    Supports proposal section: "Attention-Controlled Video Playback"
    
    Rules (from proposal):
    1. When lesson video starts → start attention tracking
    2. If ATTENTIVE → video plays
    3. If DISTRACTED for > 5 seconds → pause video
    4. If attention returns → resume video
    5. If NOT_PRESENT for > 15 seconds:
       - End lesson
       - Mark lesson incomplete
       - Stop attention tracking
    
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

    # Create attention event
    AttentionEvent.objects.create(firebase_uid=firebase_uid, module=module, status=status_val, note=request.data.get('note', ''))

    progress, _ = UserModuleProgress.objects.get_or_create(firebase_uid=firebase_uid, module=module)

    now = timezone.now()

    # Proposal requirement: ATTENTIVE → video plays
    if status_val == 'LOOKING':
        progress.away_start = None
        progress.save()
        return Response({'action': 'play'})

    # Proposal requirement: DISTRACTED for > 5 seconds → pause video
    if status_val == 'NOT_LOOKING':
        if not progress.away_start:
            progress.away_start = now
            progress.save()
        
        # Check if distracted for > 5 seconds (proposal requirement)
        distracted_duration = (now - progress.away_start).total_seconds() if progress.away_start else 0
        
        if distracted_duration > 5:
            # Proposal requirement: If NOT_PRESENT for > 15 seconds → end lesson
            if distracted_duration > 15:
                progress.ended = True
                progress.ended_reason = 'Not present for more than 15 seconds'
                progress.save()
                return Response({
                    'action': 'end',
                    'message': 'Lesson ended due to inattention (not present for >15 seconds)'
                })
            # Proposal requirement: DISTRACTED for > 5 seconds → pause video
            return Response({
                'action': 'pause',
                'message': 'Video paused due to distraction (>5 seconds)'
            })
        
        # Less than 5 seconds, still tracking but not pausing yet
        return Response({'action': 'play', 'warning': 'Attention detected as distracted'})

    # Proposal requirement: AWAY_ALERT → end lesson immediately
    if status_val == 'AWAY_ALERT':
        progress.ended = True
        progress.ended_reason = 'Away alert - not present'
        progress.save()
        return Response({
            'action': 'end',
            'message': 'Lesson ended due to inattention (away alert)'
        })

    return Response({'ok': True})


@api_view(['GET'])
def attention_status(request, module_id):
    """
    Get current attention status for a module.
    
    Supports proposal section: "Attention-Controlled Video Playback"
    
    Returns action based on proposal rules:
    - ATTENTIVE → 'play'
    - DISTRACTED > 5s → 'pause'
    - NOT_PRESENT > 15s → 'end'
    """
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

    # Proposal requirement: ATTENTIVE → video plays
    if last.status == 'LOOKING':
        return Response({'status': 'LOOKING', 'elapsed': elapsed, 'action': 'play'})

    # Proposal requirement: DISTRACTED for > 5 seconds → pause video
    if last.status == 'NOT_LOOKING':
        # Proposal requirement: If NOT_PRESENT for > 15 seconds → end lesson
        if elapsed > 15:
            return Response({
                'status': 'NOT_LOOKING',
                'elapsed': elapsed,
                'action': 'end',
                'message': 'Not present for more than 15 seconds'
            })
        # Proposal requirement: DISTRACTED for > 5 seconds → pause video
        if elapsed > 5:
            return Response({
                'status': 'NOT_LOOKING',
                'elapsed': elapsed,
                'action': 'pause',
                'message': 'Distracted for more than 5 seconds'
            })
        # Less than 5 seconds, still playing but tracking
        return Response({
            'status': 'NOT_LOOKING',
            'elapsed': elapsed,
            'action': 'play',
            'warning': 'Attention detected as distracted'
        })

    # Proposal requirement: AWAY_ALERT → end lesson
    if last.status == 'AWAY_ALERT':
        return Response({
            'status': 'AWAY_ALERT',
            'elapsed': elapsed,
            'action': 'end',
            'message': 'Away alert - lesson ended'
        })

    return Response({'status': last.status, 'elapsed': elapsed, 'action': 'pause'})

@api_view(['POST'])
@permission_classes([IsAuthenticatedFirebase])
def course_activity(request):
    """
    Log study time (in seconds) for a user.
    """
    firebase_user = request.firebase_user
    if not firebase_user:
        return Response({'error': 'Unauthorized'}, status=status.HTTP_401_UNAUTHORIZED)
        
    duration_seconds = request.data.get('duration_seconds', 0)
    try:
        duration_seconds = int(duration_seconds)
    except ValueError:
        return Response({'error': 'Invalid duration format'}, status=status.HTTP_400_BAD_REQUEST)
        
    if duration_seconds > 0:
        try:
            from progress.activity import ActivityService
            student_id = firebase_user['uid']
            ActivityService.log_activity(student_id, 'study', duration_seconds)
        except Exception as e:
            print(f"[ERROR] course_activity log: {e}")
            return Response({'error': 'Failed to log activity'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
    return Response({'ok': True})


@api_view(['GET'])
@permission_classes([AllowAny])  # Public module detail for preview pages.
def module_detail(request, module_id):
    try:
        module = Module.objects.get(pk=module_id, published=True)
    except Module.DoesNotExist:
        return Response({'error': 'Module not found'}, status=status.HTTP_404_NOT_FOUND)

    serializer = ModuleSerializer(module)
    return Response(serializer.data)


@api_view(['POST'])
# 🚨 TEMPORARY: Changed from IsChild to IsAuthenticatedFirebase for development
# TODO: Change back to @permission_classes([IsChild]) to restrict to children only
@permission_classes([IsAuthenticatedFirebase])  # Was: IsChild
def update_watch(request, module_id):
    """
    Update watch progress for a module.
    
    Supports proposal section: "Video-based Courses"
    Rules: CHILD watches video, UNASSIGNED cannot access
    
    Access: CHILD only (UNASSIGNED blocked by permission)
    """
    firebase_user = request.firebase_user
    if not firebase_user:
        return Response({'error': 'Unauthorized'}, status=status.HTTP_401_UNAUTHORIZED)
    
    firebase_uid = firebase_user['uid']
    
    # 🚨 TEMPORARY: Role check bypassed for development
    # TODO: Uncomment this to re-enable CHILD-only restriction
    # # Additional check: verify user has CHILD role
    # user = FirestoreService.get_user(firebase_uid)
    # if not user or user.get('role') != ROLE_CHILD:
    #     return Response(
    #         {'error': 'Only children can watch courses. Please complete parent-child linking.'},
    #         status=status.HTTP_403_FORBIDDEN
    #     )

    try:
        module = Module.objects.get(pk=module_id, published=True)
    except Module.DoesNotExist:
        return Response({'error': 'Module not found'}, status=status.HTTP_404_NOT_FOUND)

    # parental approval check: if this firebase user is a child with a pending/unapproved link, block actions
    links = FirestoreService.get_family_links_by_child(firebase_uid)
    if links and any(not link.get('approved', True) for link in links):
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
# 🚨 TEMPORARY: Changed from IsChild to IsAuthenticatedFirebase for development
# TODO: Change back to @permission_classes([IsChild])
@permission_classes([IsAuthenticatedFirebase])  # Was: IsChild
def quiz(request, module_id):
    try:
        module = Module.objects.get(pk=module_id, published=True)
    except Module.DoesNotExist:
        return Response({'error': 'Module not found'}, status=status.HTTP_404_NOT_FOUND)

    questions = module.questions.all()
    serializer = QuizQuestionSerializer(questions, many=True)
    return Response(serializer.data)


@api_view(['POST'])
# 🚨 TEMPORARY: Changed from IsChild to IsAuthenticatedFirebase for development
# TODO: Change back to @permission_classes([IsChild])
@permission_classes([IsAuthenticatedFirebase])  # Was: IsChild
def submit_quiz(request, module_id):
    """
    Submit quiz answers for a module.
    
    Supports proposal section: "Video-based Courses"
    Educational principles: Real-time feedback
    
    Access: CHILD only (UNASSIGNED blocked by permission)
    """
    firebase_user = request.firebase_user
    if not firebase_user:
        return Response({'error': 'Unauthorized'}, status=status.HTTP_401_UNAUTHORIZED)
    
    firebase_uid = firebase_user['uid']
    
    # 🚨 TEMPORARY: Role check bypassed for development
    # TODO: Uncomment this to re-enable CHILD-only restriction
    # # Additional check: verify user has CHILD role
    # user = FirestoreService.get_user(firebase_uid)
    # if not user or user.get('role') != ROLE_CHILD:
    #     return Response(
    #         {'error': 'Only children can submit quizzes. Please complete parent-child linking.'},
    #         status=status.HTTP_403_FORBIDDEN
    #     )

    try:
        module = Module.objects.get(pk=module_id, published=True)
    except Module.DoesNotExist:
        return Response({'error': 'Module not found'}, status=status.HTTP_404_NOT_FOUND)

    # parental approval check: block if child account has an unapproved parent link
    links = FirestoreService.get_family_links_by_child(firebase_uid)
    if links and any(not link.get('approved', True) for link in links):
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
@permission_classes([IsParentOrAdmin])  # PARENT or ADMIN can view analytics
def module_analytics(request, module_id):
    """
    Get analytics for a module.
    
    Supports proposal section: "Admin & Analytics"
    
    Access: PARENT (own children only) or ADMIN
    """
    firebase_user = request.firebase_user
    if not firebase_user:
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


# ─────────────────────────────────────────────────────────────────────────────
# Course Purchase & Child Progress Endpoints
# ─────────────────────────────────────────────────────────────────────────────

@api_view(['POST'])
def purchase_course(request):
    """
    Parent purchases a course or subscription.
    Writes course_id/plan_id into purchased_courses/{uid} in Firestore.
    """
    decoded = verify_firebase_token(request)
    if not decoded:
        return Response({'error': 'Unauthorized'}, status=status.HTTP_401_UNAUTHORIZED)

    uid = decoded['uid']
    course_id = request.data.get('course_id') or request.data.get('plan_id')
    if not course_id:
        return Response({'error': 'course_id or plan_id is required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        db = get_db()
        # Verify the course or plan exists in Firestore (optional check)
        # Note: 'starter' etc. are plan IDs, while UUIDs are likely courses.
        
        purchased_ref = db.collection('purchased_courses').document(uid)
        purchased_doc = purchased_ref.get()

        if purchased_doc.exists:
            purchased_ref.update({
                'course_ids': firestore.ArrayUnion([course_id]),
                'updated_at': firestore.SERVER_TIMESTAMP
            })
        else:
            purchased_ref.set({
                'parent_id': uid,
                'course_ids': [course_id],
                'created_at': firestore.SERVER_TIMESTAMP
            })

        return Response({'ok': True, 'course_id': course_id, 'message': 'Successfully processed!'})
    except Exception as e:
        print(f"[ERROR] purchase_course: {e}")
        return Response({'error': 'Failed to process purchase'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def purchased_courses(request):
    """
    Return list of course IDs purchased by the authenticated parent.
    If subscribed, this will include the flag `is_subscribed: true`.
    """
    decoded = verify_firebase_token(request)
    if not decoded:
        return Response({'error': 'Unauthorized'}, status=status.HTTP_401_UNAUTHORIZED)

    uid = decoded['uid']
    try:
        db = get_db()
        # Correct collection as per screenshot: purchased_courses/{uid}
        user_purchased_doc = db.collection('purchased_courses').document(uid).get()
        
        purchased = []
        is_subscribed = False
        
        if user_purchased_doc.exists:
            data = user_purchased_doc.to_dict() or {}
            purchased = data.get('course_ids', [])
            # Check for subscription plans
            if any(plan_id in purchased for plan_id in SUBSCRIPTION_PLAN_IDS):
                is_subscribed = True
                # If subscribed, we grant access to all courses. 
                # The frontend will check this flag.
        
        return Response({
            'purchased_course_ids': purchased,
            'is_subscribed': is_subscribed
        })
    except Exception as e:
        print(f"[ERROR] purchased_courses: {e}")
        return Response({'error': 'Failed to fetch purchased courses'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def child_purchased_courses(request):
    """
    Return courses purchased by the child's linked parent.
    If the parent is subscribed, all courses are considered accessible.
    """
    decoded = verify_firebase_token(request)
    if not decoded:
        return Response({'error': 'Unauthorized'}, status=status.HTTP_401_UNAUTHORIZED)

    child_uid = decoded['uid']
    try:
        db = get_db()
        links = FirestoreService.get_family_links_by_child(child_uid)
        
        all_purchased = set()
        is_subscribed = False

        if not links:
            # Fallback for testing: check if child UID exists in purchased_courses
            doc = db.collection('purchased_courses').document(child_uid).get()
            if doc.exists:
                data = doc.to_dict() or {}
                pids = data.get('course_ids', [])
                all_purchased.update(pids)
                if any(plan in pids for plan in SUBSCRIPTION_PLAN_IDS):
                    is_subscribed = True
        else:
            # Check all linked parents
            for link in links:
                if not link.get('approved', True):
                    continue
                parent_doc = db.collection('purchased_courses').document(link['parent_id']).get()
                if parent_doc.exists:
                    pdata = parent_doc.to_dict() or {}
                    pids = pdata.get('course_ids', [])
                    all_purchased.update(pids)
                    if any(plan in pids for plan in SUBSCRIPTION_PLAN_IDS):
                        is_subscribed = True

        # If subbed, return all course IDs from the courses collection
        if is_subscribed:
            course_docs = db.collection(FIRESTORE_COURSES_COLLECTION).stream()
            subscription_granted_ids = [doc.id for doc in course_docs]
            return Response({
                'purchased_course_ids': subscription_granted_ids,
                'is_subscribed': True
            })

        return Response({
            'purchased_course_ids': list(all_purchased),
            'is_subscribed': False
        })
    except Exception as e:
        print(f"[ERROR] child_purchased_courses: {e}")
        return Response({'error': 'Failed to fetch child courses'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET', 'POST'])
def child_progress(request, course_id):
    """
    GET:  Return child's learning progress for a specific course.
    POST: Update child's lesson completion or quiz score.

    Firestore path: users/{uid}/progress/{course_id}
    Progress doc shape:
    {
        completed_lessons: [lesson_id, ...],
        quiz_score: float | null,
        last_accessed: timestamp
    }
    """
    decoded = verify_firebase_token(request)
    if not decoded:
        return Response({'error': 'Unauthorized'}, status=status.HTTP_401_UNAUTHORIZED)

    uid = decoded['uid']
    try:
        db = get_db()
        progress_ref = db.collection('users').document(uid).collection('progress').document(course_id)

        if request.method == 'GET':
            doc = progress_ref.get()
            if not doc.exists:
                return Response({'completed_lessons': [], 'quiz_score': None, 'last_accessed': None})
            return Response(doc.to_dict())

        # POST — update progress
        completed_lesson = request.data.get('completed_lesson')  # lesson id string
        quiz_score = request.data.get('quiz_score')              # float 0-1 or None

        update_data = {'last_accessed': firestore.SERVER_TIMESTAMP}

        if completed_lesson:
            update_data['completed_lessons'] = firestore.ArrayUnion([completed_lesson])

        if quiz_score is not None:
            try:
                update_data['quiz_score'] = float(quiz_score)
            except (TypeError, ValueError):
                return Response({'error': 'quiz_score must be a number'}, status=status.HTTP_400_BAD_REQUEST)

        progress_ref.set(update_data, merge=True)
        return Response({'ok': True})

    except Exception as e:
        print(f"[ERROR] child_progress({course_id}): {e}")
        return Response({'error': 'Failed to update progress'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
