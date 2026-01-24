"""
Firestore service abstraction for From Pixels to Play.

This module provides a clean interface for interacting with Firebase Firestore,
abstracting away the Firebase SDK details and providing type-safe operations
for users and family links.
"""

from datetime import datetime
from typing import Optional, Dict, Any, List
from firebase_admin import firestore
from django.conf import settings
from .constants import (
    ROLE_UNASSIGNED,
    AUTH_PROVIDER_GOOGLE,
    AUTH_PROVIDER_EMAIL,
    FIRESTORE_COLLECTION_USERS,
    FIRESTORE_COLLECTION_FAMILY_LINKS,
    FAMILY_LINK_APPROVED,
)


# Initialize Firestore client
db = firestore.client()


class FirestoreService:
    """
    Service class for Firestore operations.
    
    Provides methods for:
    - User CRUD operations
    - Family link management
    - Role assignment
    """

    @staticmethod
    def get_user(user_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve a user document from Firestore.
        
        Args:
            user_id: Firebase Auth UID
            
        Returns:
            User document as dict, or None if not found
        """
        try:
            doc_ref = db.collection(FIRESTORE_COLLECTION_USERS).document(user_id)
            doc = doc_ref.get()
            
            if doc.exists:
                user_data = doc.to_dict()
                user_data['id'] = doc.id
                return user_data
            return None
        except Exception as e:
            print(f"Error getting user {user_id}: {e}")
            return None

    @staticmethod
    def create_user(
        user_id: str,
        email: str,
        name: str,
        auth_provider: str = AUTH_PROVIDER_EMAIL
    ) -> Dict[str, Any]:
        """
        Create a new user document in Firestore.
        
        Users are created with role = "UNASSIGNED" by default.
        Roles are assigned later through parent-child linking.
        
        Args:
            user_id: Firebase Auth UID
            email: User email address
            name: User display name
            auth_provider: Authentication provider (google or email)
            
        Returns:
            Created user document as dict
        """
        user_data = {
            'email': email,
            'name': name,
            'role': ROLE_UNASSIGNED,
            'auth_provider': auth_provider,
            'created_at': firestore.SERVER_TIMESTAMP,
        }
        
        try:
            doc_ref = db.collection(FIRESTORE_COLLECTION_USERS).document(user_id)
            doc_ref.set(user_data)
            user_data['id'] = user_id
            user_data['created_at'] = datetime.utcnow().isoformat()
            return user_data
        except Exception as e:
            print(f"Error creating user {user_id}: {e}")
            raise

    @staticmethod
    def update_user_role(user_id: str, role: str) -> bool:
        """
        Update a user's role in Firestore.
        
        Args:
            user_id: Firebase Auth UID
            role: New role (CHILD, PARENT, ADMIN)
            
        Returns:
            True if successful, False otherwise
        """
        try:
            doc_ref = db.collection(FIRESTORE_COLLECTION_USERS).document(user_id)
            doc_ref.update({'role': role})
            return True
        except Exception as e:
            print(f"Error updating user role {user_id}: {e}")
            return False

    @staticmethod
    def update_user(user_id: str, updates: Dict[str, Any]) -> bool:
        """
        Update user document with provided fields.
        
        Args:
            user_id: Firebase Auth UID
            updates: Dictionary of fields to update
            
        Returns:
            True if successful, False otherwise
        """
        try:
            doc_ref = db.collection(FIRESTORE_COLLECTION_USERS).document(user_id)
            doc_ref.update(updates)
            return True
        except Exception as e:
            print(f"Error updating user {user_id}: {e}")
            return False

    @staticmethod
    def create_family_link(
        parent_id: str,
        child_id: str,
        approved: bool = FAMILY_LINK_APPROVED
    ) -> Optional[Dict[str, Any]]:
        """
        Create a family link document in Firestore.
        
        Args:
            parent_id: Firebase Auth UID of parent
            child_id: Firebase Auth UID of child
            approved: Whether the link is approved (default: True)
            
        Returns:
            Created family link document as dict, or None on error
        """
        link_data = {
            'parent_id': parent_id,
            'child_id': child_id,
            'approved': approved,
            'created_at': firestore.SERVER_TIMESTAMP,
        }
        
        try:
            # Use parent_id and child_id as composite key to prevent duplicates
            link_id = f"{parent_id}_{child_id}"
            doc_ref = db.collection(FIRESTORE_COLLECTION_FAMILY_LINKS).document(link_id)
            doc_ref.set(link_data)
            link_data['id'] = link_id
            link_data['created_at'] = datetime.utcnow().isoformat()
            return link_data
        except Exception as e:
            print(f"Error creating family link: {e}")
            return None

    @staticmethod
    def get_family_links_by_parent(parent_id: str) -> List[Dict[str, Any]]:
        """
        Get all family links for a parent.
        
        Args:
            parent_id: Firebase Auth UID of parent
            
        Returns:
            List of family link documents
        """
        try:
            links_ref = db.collection(FIRESTORE_COLLECTION_FAMILY_LINKS)
            query = links_ref.where('parent_id', '==', parent_id)
            docs = query.stream()
            
            links = []
            for doc in docs:
                link_data = doc.to_dict()
                link_data['id'] = doc.id
                links.append(link_data)
            
            return links
        except Exception as e:
            print(f"Error getting family links for parent {parent_id}: {e}")
            return []

    @staticmethod
    def get_family_links_by_child(child_id: str) -> List[Dict[str, Any]]:
        """
        Get all family links for a child.
        
        Args:
            child_id: Firebase Auth UID of child
            
        Returns:
            List of family link documents
        """
        try:
            links_ref = db.collection(FIRESTORE_COLLECTION_FAMILY_LINKS)
            query = links_ref.where('child_id', '==', child_id)
            docs = query.stream()
            
            links = []
            for doc in docs:
                link_data = doc.to_dict()
                link_data['id'] = doc.id
                links.append(link_data)
            
            return links
        except Exception as e:
            print(f"Error getting family links for child {child_id}: {e}")
            return []

    @staticmethod
    def link_exists(parent_id: str, child_id: str) -> bool:
        """
        Check if a family link already exists.
        
        Args:
            parent_id: Firebase Auth UID of parent
            child_id: Firebase Auth UID of child
            
        Returns:
            True if link exists, False otherwise
        """
        try:
            link_id = f"{parent_id}_{child_id}"
            doc_ref = db.collection(FIRESTORE_COLLECTION_FAMILY_LINKS).document(link_id)
            doc = doc_ref.get()
            return doc.exists
        except Exception as e:
            print(f"Error checking link existence: {e}")
            return False
