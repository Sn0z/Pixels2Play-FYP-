"""
Serializers for analytics app.

Supports proposal section: "Admin & Analytics"
Metrics: Engagement, completion rates, difficulty progression, attention trends
"""

from rest_framework import serializers


class EngagementMetricsSerializer(serializers.Serializer):
    """Serializer for engagement metrics."""
    total_users = serializers.IntegerField()
    active_users = serializers.IntegerField()
    total_game_attempts = serializers.IntegerField()
    total_course_completions = serializers.IntegerField()
    average_session_duration = serializers.FloatField()


class CompletionRateSerializer(serializers.Serializer):
    """Serializer for completion rates."""
    game_id = serializers.CharField(required=False)
    course_id = serializers.CharField(required=False)
    completion_rate = serializers.FloatField(help_text="0.0 - 1.0")
    total_attempts = serializers.IntegerField()
    total_completions = serializers.IntegerField()


class DifficultyProgressionSerializer(serializers.Serializer):
    """Serializer for difficulty progression analytics."""
    student_id = serializers.CharField()
    game_id = serializers.CharField()
    difficulty_progression = serializers.ListField(
        child=serializers.IntegerField(),
        help_text="List of difficulty levels over time"
    )
    average_score = serializers.FloatField()


class AttentionTrendSerializer(serializers.Serializer):
    """Serializer for attention trends (aggregated, no PII)."""
    date = serializers.DateField()
    average_attention_percentage = serializers.FloatField()
    total_sessions = serializers.IntegerField()
    average_session_duration = serializers.FloatField()
