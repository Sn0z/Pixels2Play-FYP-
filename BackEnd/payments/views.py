import requests
from django.conf import settings
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from .models import Payment
from .firebase import verify_firebase_token
from .khalti import KHALTI_INITIATE_URL, KHALTI_VERIFY_URL


@api_view(['POST'])
def initiate_payment(request):
    """
    Initiate Khalti payment for course purchase.
    
    Supports proposal section: "Payments: Khalti Integration"
    
    Rules:
    - Only PARENT can purchase courses
    - CHILD gains access only after purchase
    - Payment stored in Firestore
    
    Access: PARENT only (enforced)
    """
    from users.permissions import IsParent
    from utils.firestore import FirestoreService
    from utils.constants import ROLE_PARENT
    
    decoded = verify_firebase_token(request)
    if not decoded:
        return Response(
            {"error": "Unauthorized"},
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    uid = decoded["uid"]
    
    # Proposal requirement: Only PARENT can purchase courses
    user = FirestoreService.get_user(uid)
    if not user or user.get('role') != ROLE_PARENT:
        return Response(
            {"error": "Only parents can purchase courses"},
            status=status.HTTP_403_FORBIDDEN
        )

    course_id = request.data.get("course_id")
    plan_id = request.data.get("plan_id")
    billing_cycle = request.data.get("billing_cycle", "monthly")
    amount = request.data.get("amount")  # paisa

    # Accept either plan_id (subscription) or course_id (one-time purchase)
    order_id = plan_id or course_id
    if not order_id or not amount:
        return Response(
            {"error": "plan_id (or course_id) and amount are required"},
            status=status.HTTP_400_BAD_REQUEST
        )

    order_name = f"Subscription – {plan_id} ({billing_cycle})" if plan_id else "Course Purchase"


    payload = {
        "return_url": "http://localhost:5173/dashboard",
        "website_url": "http://localhost:5173",
        "amount": int(amount),
        "purchase_order_id": str(order_id),
        "purchase_order_name": order_name,
    }

    headers = {
        "Authorization": f"Key {settings.KHALTI_SECRET_KEY}",
        "Content-Type": "application/json",
    }

    response = requests.post(
        KHALTI_INITIATE_URL,
        json=payload,
        headers=headers
    )

    data = response.json()

    if "pidx" not in data:
        return Response(data, status=status.HTTP_400_BAD_REQUEST)

    # Store payment in Django model (for backward compatibility)
    payment = Payment.objects.create(
        firebase_uid=uid,
        course_id=str(order_id),
        amount=amount,
        khalti_pidx=data["pidx"],
        status="PENDING"
    )
    
    # Proposal requirement: Store payment in Firestore
    from firebase_admin import firestore
    from datetime import datetime
    db = firestore.client()
    
    payment_data = {
        'payment_id': data["pidx"],
        'parent_id': uid,
        'course_id': str(order_id),
        'plan_id': plan_id,
        'billing_cycle': billing_cycle,
        'amount': int(amount),
        'status': 'PENDING',
        'provider': 'KHALTI',
        'khalti_pidx': data["pidx"],
        'created_at': datetime.utcnow(),
    }
    
    db.collection('payments').document(data["pidx"]).set(payment_data)

    return Response({
        "payment_url": data["payment_url"],
        "pidx": data["pidx"]
    })



@api_view(['POST'])
def verify_payment(request):
    decoded = verify_firebase_token(request)
    uid = decoded["uid"]

    pidx = request.data.get("pidx")

    if not pidx:
        return Response(
            {"error": "pidx is required"},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        payment = Payment.objects.get(khalti_pidx=pidx, firebase_uid=uid)
    except Payment.DoesNotExist:
        return Response(
            {"error": "Payment not found"},
            status=status.HTTP_404_NOT_FOUND
        )

    headers = {
        "Authorization": f"Key {settings.KHALTI_SECRET_KEY}",
        "Content-Type": "application/json",
    }

    response = requests.post(
        KHALTI_VERIFY_URL,
        json={"pidx": pidx},
        headers=headers
    )

    data = response.json()

    if data.get("status") == "Completed":
        payment.status = "COMPLETED"
        payment.save()
        
        # Proposal requirement: Update Firestore and unlock course for child
        from firebase_admin import firestore
        from datetime import datetime
        db = firestore.client()
        
        # Update payment status in Firestore
        payment_ref = db.collection('payments').document(pidx)
        payment_ref.update({
            'status': 'COMPLETED',
            'completed_at': datetime.utcnow(),
        })
        
        # Get payment data to find parent_id and course_id
        payment_doc = payment_ref.get()
        if payment_doc.exists:
            payment_data = payment_doc.to_dict()
            parent_id = payment_data.get('parent_id')
            course_id = payment_data.get('course_id')
            
            # Add course to purchased_courses for parent
            # This allows parent's children to access the course
            purchased_ref = db.collection('purchased_courses').document(parent_id)
            purchased_doc = purchased_ref.get()
            
            if purchased_doc.exists:
                course_ids = purchased_doc.to_dict().get('course_ids', [])
                if course_id not in course_ids:
                    course_ids.append(course_id)
                    purchased_ref.update({'course_ids': course_ids})
            else:
                purchased_ref.set({
                    'parent_id': parent_id,
                    'course_ids': [course_id],
                    'created_at': datetime.utcnow(),
                })

        return Response({"success": True})

    return Response({
        "success": False,
        "status": data.get("status")
    })

@api_view(["GET"])
def course_purchase_status(request, course_id):
    """
    Check if course is purchased (for child access).
    Also checks if the user (or parent) has an active subscription.
    """
    from utils.firestore import FirestoreService
    from utils.constants import ROLE_CHILD, ROLE_PARENT
    from firebase_admin import firestore
    
    SUBSCRIPTION_PLAN_IDS = ['starter', 'pro', 'family']
    
    decoded = verify_firebase_token(request)
    if not decoded:
        return Response({"purchased": False}, status=status.HTTP_401_UNAUTHORIZED)

    uid = decoded["uid"]
    user = FirestoreService.get_user(uid)
    if not user:
        return Response({"purchased": False})
    
    user_role = user.get('role')
    db = firestore.client()

    # Determine which UID's purchases to check
    check_uids = [uid]
    if user_role == ROLE_CHILD:
        links = FirestoreService.get_family_links_by_child(uid)
        if links:
            check_uids = [link['parent_id'] for link in links]

    for check_uid in check_uids:
        # Check Firestore purchased_courses collection
        purchased_ref = db.collection('purchased_courses').document(check_uid)
        purchased_doc = purchased_ref.get()
        
        if purchased_doc.exists:
            pids = purchased_doc.to_dict().get('course_ids', [])
            # Access granted if specific course is purchased OR if a subscription PLAN is purchased
            if course_id in pids or any(plan in pids for plan in SUBSCRIPTION_PLAN_IDS):
                return Response({"purchased": True})

        # Check Django model (backward compatibility forParents)
        if user_role == ROLE_PARENT:
            if Payment.objects.filter(firebase_uid=check_uid, course_id=course_id, status="COMPLETED").exists():
                return Response({"purchased": True})

    return Response({"purchased": False})



@api_view(["GET"])
def subscription_status(request):
    """
    Check if the current user has an active subscription.
    Returns {subscribed: true/false, plan_id, billing_cycle}.
    A subscription is considered active if there is any COMPLETED
    payment that has a plan_id (i.e. came from the subscription checkout).
    """
    decoded = verify_firebase_token(request)
    if not decoded:
        return Response({"subscribed": False}, status=status.HTTP_401_UNAUTHORIZED)

    uid = decoded["uid"]

    # Check Django payment records for a completed subscription payment
    payment = Payment.objects.filter(
        firebase_uid=uid,
        status="COMPLETED",
    ).exclude(course_id__in=["scratch-101"]).first()

    # Also check Firestore payments for a plan_id-based completed payment
    try:
        from firebase_admin import firestore as fs
        db = fs.client()
        payments_ref = db.collection("payments") \
            .where("parent_id", "==", uid) \
            .where("status", "==", "COMPLETED") \
            .stream()

        for doc in payments_ref:
            data = doc.to_dict()
            if data.get("plan_id"):
                return Response({
                    "subscribed": True,
                    "plan_id": data.get("plan_id"),
                    "billing_cycle": data.get("billing_cycle", "monthly"),
                })
    except Exception as e:
        print(f"[subscription_status] Firestore error: {e}")

    # Fallback: check Django model for any non-course payment marked COMPLETED
    if payment:
        return Response({
            "subscribed": True,
            "plan_id": payment.course_id,
            "billing_cycle": "monthly",
        })

    return Response({"subscribed": False})
