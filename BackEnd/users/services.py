"""
User service layer for business logic.

This module contains service functions that handle user-related operations,
including user creation, role management, and profile retrieval.
"""

from typing import Dict, Any, Optional
from firebase_admin import firestore
from utils.firestore import FirestoreService
from utils.constants import (
    ROLE_UNASSIGNED,
    AUTH_PROVIDER_GOOGLE,
    AUTH_PROVIDER_EMAIL,
)


class UserService:
    """
    Service class for user operations.
    """
    
    @staticmethod
    def get_or_create_user(
        firebase_uid: str,
        email: str,
        name: str,
        auth_provider: str = AUTH_PROVIDER_EMAIL,
        picture: str = ""
    ) -> Dict[str, Any]:
        """
        Get existing user or create new user with UNASSIGNED role.
        
        This is called during login/signup flow. Users are always created
        with role = "UNASSIGNED" initially. Roles are assigned later through
        parent-child linking.
        
        Args:
            firebase_uid: Firebase Auth UID
            email: User email address
            name: User display name
            auth_provider: Authentication provider (google or email)
            
        Returns:
            User document as dict
        """
        # Check if user exists
        user = FirestoreService.get_user(firebase_uid)
        
        if user:
            # User exists: keep profile fields fresh on every login (non-destructive merge).
            FirestoreService.upsert_user(
                firebase_uid,
                {
                    'email': email,
                    'name': name,
                    'auth_provider': auth_provider,
                    'photo_url': picture or user.get('photo_url', ''),
                    'last_login': firestore.SERVER_TIMESTAMP,
                },
            )
            return FirestoreService.get_user(firebase_uid) or user
        
        # User doesn't exist, create new user with UNASSIGNED role
        user = FirestoreService.create_user(
            user_id=firebase_uid,
            email=email,
            name=name,
            auth_provider=auth_provider
        )

        # Store optional profile fields for new users too.
        if picture:
            FirestoreService.upsert_user(firebase_uid, {'photo_url': picture})
        
        return user
    
    @staticmethod
    def get_user_profile(firebase_uid: str) -> Optional[Dict[str, Any]]:
        """
        Get user profile by Firebase UID.
        
        Args:
            firebase_uid: Firebase Auth UID
            
        Returns:
            User document as dict, or None if not found
        """
        return FirestoreService.get_user(firebase_uid)
    
    @staticmethod
    def update_user_role(firebase_uid: str, role: str) -> bool:
        """
        Update user role.
        
        Args:
            firebase_uid: Firebase Auth UID
            role: New role (CHILD, PARENT, ADMIN)
            
        Returns:
            True if successful, False otherwise
        """
        return FirestoreService.update_user_role(firebase_uid, role)
    
    @staticmethod
    def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
        """
        Find a user by email address.
        
        Args:
            email: User email address
            
        Returns:
            User document as dict, or None if not found
        """
        return FirestoreService.get_user_by_email(email)
