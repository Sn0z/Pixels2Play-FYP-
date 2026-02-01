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
        """
        try:
            print(f"[DEBUG] UserService.get_or_create_user called with:")
            print(f"  firebase_uid: {firebase_uid}")
            print(f"  email: {email}")
            print(f"  name: {name}")
            print(f"  auth_provider: {auth_provider}")
            print(f"  picture: {picture}")
            
            email_normalized = email.lower().strip()
            print(f"[DEBUG] Normalized email: {email_normalized}")
            
            # Check if user exists by email
            print(f"[DEBUG] Checking if user exists by email...")
            user = FirestoreService.get_user_by_email(email_normalized)
            print(f"[DEBUG] get_user_by_email returned: {user}")
            
            if user:
                print(f"[DEBUG] User exists, updating...")
                # User exists: keep profile fields fresh on every login
                update_data = {
                    'email': email_normalized,
                    'name': name,
                    'username': name,
                    'auth_provider': auth_provider,
                    'last_login': firestore.SERVER_TIMESTAMP,
                }
                if picture:
                    update_data['photo_url'] = picture
                
                print(f"[DEBUG] Update data: {update_data}")
                FirestoreService.upsert_user(
                    firebase_uid,
                    email_normalized,
                    update_data
                )
                # Retrieve the updated user to return fresh data
                print(f"[DEBUG] Retrieving updated user...")
                updated_user = FirestoreService.get_user_by_email(email_normalized)
                result = updated_user if updated_user else user
                print(f"[DEBUG] Returning updated user: {result}")
                return result
            
            # User doesn't exist, create new user with UNASSIGNED role
            print(f"[DEBUG] User does not exist, creating new user...")
            created_user = FirestoreService.create_user(
                user_id=firebase_uid,
                email=email_normalized,
                name=name,
                auth_provider=auth_provider,
                picture=picture
            )
            print(f"[DEBUG] User created: {created_user}")
            return created_user
            
        except Exception as e:
            print(f"[ERROR] Exception in UserService.get_or_create_user: {e}")
            import traceback
            traceback.print_exc()
            raise
    
    @staticmethod
    def get_user_profile(firebase_uid: str, email: str = None) -> Optional[Dict[str, Any]]:
        """
        Get user profile by email or Firebase UID.
        """
        if email:
            return FirestoreService.get_user_by_email(email)
        return FirestoreService.get_user(firebase_uid)
    
    @staticmethod
    def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
        """
        Get user by email address.
        """
        return FirestoreService.get_user_by_email(email)