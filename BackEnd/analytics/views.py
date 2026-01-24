"""
Analytics API views for admin dashboard.

Supports proposal section: "Admin & Analytics"
Access: ADMIN only (enforced)
Security: Aggregated data only, no PII
"""

from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status
from analytics.services import AnalyticsService
from analytics.serializers import (
    EngagementMetricsSerializer,
    CompletionRateSerializer,
    AttentionTrendSerializer,
)
from users.permissions import IsAdmin, IsAuthenticatedFirebase


@api_view(['GET'])
@permission_classes([IsAdmin])  # ADMIN only
def engagement_metrics(request):
    """
    Get overall engagement metrics.
    
    Supports proposal: "Admin & Analytics"
    
    Access: ADMIN only
    
    Response:
        {
            "total_users": 100,
            "active_users": 75,
            "total_game_attempts": 500,
            "total_course_completions": 200,
            "average_session_duration": 15.5
        }
    """
    metrics = AnalyticsService.get_engagement_metrics()
    serializer = EngagementMetricsSerializer(metrics)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAdmin])
def completion_rates(request):
    """
    Get completion rates for games/courses.
    
    Supports proposal: "Admin & Analytics"
    
    Access: ADMIN only
    
    Query Params:
        game_id: Optional game ID filter
        course_id: Optional course ID filter (not implemented yet)
    
    Response:
        [
            {
                "game_id": "pattern_puzzler",
                "completion_rate": 0.75,
                "total_attempts": 100,
                "total_completions": 75
            },
            ...
        ]
    """
    game_id = request.query_params.get('game_id')
    course_id = request.query_params.get('course_id')
    
    rates = AnalyticsService.get_completion_rates(game_id=game_id, course_id=course_id)
    serializer = CompletionRateSerializer(rates, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAdmin])
def attention_trends(request):
    """
    Get aggregated attention trends.
    
    Supports proposal: "Admin & Analytics"
    Security: Aggregated data only, no individual child data
    
    Access: ADMIN only
    
    Query Params:
        days: Number of days to analyze (default: 7)
    
    Response:
        [
            {
                "date": "2024-01-01",
                "average_attention_percentage": 0.75,
                "total_sessions": 50,
                "average_session_duration": 12.5
            },
            ...
        ]
    """
    days = int(request.query_params.get('days', 7))
    
    trends = AnalyticsService.get_attention_trends(days=days)
    serializer = AttentionTrendSerializer(trends, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)
