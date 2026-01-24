"""
Serializers for family-related API endpoints.
"""

from rest_framework import serializers


class FamilyLinkRequestSerializer(serializers.Serializer):
    """
    Serializer for parent-child linking request.
    
    Used for POST /api/family/link endpoint.
    """
    parent_id = serializers.CharField(required=True, help_text="Firebase UID of parent user")
    child_id = serializers.CharField(required=True, help_text="Firebase UID of child user")


class FamilyLinkResponseSerializer(serializers.Serializer):
    """
    Serializer for family link response.
    """
    status = serializers.CharField()
    parent_role = serializers.CharField()
    child_role = serializers.CharField()
    message = serializers.CharField(required=False)


class FamilyLinkSerializer(serializers.Serializer):
    """
    Serializer for family link document.
    """
    id = serializers.CharField(read_only=True)
    parent_id = serializers.CharField(read_only=True)
    child_id = serializers.CharField(read_only=True)
    approved = serializers.BooleanField(read_only=True)
    created_at = serializers.CharField(read_only=True, required=False)
