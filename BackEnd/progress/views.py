"""
Progress tracking API views.

Supports proposal section: "Progress Tracking & Feedback"
Role-based access:
- CHILD: View own progress
- PARENT: View child's progress
- ADMIN: View any progress
"""

from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status
from progress.services import ProgressService
from progress.serializers import (
    ProgressSummarySerializer,
    BadgeSerializer,
    MasteryLevelSerializer,
)
from users.permissions import IsChild, IsParentOrAdmin, IsAuthenticatedFirebase
from utils.firestore import FirestoreService
from utils.constants import ROLE_CHILD, ROLE_PARENT, ROLE_ADMIN


@api_view(['GET'])
@permission_classes([IsChild])  # CHILD views own progress
def get_my_progress(request):
    """
    Get current user's (child's) progress summary.
    
    Supports proposal: "Progress Tracking & Feedback"
    
    Access: CHILD only
    
    Response:
        {
            "student_id": "uid123",
            "completed_games": ["pattern_puzzler", "decision_maze"],
            "mastery_level": 0.75,
            "badges": ["first_game", "pattern_master"],
            "total_attempts": 15,
            "improvement_rate": 0.1,
            "last_active": "2024-01-01T00:00:00"
        }
    """
    firebase_user = request.firebase_user
    student_id = firebase_user['uid']
    
    progress = ProgressService.get_progress_summary(student_id)
    serializer = ProgressSummarySerializer(progress)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsChild])
def get_my_mastery(request):
    """
    Get concept mastery levels for current user.
    
    Supports proposal: "Progress Tracking & Feedback"
    
    Access: CHILD only
    
    Response:
        [
            {
                "concept": "Pattern Recognition & Classification",
                "mastery_level": 0.85,
                "games_completed": 3,
                "last_updated": "2024-01-01T00:00:00"
            },
            ...
        ]
    """
    firebase_user = request.firebase_user
    student_id = firebase_user['uid']
    
    mastery = ProgressService.get_concept_mastery(student_id)
    serializer = MasteryLevelSerializer(mastery, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsParentOrAdmin])  # PARENT or ADMIN
def get_child_progress(request, child_id):
    """
    Get progress summary for a specific child (parent view).
    
    Supports proposal: "Progress Tracking & Feedback"
    Security: Parent can only view their linked child's progress
    
    Access: PARENT (own children only) or ADMIN
    
    Response:
        {
            "student_id": "child_uid",
            "completed_games": [...],
            "mastery_level": 0.75,
            "badges": [...],
            "total_attempts": 15,
            "improvement_rate": 0.1,
            "last_active": "2024-01-01T00:00:00"
        }
    """
    firebase_user = request.firebase_user
    parent_id = firebase_user['uid']
    user = FirestoreService.get_user(parent_id)
    
    # Verify parent-child relationship (unless ADMIN)
    if user and user.get('role') == ROLE_PARENT:
        # Check if child is linked to this parent
        links = FirestoreService.get_family_links_by_parent(parent_id)
        child_ids = [link['child_id'] for link in links]
        
        if child_id not in child_ids:
            return Response(
                {'error': 'You can only view progress for your linked children'},
                status=status.HTTP_403_FORBIDDEN
            )
    
    progress = ProgressService.get_progress_summary(child_id)
    serializer = ProgressSummarySerializer(progress)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsParentOrAdmin])
def get_child_mastery(request, child_id):
    """
    Get concept mastery for a specific child (parent view).
    
    Supports proposal: "Progress Tracking & Feedback"
    
    Access: PARENT (own children only) or ADMIN
    """
    firebase_user = request.firebase_user
    parent_id = firebase_user['uid']
    user = FirestoreService.get_user(parent_id)
    
    # Verify parent-child relationship (unless ADMIN)
    if user and user.get('role') == ROLE_PARENT:
        links = FirestoreService.get_family_links_by_parent(parent_id)
        child_ids = [link['child_id'] for link in links]
        
        if child_id not in child_ids:
            return Response(
                {'error': 'You can only view progress for your linked children'},
                status=status.HTTP_403_FORBIDDEN
            )
    
    mastery = ProgressService.get_concept_mastery(child_id)
    serializer = MasteryLevelSerializer(mastery, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)
