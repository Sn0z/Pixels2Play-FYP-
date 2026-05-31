"""
Games API views.

Supports proposal section: "Games & AI Learning Modules"
Educational principles: Constructivist learning, Incremental difficulty, Real-time feedback

Role-based access:
- CHILD: Can play games, view own progress
- PARENT: Can view child's progress
- ADMIN: Full access
- UNASSIGNED: No access (enforced)
"""

from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status
from games.services import GamesService
from games.serializers import (
    GameProgressSerializer,
    GameAttemptSerializer,
    GameListSerializer,
    GameStatsSerializer,
)
from users.permissions import IsChild, IsParentOrAdmin, IsAuthenticatedFirebase
from utils.firestore import FirestoreService
from utils.constants import ROLE_CHILD, ROLE_PARENT, ROLE_ADMIN, ROLE_UNASSIGNED
import subprocess
import sys
import os


@api_view(['POST'])
@permission_classes([IsAuthenticatedFirebase])
def launch_whack_a_mole(request):
    """
    Launch the Whack-a-Mole Math Game as a local subprocess.

    Spawns whack_a_mole_math.py with the authenticated user's UID and token
    so progress can be tracked. The game window opens on the user's desktop.

    Request:
        { "difficulty": 1 }  // 1=Easy, 2=Medium, 3=Hard

    Response:
        { "launched": true, "message": "..." }
    """
    firebase_user = request.firebase_user
    student_id = firebase_user['uid']

    difficulty = request.data.get('difficulty', 1)
    try:
        difficulty = int(difficulty)
        if difficulty not in [1, 2, 3]:
            difficulty = 1
    except (TypeError, ValueError):
        difficulty = 1

    # Resolve path to whack_a_mole_math.py (two levels up from BackEnd/)
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    script_path = os.path.join(base_dir, 'whack_a_mole_math.py')

    if not os.path.exists(script_path):
        return Response(
            {'launched': False, 'message': f'Game script not found at {script_path}'},
            status=status.HTTP_404_NOT_FOUND
        )

    try:
        # Get a fresh ID token to pass to the game script
        token = request.META.get('HTTP_AUTHORIZATION', '').replace('Bearer ', '')

        subprocess.Popen(
            [
                sys.executable, script_path,
                '--difficulty', str(difficulty),
                '--student-id', student_id,
                '--token', token,
            ],
            # Detach so the game window stays open independently
            creationflags=subprocess.CREATE_NEW_CONSOLE if sys.platform == 'win32' else 0,
        )
        return Response({'launched': True, 'message': 'Game launched!'}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response(
            {'launched': False, 'message': f'Failed to launch game: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )



@api_view(['GET'])
@permission_classes([IsAuthenticatedFirebase])
def list_games(request):
    """
    List all available games.
    
    Supports proposal: "Games & AI Learning Modules"
    
    Access: All authenticated users (but UNASSIGNED cannot play)
    
    Response:
        [
            {
                "game_id": "pattern_puzzler",
                "name": "Pattern Puzzler",
                "description": "...",
                "ai_concept": "Pattern Recognition & Classification",
                "difficulty_levels": [1, 2, 3, 4, 5]
            },
            ...
        ]
    """
    games = GamesService.get_available_games()
    serializer = GameListSerializer(games, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsChild])  # Only CHILD can play games
def submit_game_attempt(request):
    """
    Submit a game attempt and update progress.
    
    Supports proposal: "Games & AI Learning Modules"
    Educational principles: Real-time feedback, Incremental difficulty
    
    Access: CHILD only (UNASSIGNED blocked by permission)
    
    Request:
        {
            "game_id": "pattern_puzzler",
            "score": 0.85,
            "difficulty_level": 2,
            "completed": true,
            "game_data": {...}
        }
    
    Response:
        {
            "game_id": "pattern_puzzler",
            "student_id": "uid123",
            "score": 0.85,
            "difficulty_level": 3,  // Adaptive difficulty updated
            "attempts": 5,
            "completed": true
        }
    """
    firebase_user = request.firebase_user
    student_id = firebase_user['uid']
    
    # Verify user has CHILD role (permission class ensures this)
    user = FirestoreService.get_user(student_id)
    if not user or user.get('role') != ROLE_CHILD:
        return Response(
            {'error': 'Only children can play games. Please complete parent-child linking.'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    serializer = GameAttemptSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        progress = GamesService.save_game_attempt(
            student_id=student_id,
            game_id=serializer.validated_data['game_id'],
            score=serializer.validated_data['score'],
            difficulty_level=serializer.validated_data['difficulty_level'],
            completed=serializer.validated_data.get('completed', False),
            game_data=serializer.validated_data.get('game_data')
        )
        
        response_serializer = GameProgressSerializer(progress)
        return Response(response_serializer.data, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response(
            {'error': f'Failed to save game attempt: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsChild])  # CHILD views own progress
def get_my_game_progress(request):
    """
    Get current user's (child's) game progress.
    
    Supports proposal: "Progress Tracking & Feedback"
    
    Access: CHILD only (views own progress)
    
    Response:
        [
            {
                "game_id": "pattern_puzzler",
                "student_id": "uid123",
                "score": 0.85,
                "difficulty_level": 3,
                "attempts": 5,
                "completed": true
            },
            ...
        ]
    """
    firebase_user = request.firebase_user
    student_id = firebase_user['uid']
    
    progress_list = GamesService.get_all_progress(student_id)
    serializer = GameProgressSerializer(progress_list, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsChild])
def get_game_stats(request, game_id):
    """
    Get statistics for a specific game for current user.
    
    Supports proposal: "Progress Tracking & Feedback"
    
    Access: CHILD only
    
    Response:
        {
            "game_id": "pattern_puzzler",
            "total_attempts": 5,
            "best_score": 0.9,
            "average_score": 0.85,
            "completion_rate": 1.0,
            "current_difficulty": 3
        }
    """
    firebase_user = request.firebase_user
    student_id = firebase_user['uid']
    
    stats = GamesService.get_game_stats(student_id, game_id)
    serializer = GameStatsSerializer(stats)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsParentOrAdmin])  # PARENT or ADMIN can view child progress
def get_child_game_progress(request, child_id):
    """
    Get game progress for a specific child (parent view).
    
    Supports proposal: "Progress Tracking & Feedback"
    Security: Parent can only view their linked child's progress
    
    Access: PARENT (own children only) or ADMIN
    
    Response:
        [
            {
                "game_id": "pattern_puzzler",
                "student_id": "child_uid",
                "score": 0.85,
                "difficulty_level": 3,
                "attempts": 5,
                "completed": true
            },
            ...
        ]
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
    
    progress_list = GamesService.get_all_progress(child_id)
    serializer = GameProgressSerializer(progress_list, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)
