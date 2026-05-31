"""
Serializers for user-related API endpoints.

These serializers handle request/response data transformation for user operations.
"""

from rest_framework import serializers
from utils.constants import VALID_ROLES, VALID_AUTH_PROVIDERS


class UserSerializer(serializers.Serializer):
    """
    Serializer for user profile data.
    
    Used for GET /api/users/me endpoint.
    """
    id = serializers.CharField(read_only=True)
    uid = serializers.CharField(read_only=True)  # Expose explicit UID
    email = serializers.EmailField(read_only=True)
    username = serializers.CharField(read_only=True) # Expose username
    name = serializers.CharField(read_only=True)
    role = serializers.ChoiceField(choices=VALID_ROLES, read_only=True)
    auth_provider = serializers.ChoiceField(choices=VALID_AUTH_PROVIDERS, read_only=True)
    created_at = serializers.CharField(read_only=True, required=False)


class LoginResponseSerializer(serializers.Serializer):
    """
    Serializer for login endpoint response.
    """
    user = UserSerializer()
    message = serializers.CharField()
    role = serializers.ChoiceField(choices=VALID_ROLES)
