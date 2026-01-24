"""
User-related API views.

This module contains API endpoints for:
- User login/authentication (POST /api/auth/login)
- User profile retrieval (GET /api/users/me)
"""

from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from users.services import UserService
from users.serializers import UserSerializer, LoginResponseSerializer
from users.permissions import IsAuthenticatedFirebase
from utils.constants import AUTH_PROVIDER_GOOGLE


@api_view(['POST'])
@permission_classes([AllowAny])  # Allow unauthenticated access for login
def login(request):
    """
    Login endpoint that verifies Firebase token and creates/retrieves user.
    
    This endpoint:
    1. Expects Firebase ID token in Authorization header (set by middleware)
    2. Creates user if not exists with role = "UNASSIGNED"
    3. Returns user profile with current role
    
    Request:
        Headers:
            Authorization: Bearer <firebase_id_token>
    
    Response:
        {
            "user": {
                "id": "uid123",
                "email": "user@example.com",
                "name": "User Name",
                "role": "UNASSIGNED",
                "auth_provider": "google"
            },
            "message": "Login successful",
            "role": "UNASSIGNED"
        }
    """
    # Get Firebase user from middleware
    firebase_user = request.firebase_user
    
    if not firebase_user:
        return Response(
            {'error': 'Invalid or missing Firebase token'},
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    # Extract user information from Firebase token
    uid = firebase_user['uid']
    email = firebase_user.get('email', '')
    name = firebase_user.get('name', email.split('@')[0])  # Fallback to email prefix
    
    # Determine auth provider from Firebase token
    firebase_token = firebase_user.get('firebase_token', {})
    sign_in_provider = firebase_token.get('firebase', {}).get('sign_in_provider', '')
    auth_provider = AUTH_PROVIDER_GOOGLE if sign_in_provider == 'google.com' else AUTH_PROVIDER_EMAIL
    
    # Get or create user (always creates with UNASSIGNED role)
    user = UserService.get_or_create_user(
        firebase_uid=uid,
        email=email,
        name=name,
        auth_provider=auth_provider
    )
    
    # Serialize user data
    serializer = UserSerializer(user)
    
    # Return response
    response_data = {
        'user': serializer.data,
        'message': 'Login successful',
        'role': user.get('role', 'UNASSIGNED')
    }
    
    return Response(response_data, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticatedFirebase])
def get_current_user(request):
    """
    Get current user profile.
    
    This endpoint returns the authenticated user's profile.
    If role == "UNASSIGNED", frontend should continue with linking flow.
    
    Request:
        Headers:
            Authorization: Bearer <firebase_id_token>
    
    Response:
        {
            "id": "uid123",
            "email": "user@example.com",
            "name": "User Name",
            "role": "UNASSIGNED",
            "auth_provider": "google",
            "created_at": "2024-01-01T00:00:00"
        }
    """
    firebase_user = request.firebase_user
    
    if not firebase_user:
        return Response(
            {'error': 'Authentication required'},
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    # Get user from Firestore
    user = UserService.get_user_profile(firebase_user['uid'])
    
    if not user:
        return Response(
            {'error': 'User not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Serialize and return
    serializer = UserSerializer(user)
    return Response(serializer.data, status=status.HTTP_200_OK)
