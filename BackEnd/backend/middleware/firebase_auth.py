"""
Firebase Authentication Middleware for Django REST Framework.

This middleware verifies Firebase ID tokens from the Authorization header
and attaches user information to the request object for use in views.

Security Features:
- Verifies Firebase ID tokens on every request
- Extracts user UID and email from verified tokens
- Attaches user data to request.user and request.firebase_user
- Handles token verification errors gracefully
"""

import firebase_admin
from firebase_admin import auth, credentials
from django.utils.deprecation import MiddlewareMixin
from django.conf import settings


class FirebaseAuthenticationMiddleware(MiddlewareMixin):
    """
    Middleware to authenticate requests using Firebase ID tokens.
    
    This middleware:
    1. Extracts the Firebase ID token from the Authorization header
    2. Verifies the token with Firebase Admin SDK
    3. Attaches user information to request.firebase_user
    4. Sets request.user to None (we use Firestore, not Django auth)
    
    Usage:
        Add to MIDDLEWARE in settings.py:
        'backend.middleware.firebase_auth.FirebaseAuthenticationMiddleware',
    """
    
    def __init__(self, get_response):
        """
        Initialize Firebase Admin SDK if not already initialized.
        """
        super().__init__(get_response)
        # Initialize Firebase Admin SDK
        if not firebase_admin._apps:
            try:
                cred = credentials.Certificate(settings.FIREBASE_SERVICE_ACCOUNT)
                firebase_admin.initialize_app(cred)
            except Exception as e:
                print(f"Warning: Firebase initialization failed: {e}")
    
    def process_request(self, request):
        """
        Process the request and verify Firebase token.
        
        Sets request.firebase_user with:
        - uid: Firebase Auth UID
        - email: User email
        - email_verified: Whether email is verified
        - firebase_token: Decoded token data
        """
        # Skip authentication for certain paths (if needed)
        # For now, we authenticate all requests
        
        # Extract token from Authorization header
        auth_header = request.headers.get('Authorization', '')
        
        if not auth_header.startswith('Bearer '):
            # No token provided - request.firebase_user will be None
            request.firebase_user = None
            request.user = None
            return None
        
        # Extract token
        token = auth_header.split('Bearer ')[1].strip()
        
        if not token:
            request.firebase_user = None
            request.user = None
            return None
        
        # Verify token with Firebase
        try:
            decoded_token = auth.verify_id_token(token)
            
            # Extract user information
            request.firebase_user = {
                'uid': decoded_token.get('uid'),
                'email': decoded_token.get('email', ''),
                'email_verified': decoded_token.get('email_verified', False),
                'name': decoded_token.get('name', ''),
                'firebase_token': decoded_token,
            }
            
            # Set request.user to None (we don't use Django's auth system)
            request.user = None
            
        except auth.InvalidIdTokenError:
            # Invalid token
            request.firebase_user = None
            request.user = None
        except auth.ExpiredIdTokenError:
            # Expired token
            request.firebase_user = None
            request.user = None
        except Exception as e:
            # Other errors
            print(f"Firebase auth middleware error: {e}")
            request.firebase_user = None
            request.user = None
        
        return None
