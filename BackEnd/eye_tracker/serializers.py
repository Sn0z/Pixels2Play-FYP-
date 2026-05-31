"""
Request/response serializers for eye_tracker API.
"""

from rest_framework import serializers


class StartSessionRequestSerializer(serializers.Serializer):
    """Optional session_id for POST /api/eye-tracker/start/."""

    session_id = serializers.CharField(required=False, allow_blank=True)


class StartSessionResponseSerializer(serializers.Serializer):
    """Response for start session."""

    session_id = serializers.CharField()
    status = serializers.CharField()


class StopSessionRequestSerializer(serializers.Serializer):
    """Body for POST /api/eye-tracker/stop/."""

    session_id = serializers.CharField(required=True)


class StopSessionResponseSerializer(serializers.Serializer):
    """Response for stop session."""

    status = serializers.CharField()
    session_id = serializers.CharField()


class ProcessFrameResponseSerializer(serializers.Serializer):
    """Response for process-frame (status, optional gaze_ratio, session_id, optional error)."""

    status = serializers.CharField()
    session_id = serializers.CharField(allow_null=True)
    gaze_ratio = serializers.FloatField(allow_null=True, required=False)
    error = serializers.CharField(allow_null=True, required=False)
    message = serializers.CharField(allow_null=True, required=False)


class StatusResponseSerializer(serializers.Serializer):
    """Response for GET status."""

    session_id = serializers.CharField()
    exists = serializers.BooleanField()
    last_status = serializers.CharField(allow_null=True)
    not_looking_start = serializers.FloatField(allow_null=True)
