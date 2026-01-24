"""
Family-related API views.

This module contains API endpoints for:
- Parent-child linking (POST /api/family/link)
- Getting family links (GET /api/family/links)
"""

from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status
from family.serializers import (
    FamilyLinkRequestSerializer,
    FamilyLinkResponseSerializer,
    FamilyLinkSerializer,
)
from family.services import FamilyService
from users.permissions import IsAuthenticatedFirebase
from utils.firestore import FirestoreService
from utils.constants import ROLE_PARENT, ROLE_CHILD, ROLE_ADMIN


@api_view(['POST'])
@permission_classes([IsAuthenticatedFirebase])
def link_parent_child(request):
    """
    Create a parent-child link and assign roles.
    
    This endpoint:
    1. Validates both users exist
    2. Assigns PARENT role to parent user
    3. Assigns CHILD role to child user
    4. Creates family_links document
    
    Request:
        Headers:
            Authorization: Bearer <firebase_id_token>
        Body:
            {
                "parent_id": "uid123",
                "child_id": "uid456"
            }
    
    Response:
        {
            "status": "linked",
            "parent_role": "PARENT",
            "child_role": "CHILD",
            "message": "Parent and child linked successfully"
        }
    
    Errors:
        - 400: Validation error (users not found, link exists, etc.)
        - 401: Authentication required
    """
    # Get current user
    firebase_user = request.firebase_user
    if not firebase_user:
        return Response(
            {'error': 'Authentication required'},
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    # Validate request data
    serializer = FamilyLinkRequestSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )
    
    parent_id = serializer.validated_data['parent_id']
    child_id = serializer.validated_data['child_id']
    
    # Create family link
    try:
        result = FamilyService.create_family_link(parent_id, child_id)
        
        response_data = {
            'status': result['status'],
            'parent_role': result['parent_role'],
            'child_role': result['child_role'],
            'message': 'Parent and child linked successfully'
        }
        
        return Response(response_data, status=status.HTTP_201_CREATED)
        
    except ValueError as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        return Response(
            {'error': f'Internal server error: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticatedFirebase])
def get_family_links(request):
    """
    Get family links for the current user.
    
    Returns:
        - If user is PARENT: links to all their children
        - If user is CHILD: links to their parent(s)
        - If user is ADMIN: can query by user_id parameter
    
    Request:
        Headers:
            Authorization: Bearer <firebase_id_token>
        Query Params (optional):
            user_id: Firebase UID (only for ADMIN users)
    
    Response:
        [
            {
                "id": "link_id",
                "parent_id": "uid123",
                "child_id": "uid456",
                "approved": true,
                "created_at": "2024-01-01T00:00:00"
            }
        ]
    """
    firebase_user = request.firebase_user
    if not firebase_user:
        return Response(
            {'error': 'Authentication required'},
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    current_user_id = firebase_user['uid']
    current_user = FirestoreService.get_user(current_user_id)
    
    if not current_user:
        return Response(
            {'error': 'User not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    current_user_role = current_user.get('role')
    
    # Admin can query any user's links
    if current_user_role == ROLE_ADMIN:
        user_id = request.query_params.get('user_id', current_user_id)
        user = FirestoreService.get_user(user_id)
        if not user:
            return Response(
                {'error': 'User not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        user_role = user.get('role')
        links = FamilyService.get_family_links_for_user(user_id, user_role)
    else:
        # Regular users can only see their own links
        links = FamilyService.get_family_links_for_user(current_user_id, current_user_role)
    
    # Serialize links
    serializer = FamilyLinkSerializer(links, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)
