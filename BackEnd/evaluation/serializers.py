"""
Serializers for evaluation/testing support.

Supports proposal section: "Evaluation & Testing Support"
Tracks: Pre-test scores, post-test scores, improvement, engagement duration
"""

from rest_framework import serializers


class EvaluationDataSerializer(serializers.Serializer):
    """Serializer for evaluation data."""
    student_id = serializers.CharField()
    pre_test_score = serializers.FloatField(help_text="Pre-test score (0.0 - 1.0)")
    post_test_score = serializers.FloatField(help_text="Post-test score (0.0 - 1.0)")
    improvement = serializers.FloatField(help_text="Improvement (post - pre)")
    engagement_duration = serializers.FloatField(help_text="Total engagement time in minutes")
    timestamp = serializers.DateTimeField(required=False)


class EvaluationSubmissionSerializer(serializers.Serializer):
    """Serializer for submitting evaluation data."""
    pre_test_score = serializers.FloatField(required=True)
    post_test_score = serializers.FloatField(required=True)
    engagement_duration = serializers.FloatField(required=True, help_text="Total engagement time in minutes")
