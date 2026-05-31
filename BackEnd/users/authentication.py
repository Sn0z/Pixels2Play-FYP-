"""
Firebase authentication class for Django REST Framework.
"""

from firebase_admin import auth
from rest_framework import authentication, exceptions
from utils.firebase_init import ensure_initialized


class FirebaseUser:
    """
    Lightweight user object backed by Firebase Auth.
    """

    def __init__(self, firebase_user):
        self.uid = firebase_user.get("uid")  # Store UID for downstream logic.
        self.email = firebase_user.get("email", "")
        self.name = firebase_user.get("name", "")
        self.picture = firebase_user.get("picture", "")
        self.firebase_user = firebase_user
        self.is_authenticated = True  # DRF checks this to allow access.


class FirebaseAuthentication(authentication.BaseAuthentication):
    """
    DRF authentication using Firebase ID tokens.
    """

    def authenticate(self, request):
        # Reuse middleware result when available to avoid double verification.
        if getattr(request, "firebase_user", None):
            return FirebaseUser(request.firebase_user), None

        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return None  # No credentials provided; let DRF handle permissions.

        token = auth_header.split("Bearer ", 1)[1].strip()
        if not token:
            raise exceptions.AuthenticationFailed("Firebase ID token is missing.")  # Clear 401 message.

        if getattr(request, "firebase_auth_error", None):
            raise exceptions.AuthenticationFailed(request.firebase_auth_error)  # Reuse middleware error message.

        ensure_initialized()  # Ensure Admin SDK is ready before verifying tokens.

        try:
            decoded_token = auth.verify_id_token(token)
        except auth.ExpiredIdTokenError as exc:
            raise exceptions.AuthenticationFailed("Firebase ID token has expired.") from exc
        except auth.InvalidIdTokenError as exc:
            raise exceptions.AuthenticationFailed("Invalid Firebase ID token.") from exc
        except Exception as exc:
            raise exceptions.AuthenticationFailed("Firebase authentication failed.") from exc

        firebase_user = {
            "uid": decoded_token.get("uid"),
            "email": decoded_token.get("email", ""),
            "email_verified": decoded_token.get("email_verified", False),
            "name": decoded_token.get("name", ""),
            "picture": decoded_token.get("picture", ""),
            "firebase_token": decoded_token,
        }

        request.firebase_user = firebase_user  # Keep compatibility with existing permissions/views.
        return FirebaseUser(firebase_user), None

    def authenticate_header(self, request):
        return "Bearer"  # Prompt clients to send Authorization: Bearer <token>.
