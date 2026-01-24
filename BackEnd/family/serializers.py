"""
Serializers for family-related API endpoints.
"""

from rest_framework import serializers


class FamilyLinkRequestSerializer(serializers.Serializer):
    """
    Serializer for parent-child linking request.
    
    Used for POST /api/family/link endpoint.
    """
    # Accept both legacy keys (parent_id/child_id) and preferred keys (parent_uid/child_uid).
    parent_id = serializers.CharField(required=False, help_text="Firebase UID of parent user")
    child_id = serializers.CharField(required=False, help_text="Firebase UID of child user")
    parent_uid = serializers.CharField(required=False, help_text="Firebase UID of parent user (preferred)")
    child_uid = serializers.CharField(required=False, help_text="Firebase UID of child user (preferred)")

    # Optional verification/consent fields used by the setup UI.
    parent_email = serializers.EmailField(required=False, help_text="Parent email used to confirm consent")
    consent = serializers.BooleanField(required=False, help_text="Parent consent flag")

    def validate(self, attrs):
        parent = attrs.get("parent_uid") or attrs.get("parent_id")
        child = attrs.get("child_uid") or attrs.get("child_id")
        if not parent:
            raise serializers.ValidationError({"parent_uid": "parent_uid (or parent_id) is required"})
        if not child:
            raise serializers.ValidationError({"child_uid": "child_uid (or child_id) is required"})
        attrs["parent_id"] = parent
        attrs["child_id"] = child
        return attrs


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
