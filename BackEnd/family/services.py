"""
Family service layer for parent-child linking logic.

This module contains the core business logic for:
- Creating parent-child links
- Assigning roles (PARENT and CHILD)
- Validating link requests

Implements the 8-step validation and linking flow as per spec.
"""

from typing import Dict, Any, Tuple, Optional
from utils.firestore import FirestoreService
from utils.constants import (
    ROLE_UNASSIGNED,
    ROLE_PARENT,
    ROLE_CHILD,
    ROLE_ADMIN,
    FAMILY_LINK_APPROVED,
    ERROR_AUTH_FAILED,
    ERROR_INVALID_REQUESTER,
    ERROR_CHILD_NOT_AVAILABLE,
    ERROR_PARENT_VERIFICATION_FAILED,
    ERROR_SELF_LINK_BLOCKED,
    ERROR_TRANSACTION_FAILED,
    SUCCESS_LINK_SUCCESS,
)


class FamilyService:
    """
    Service class for family operations.
    
    Implements 8-step parent-child linking flow:
    1. Authenticate request sender (from Firebase token)
    2. Verify requester exists (role can be UNASSIGNED or PARENT)
    3. Verify child account exists (role must be UNASSIGNED)
    4. Verify parent email ownership (must match requester's email)
    5. Prevent self-linking (parent_email != child_email)
    6. Transaction: Assign roles + link accounts
    7. Protection: Backend enforces email matching and role assignment
    8. Return proper error codes
    """
    
    @staticmethod
    def link_parent_child_with_verification(
        requester_uid: str,
        requester_email: str,
        parent_email: str,
        child_email: str,
        consent: bool = False,
    ) -> Dict[str, Any]:
        """
        Complete 8-step parent-child linking flow.
        
        STEP 1: Authenticate Request Sender
            - Extracts requesterUID and requesterEmail from Firebase token
            - Already done by caller (FirebaseAuthentication middleware)
        
        STEP 2: Verify Requester Exists
            - Query: users/{requesterEmail}
            - Validation: Document exists, uid matches, role is NOT "CHILD"
            - Allowed roles: UNASSIGNED, PARENT
        
        STEP 3: Verify Child Account Exists
            - Input: childEmail
            - Query: users/{childEmail}
            - Validation: Document exists, role == "UNASSIGNED"
        
        STEP 4: Verify Parent Email Ownership
            - Input: parentEmail
            - Validation: parentEmail MUST equal requesterEmail
            - Firestore document must exist
            - uid must match requesterUID
        
        STEP 5: Prevent Invalid Linking
            - Check: childEmail != parentEmail
        
        STEP 6: Transaction
            - Assign Parent: role = PARENT, linked_child_email, linked_at
            - Assign Child: role = CHILD, parent_email, parent_uid, linked_at
            - Create family_link document
        
        STEP 7: Protection
            - Email must match token
            - UID must match Firestore record
            - Role assignment only via backend
        
        STEP 8: Response
            - Success: LINK_SUCCESS with roles and link_id
            - Errors: Specific error codes
        
        Args:
            requester_uid: Firebase UID from token
            requester_email: Email from Firebase token
            parent_email: Email to verify as parent (must match requester)
            child_email: Child's email to link
            consent: Whether consent was given (optional but recommended)
            
        Returns:
            Dict with status and result/error code
        """
        
        # Normalize emails
        requester_email_normalized = requester_email.lower().strip()
        parent_email_normalized = parent_email.lower().strip()
        child_email_normalized = child_email.lower().strip()
        
        print(f"[STEP 1-2] Authenticating and verifying requester: {requester_uid} ({requester_email_normalized})")
        
        # STEP 2: Verify Requester Exists and Role is Not CHILD
        requester = FirestoreService.get_user_by_email(requester_email_normalized)
        if not requester:
            print(f"[ERROR] Requester not found: {requester_email_normalized}")
            return {
                'status': 'error',
                'error_code': ERROR_INVALID_REQUESTER,
                'message': 'Requester account not found',
            }
        
        # Verify UID matches
        if requester.get('uid') != requester_uid:
            print(f"[ERROR] UID mismatch for requester: {requester.get('uid')} != {requester_uid}")
            return {
                'status': 'error',
                'error_code': ERROR_INVALID_REQUESTER,
                'message': 'UID mismatch',
            }
        
        # Verify role is not CHILD
        requester_role = requester.get('role', ROLE_UNASSIGNED)
        if requester_role == ROLE_CHILD:
            print(f"[ERROR] Requester has CHILD role, cannot be a parent")
            return {
                'status': 'error',
                'error_code': ERROR_INVALID_REQUESTER,
                'message': 'User with CHILD role cannot be a parent',
            }
        
        print(f"[STEP 3] Verifying child account exists: {child_email_normalized}")
        
        # STEP 3: Verify Child Account Exists with UNASSIGNED role
        child = FirestoreService.get_user_by_email(child_email_normalized)
        if not child:
            print(f"[ERROR] Child not found: {child_email_normalized}")
            return {
                'status': 'error',
                'error_code': ERROR_CHILD_NOT_AVAILABLE,
                'message': 'Child account not found',
            }
        
        # Verify child role is UNASSIGNED
        child_role = child.get('role', ROLE_UNASSIGNED)
        if child_role != ROLE_UNASSIGNED:
            print(f"[ERROR] Child role is {child_role}, must be UNASSIGNED")
            return {
                'status': 'error',
                'error_code': ERROR_CHILD_NOT_AVAILABLE,
                'message': f'Child account is not available (already linked)',
            }
        
        print(f"[STEP 4] Verifying parent email ownership: {parent_email_normalized}")
        
        # STEP 4: Verify Parent Email Ownership (must match requester's email)
        if parent_email_normalized != requester_email_normalized:
            print(f"[ERROR] Parent email mismatch: {parent_email_normalized} != {requester_email_normalized}")
            return {
                'status': 'error',
                'error_code': ERROR_PARENT_VERIFICATION_FAILED,
                'message': 'Parent email does not match your account',
            }
        
        # Verify parent email document exists
        parent = FirestoreService.get_user_by_email(parent_email_normalized)
        if not parent:
            print(f"[ERROR] Parent document not found: {parent_email_normalized}")
            return {
                'status': 'error',
                'error_code': ERROR_PARENT_VERIFICATION_FAILED,
                'message': 'Parent account not found',
            }
        
        # Verify UID matches
        if parent.get('uid') != requester_uid:
            print(f"[ERROR] Parent UID mismatch: {parent.get('uid')} != {requester_uid}")
            return {
                'status': 'error',
                'error_code': ERROR_PARENT_VERIFICATION_FAILED,
                'message': 'UID mismatch for parent account',
            }
        
        print(f"[STEP 5] Preventing self-linking")
        
        # STEP 5: Prevent Self-Linking
        if parent_email_normalized == child_email_normalized:
            print(f"[ERROR] Cannot link account to itself")
            return {
                'status': 'error',
                'error_code': ERROR_SELF_LINK_BLOCKED,
                'message': 'Cannot link an account to itself',
            }
        
        print(f"[STEP 6] Starting transaction to link accounts")
        
        # STEP 6: Execute Transaction
        result = FirestoreService.create_parent_child_link_transaction(
            parent_email=parent_email_normalized,
            parent_uid=requester_uid,
            child_email=child_email_normalized,
            child_uid=child.get('uid'),
        )
        
        if not result:
            print(f"[ERROR] Transaction failed")
            return {
                'status': 'error',
                'error_code': ERROR_TRANSACTION_FAILED,
                'message': 'Failed to create family link',
            }
        
        print(f"[STEP 8] Linking successful")
        
        # STEP 8: Return Success
        return {
            'status': 'success',
            'error_code': SUCCESS_LINK_SUCCESS,
            'result': {
                'status': 'linked',
                'parent_role': ROLE_PARENT,
                'child_role': ROLE_CHILD,
                'link_id': result.get('link_id'),
                'message': 'Parent and child linked successfully',
            }
        }
    
    @staticmethod
    def get_family_links_for_user(user_id: str, user_role: str):
        """
        Get family links for a user based on their role.
        
        - If PARENT: returns all children linked to this parent
        - If CHILD: returns parent links
        - If ADMIN: can see all their links
        
        Args:
            user_id: Firebase UID
            user_role: User role (PARENT, CHILD, ADMIN)
            
        Returns:
            List of family link documents
        """
        if user_role == ROLE_PARENT:
            return FirestoreService.get_family_links_by_parent(user_id)
        elif user_role == ROLE_CHILD:
            return FirestoreService.get_family_links_by_child(user_id)
        elif user_role == ROLE_ADMIN:
            return FirestoreService.get_family_links_by_parent(user_id)
        else:
            # UNASSIGNED users have no family links
            return []