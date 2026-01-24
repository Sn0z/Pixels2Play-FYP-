"""
Family service layer for parent-child linking logic.

This module contains the core business logic for:
- Creating parent-child links
- Assigning roles (PARENT and CHILD)
- Validating link requests
"""

from typing import Dict, Any, Optional, Tuple
from utils.firestore import FirestoreService
from utils.constants import (
    ROLE_UNASSIGNED,
    ROLE_PARENT,
    ROLE_CHILD,
    ROLE_ADMIN,
    FAMILY_LINK_APPROVED,
)


class FamilyService:
    """
    Service class for family operations.
    """
    
    @staticmethod
    def validate_link_request(parent_id: str, child_id: str) -> Tuple[bool, Optional[str]]:
        """
        Validate a parent-child link request.
        
        Validations:
        - Both users must exist
        - Users cannot link to themselves
        - Users should ideally be UNASSIGNED (but we allow role changes)
        - Link should not already exist
        
        Args:
            parent_id: Firebase UID of parent
            child_id: Firebase UID of child
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        # Check if users are trying to link to themselves
        if parent_id == child_id:
            return False, "Parent and child cannot be the same user"
        
        # Check if parent exists
        parent = FirestoreService.get_user(parent_id)
        if not parent:
            return False, f"Parent user {parent_id} not found"
        
        # Check if child exists
        child = FirestoreService.get_user(child_id)
        if not child:
            return False, f"Child user {child_id} not found"
        
        # Check if link already exists
        if FirestoreService.link_exists(parent_id, child_id):
            return False, "Family link already exists"
        
        # Check if parent already has a role assigned (should be UNASSIGNED or PARENT)
        parent_role = parent.get('role')
        if parent_role == ROLE_CHILD:
            return False, "User with CHILD role cannot be a parent"
        
        # Check if child already has a role assigned (should be UNASSIGNED or CHILD)
        child_role = child.get('role')
        if child_role == ROLE_PARENT:
            return False, "User with PARENT role cannot be a child"
        
        return True, None
    
    @staticmethod
    def create_family_link(
        parent_id: str,
        child_id: str
    ) -> Dict[str, Any]:
        """
        Create a family link and assign roles.
        
        This function:
        1. Validates the link request
        2. Assigns PARENT role to parent user
        3. Assigns CHILD role to child user
        4. Creates family_links document in Firestore
        
        Args:
            parent_id: Firebase UID of parent
            child_id: Firebase UID of child
            
        Returns:
            Dictionary with link status and role information
            
        Raises:
            ValueError: If validation fails
        """
        # Validate request
        is_valid, error_message = FamilyService.validate_link_request(parent_id, child_id)
        if not is_valid:
            raise ValueError(error_message)
        
        # Assign roles
        # Update parent role to PARENT
        parent_updated = FirestoreService.update_user_role(parent_id, ROLE_PARENT)
        if not parent_updated:
            raise ValueError("Failed to update parent role")
        
        # Update child role to CHILD
        child_updated = FirestoreService.update_user_role(child_id, ROLE_CHILD)
        if not child_updated:
            # Rollback parent role if child update fails
            FirestoreService.update_user_role(parent_id, ROLE_UNASSIGNED)
            raise ValueError("Failed to update child role")
        
        # Create family link document
        link = FirestoreService.create_family_link(
            parent_id=parent_id,
            child_id=child_id,
            approved=FAMILY_LINK_APPROVED
        )
        
        if not link:
            # Rollback role changes if link creation fails
            FirestoreService.update_user_role(parent_id, ROLE_UNASSIGNED)
            FirestoreService.update_user_role(child_id, ROLE_UNASSIGNED)
            raise ValueError("Failed to create family link")
        
        return {
            'status': 'linked',
            'parent_role': ROLE_PARENT,
            'child_role': ROLE_CHILD,
            'link_id': link.get('id'),
        }
    
    @staticmethod
    def get_family_links_for_user(user_id: str, user_role: str) -> list:
        """
        Get family links for a user based on their role.
        
        Args:
            user_id: Firebase UID of user
            user_role: User's role (PARENT or CHILD)
            
        Returns:
            List of family link documents
        """
        if user_role == ROLE_PARENT:
            return FirestoreService.get_family_links_by_parent(user_id)
        elif user_role == ROLE_CHILD:
            return FirestoreService.get_family_links_by_child(user_id)
        else:
            return []
