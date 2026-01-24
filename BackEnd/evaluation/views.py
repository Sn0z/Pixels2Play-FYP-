"""
Evaluation API views for research support.

Supports proposal section: "Evaluation & Testing Support"
Access: CHILD (own data) or ADMIN (all data)
"""

from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status
from evaluation.services import EvaluationService
from evaluation.serializers import (
    EvaluationDataSerializer,
    EvaluationSubmissionSerializer,
)
from users.permissions import IsChild, IsAdmin, IsAuthenticatedFirebase
from utils.firestore import FirestoreService
from utils.constants import ROLE_ADMIN


@api_view(['POST'])
@permission_classes([IsChild])  # CHILD submits own evaluation
def submit_evaluation(request):
    """
    Submit evaluation data (pre-test, post-test, engagement).
    
    Supports proposal: "Evaluation & Testing Support"
    
    Access: CHILD only (submits own evaluation)
    
    Request:
        {
            "pre_test_score": 0.5,
            "post_test_score": 0.8,
            "engagement_duration": 120.5
        }
    
    Response:
        {
            "student_id": "uid123",
            "pre_test_score": 0.5,
            "post_test_score": 0.8,
            "improvement": 0.3,
            "engagement_duration": 120.5,
            "timestamp": "2024-01-01T00:00:00"
        }
    """
    firebase_user = request.firebase_user
    student_id = firebase_user['uid']
    
    serializer = EvaluationSubmissionSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        evaluation = EvaluationService.save_evaluation_data(
            student_id=student_id,
            pre_test_score=serializer.validated_data['pre_test_score'],
            post_test_score=serializer.validated_data['post_test_score'],
            engagement_duration=serializer.validated_data['engagement_duration']
        )
        
        response_serializer = EvaluationDataSerializer(evaluation)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        return Response(
            {'error': f'Failed to save evaluation data: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsChild])  # CHILD views own evaluation
def get_my_evaluation(request):
    """
    Get current user's evaluation data.
    
    Supports proposal: "Evaluation & Testing Support"
    
    Access: CHILD only
    """
    firebase_user = request.firebase_user
    student_id = firebase_user['uid']
    
    evaluation = EvaluationService.get_evaluation_data(student_id)
    
    if not evaluation:
        return Response(
            {'error': 'No evaluation data found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    serializer = EvaluationDataSerializer(evaluation)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAdmin])  # ADMIN views all evaluation data
def get_all_evaluations(request):
    """
    Get all evaluation data (admin view).
    
    Supports proposal: "Evaluation & Testing Support"
    
    Access: ADMIN only
    
    Response:
        [
            {
                "student_id": "uid123",
                "pre_test_score": 0.5,
                "post_test_score": 0.8,
                "improvement": 0.3,
                "engagement_duration": 120.5,
                "timestamp": "2024-01-01T00:00:00"
            },
            ...
        ]
    """
    from firebase_admin import firestore
    
    try:
        db = firestore.client()
        evaluation_ref = db.collection('evaluation')
        docs = evaluation_ref.stream()
        
        evaluations = []
        for doc in docs:
            data = doc.to_dict()
            data['id'] = doc.id
            evaluations.append(data)
        
        serializer = EvaluationDataSerializer(evaluations, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response(
            {'error': f'Failed to get evaluation data: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
