from firebase_admin import auth
from utils.firebase_init import ensure_initialized

# Ensure Firebase is initialized before using auth
ensure_initialized()


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
