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
    decoded = verify_firebase_token(request)
    uid = decoded["uid"]

    course_id = request.data.get("course_id")
    amount = request.data.get("amount")  # paisa

    if not course_id or not amount:
        return Response(
            {"error": "course_id and amount are required"},
            status=status.HTTP_400_BAD_REQUEST
        )

    payload = {
        "return_url": "http://localhost:5173/coursedetails",
        "website_url": "http://localhost:5173",
        "amount": int(amount),
        "purchase_order_id": str(course_id),
        "purchase_order_name": "Course Purchase",
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

    Payment.objects.create(
        firebase_uid=uid,
        course_id=course_id,
        amount=amount,
        khalti_pidx=data["pidx"],
        status="PENDING"
    )

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

        return Response({"success": True})

    return Response({
        "success": False,
        "status": data.get("status")
    })

@api_view(["GET"])
def course_purchase_status(request, course_id):
    decoded = verify_firebase_token(request)

    if not decoded:
        return Response(
            {"purchased": False},
            status=status.HTTP_401_UNAUTHORIZED
        )

    uid = decoded["uid"]

    purchased = Payment.objects.filter(
        firebase_uid=uid,
        course_id=course_id,
        status="COMPLETED"
    ).exists()

    return Response({"purchased": purchased})


