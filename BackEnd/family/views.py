"""
Family-related API views.

This module contains API endpoints for:
- Parent-child linking (POST /api/family/link)
- Getting family links (GET /api/family/links)
"""

from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status
from users.permissions import IsAuthenticatedFirebase
from family.serializers import (
    FamilyLinkRequestSerializer,
    FamilyLinkResponseSerializer,
    FamilyLinkSerializer,
)
from family.services import FamilyService
from utils.firestore import FirestoreService
from utils.constants import (
    ROLE_PARENT,
    ROLE_CHILD,
    ROLE_ADMIN,
    ERROR_AUTH_FAILED,
    ERROR_INVALID_REQUESTER,
    ERROR_CHILD_NOT_AVAILABLE,
    ERROR_PARENT_VERIFICATION_FAILED,
    ERROR_SELF_LINK_BLOCKED,
    ERROR_TRANSACTION_FAILED,
    SUCCESS_LINK_SUCCESS,
)


@api_view(['POST'])
@permission_classes([IsAuthenticatedFirebase])
def link_parent_child(request):
    """
    Create a parent-child link and assign roles with OTP verification.
    
    Implements OTP-gated parent-child linking with 8-step validation flow:
    1. Authenticate request sender (via Firebase token)
    2. Verify OTP for configurable email (default: child_email, purpose=email_verify)
    3. Verify requester exists and role is not CHILD
    4. Verify child account exists with UNASSIGNED role
    5. Verify parent email matches requester's email
    6. Prevent self-linking
    7. Execute transaction to assign roles and create link (only after OTP)
    8. Return proper error codes
    
    SECURITY:
    - OTP must be valid and unused (single-use enforcement)
    - OTP verification happens BEFORE transaction (critical for atomicity)
    - No linking can occur without OTP verification
    - Backend enforces all security checks server-side
    
    Request:
        Headers:
            Authorization: Bearer <firebase_id_token>
        Body:
            {
                "parent_email": "parent@example.com",
                "child_email": "child@example.com",
                "otp": "123456",
                "otp_target": "child" (optional, default: "child", can be "parent"),
                "consent": true (optional)
            }
    
    Response (Success):
        {
            "status": "linked",
            "parent_role": "PARENT",
            "child_role": "CHILD",
            "link_id": "parent@example.com_child@example.com",
            "message": "Parent and child linked successfully"
        }
    
    Response (Error):
        {
            "error_code": "ERROR_CODE",
            "message": "Human-readable error message"
        }
    
    Error Codes:
        - AUTH_FAILED: Authentication required
        - INVALID_REQUEST: Missing required fields (parent_email, child_email, otp)
        - INVALID_OTP: OTP invalid/expired/already used
        - INVALID_REQUESTER: Requester not found or has CHILD role
        - CHILD_NOT_AVAILABLE: Child not found or already linked
        - PARENT_VERIFICATION_FAILED: Parent email doesn't match requester
        - SELF_LINK_BLOCKED: Cannot link account to itself
        - TRANSACTION_FAILED: Failed to create transaction
    """
    
    # STEP 1: Authenticate Request Sender
    # (Already done by FirebaseAuthentication middleware + IsAuthenticatedFirebase permission)
    firebase_user = getattr(request, "firebase_user", None)
    if not firebase_user:
        error_msg = getattr(request, "firebase_auth_error", None) or 'Authentication required'
        return Response(
            {
                'error_code': ERROR_AUTH_FAILED,
                'message': error_msg,
            },
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    requester_uid = firebase_user.get("uid")
    requester_email = firebase_user.get("email")
    
    if not requester_uid or not requester_email:
        return Response(
            {
                'error_code': ERROR_AUTH_FAILED,
                'message': 'Invalid authentication token',
            },
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    # Extract parent_email, child_email, OTP, and OTP target from request
    parent_email = request.data.get('parent_email', '').strip()
    child_email = request.data.get('child_email', '').strip()
    otp = request.data.get('otp', '').strip()
    otp_target = request.data.get('otp_target', 'child').lower().strip()  # 'child' or 'parent'
    consent = request.data.get('consent', False)
    
    if not parent_email or not child_email or not otp:
        return Response(
            {
                'error_code': 'INVALID_REQUEST',
                'message': 'parent_email, child_email, and otp are required',
            },
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # CRITICAL: Verify OTP BEFORE any linking operations, but don't consume it yet
    # otp_target determines which email receives OTP (configurable for flexibility)
    otp_email = child_email if otp_target == 'child' else parent_email
    
    print(f"[LINKING] Step 1: Checking OTP for {otp_target} email={otp_email}, purpose=email_verify")
    from users.otp import verify_otp, OTP_PURPOSE_EMAIL_VERIFY
    
    # We peek (consume=False) here so that if subsequent steps (like link existence check)
    # fail, the user doesn't have to request a NEW code.
    otp_valid, otp_msg = verify_otp(otp_email, otp, OTP_PURPOSE_EMAIL_VERIFY, consume=False)
    if not otp_valid:
        print(f"[LINKING] OTP verification failed for {otp_email}: {otp_msg}")
        return Response(
            {
                'error_code': 'INVALID_OTP',
                'message': otp_msg or 'Invalid or expired OTP. Please request a new code.',
            },
            status=status.HTTP_400_BAD_REQUEST
        )
    
    print(f"[LINKING] OTP verified and consumed successfully")
    
    # STEP 2-6: Execute validation and linking flow
    result = FamilyService.link_parent_child_with_verification(
        requester_uid=requester_uid,
        requester_email=requester_email,
        parent_email=parent_email,
        child_email=child_email,
        consent=consent,
    )
    
    # Handle result
    if result.get('status') == 'success':
        # Only now, after EVERYTHING succeeded, do we consume the OTP
        from users.otp import consume_otp_if_valid
        consume_otp_if_valid(otp_email, otp, OTP_PURPOSE_EMAIL_VERIFY)
        print(f"[LINKING] OTP consumed successfully after linking")

        # STEP 8: Return success response
        response_data = result.get('result', {})
        return Response(response_data, status=status.HTTP_201_CREATED)
    else:
        # Return error response with proper error code
        error_code = result.get('error_code', 'UNKNOWN_ERROR')
        message = result.get('message', 'An error occurred')
        
        return Response(
            {
                'error_code': error_code,
                'message': message,
            },
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['GET'])
@permission_classes([IsAuthenticatedFirebase])
def get_family_links(request):
    """
    Get family links for the current user.
    
    Returns:
        - If user is PARENT: links to all their children
        - If user is CHILD: links to their parent(s)
        - If user is ADMIN: can query by user_id parameter
    
    Request:
        Headers:
            Authorization: Bearer <firebase_id_token>
        Query Params (optional):
            user_id: Firebase UID (only for ADMIN users)
    
    Response:
        [
            {
                "id": "link_id",
                "parent_id": "uid123",
                "child_id": "uid456",
                "approved": true,
                "created_at": "2024-01-01T00:00:00"
            }
        ]
    """
    firebase_user = getattr(request, "firebase_user", None)
    if not firebase_user:
        return Response(
            {'error': getattr(request, "firebase_auth_error", None) or 'Authentication required'},
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    current_user_id = firebase_user['uid']
    current_user = FirestoreService.get_user(current_user_id)
    
    if not current_user:
        return Response(
            {'error': 'User not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    current_user_role = current_user.get('role')
    
    # Admin can query any user's links
    if current_user_role == ROLE_ADMIN:
        user_id = request.query_params.get('user_id', current_user_id)
        user = FirestoreService.get_user(user_id)
        if not user:
            return Response(
                {'error': 'User not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        user_role = user.get('role')
        links = FamilyService.get_family_links_for_user(user_id, user_role)
    else:
        # Regular users can only see their own links
        links = FamilyService.get_family_links_for_user(current_user_id, current_user_role)
    
    # Serialize links
    serializer = FamilyLinkSerializer(links, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)
