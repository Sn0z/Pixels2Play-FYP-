import firebase_admin
from firebase_admin import auth, credentials
from django.conf import settings

if not firebase_admin._apps:
    cred = credentials.Certificate(settings.FIREBASE_SERVICE_ACCOUNT)
    firebase_admin.initialize_app(cred)


def verify_firebase_token(request):
    auth_header = request.headers.get("Authorization")

    if not auth_header:
        return None

    if not auth_header.startswith("Bearer "):
        return None

    token = auth_header.split("Bearer ")[1]

    try:
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except Exception as e:
        print("Firebase token error:", e)
        return None
