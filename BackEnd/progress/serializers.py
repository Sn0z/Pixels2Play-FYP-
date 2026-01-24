"""
Serializers for progress tracking.

Supports proposal section: "Progress Tracking & Feedback"
Tracks: Completed games, concept mastery, improvement over time, badges/achievements
"""

from rest_framework import serializers


class ProgressSummarySerializer(serializers.Serializer):
    """Serializer for child's overall progress summary."""
    student_id = serializers.CharField()
    completed_games = serializers.ListField(child=serializers.CharField())
    mastery_level = serializers.FloatField(help_text="Overall mastery (0.0 - 1.0)")
    badges = serializers.ListField(child=serializers.CharField())
    total_attempts = serializers.IntegerField()
    improvement_rate = serializers.FloatField(help_text="Improvement over time")
    last_active = serializers.DateTimeField()


class BadgeSerializer(serializers.Serializer):
    """Serializer for badge/achievement."""
    badge_id = serializers.CharField()
    name = serializers.CharField()
    description = serializers.CharField()
    earned_at = serializers.DateTimeField()
    icon_url = serializers.CharField(required=False)


class MasteryLevelSerializer(serializers.Serializer):
    """Serializer for concept mastery tracking."""
    concept = serializers.CharField(help_text="AI concept (e.g., 'Pattern Recognition')")
    mastery_level = serializers.FloatField(help_text="0.0 - 1.0")
    games_completed = serializers.IntegerField()
    last_updated = serializers.DateTimeField()
