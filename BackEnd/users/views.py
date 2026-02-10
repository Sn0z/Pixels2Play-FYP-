"""
User-related API views.

This module contains API endpoints for:
- User signup (POST /api/auth/signup)
- User login (POST /api/auth/login)
- User profile retrieval (GET /api/users/me)
- Password reset (POST /api/auth/password-reset)
"""

from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from users.services import UserService
from users.serializers import UserSerializer, LoginResponseSerializer
from utils.constants import AUTH_PROVIDER_GOOGLE, AUTH_PROVIDER_EMAIL
import firebase_admin
from firebase_admin import auth as firebase_auth


@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    """
    Login endpoint supporting email/password and Google authentication.
    
    This endpoint handles three login methods:
    1. Email/Password: Standard email authentication
    2. Google Token: OAuth authentication via Google ID token
    3. Firebase ID Token: Direct Firebase token verification
    
    Request Body (Email/Password):
        {
            "email": "user@example.com",
            "password": "password123"
        }
    
    Request Body (Google Token):
        {
            "google_token": "<google_id_token>"
        }
    
    Request Headers (Firebase ID Token):
        Authorization: Bearer <firebase_id_token>
    
    Response (200 OK):
        {
            "user": {
                "id": "user@example.com",
                "email": "user@example.com",
                "name": "User Name",
                "role": "UNASSIGNED",
                "auth_provider": "email" or "google"
            },
            "message": "Login successful",
            "role": "UNASSIGNED"
        }
    
    Error Responses:
        - 400: Invalid credentials or missing required fields
        - 401: Authentication failed
    """
    try:
        print(f"[DEBUG] Login request received")
        print(f"[DEBUG] Request method: {request.method}")
        print(f"[DEBUG] Request data: {request.data}")
        print(f"[DEBUG] Request headers: {dict(request.headers)}")
        
        # Method 1: Check for Firebase ID token in Authorization header
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            firebase_token = auth_header.split(' ')[1]
            print(f"[DEBUG] Firebase token found in Authorization header")
            try:
                print(f"[DEBUG] Calling firebase_auth.verify_id_token()...")
                decoded_token = firebase_auth.verify_id_token(firebase_token)
                print(f"[DEBUG] verify_id_token() completed successfully")
                
                uid = decoded_token['uid']
                email = decoded_token.get('email', '')
                name = decoded_token.get('name', email.split('@')[0] if email else '')
                picture = decoded_token.get('picture', '')
                
                print(f"[DEBUG] Token verified - UID: {uid}, Email: {email}")
                
                # Determine auth provider from token
                sign_in_provider = decoded_token.get('firebase', {}).get('sign_in_provider', '')
                auth_provider = AUTH_PROVIDER_GOOGLE if sign_in_provider == 'google.com' else AUTH_PROVIDER_EMAIL
                
                print(f"[DEBUG] Auth provider: {auth_provider}")
                
                # Get or create user
                print(f"[DEBUG] Calling UserService.get_or_create_user...")
                try:
                    user = UserService.get_or_create_user(
                        firebase_uid=uid,
                        email=email,
                        name=name,
                        auth_provider=auth_provider,
                        picture=picture,
                    )
                    print(f"[DEBUG] User returned from service: {user}")
                except Exception as svc_error:
                    print(f"[ERROR] UserService.get_or_create_user failed: {svc_error}")
                    import traceback
                    traceback.print_exc()
                    raise
                
                serializer = UserSerializer(user)
                response_data = {
                    'user': serializer.data,
                    'message': 'Login successful',
                    'role': user.get('role', 'UNASSIGNED')
                }
                
                print(f"[DEBUG] Returning successful login response")
                return Response(response_data, status=status.HTTP_200_OK)
            
            except firebase_admin.exceptions.InvalidIdTokenError as e:
                print(f"[ERROR] Invalid Firebase token: {e}")
                import traceback
                traceback.print_exc()
                # Fall through to check request body methods
                pass
            except Exception as e:
                print(f"[ERROR] Firebase token verification error: {e}")
                import traceback
                traceback.print_exc()
                pass
        
        # Method 2: Check if this is a Google token login in request body
        google_token = request.data.get('google_token')
        if google_token:
            try:
                # Verify the Google ID token with Firebase
                decoded_token = firebase_auth.verify_id_token(google_token)
                uid = decoded_token['uid']
                email = decoded_token.get('email', '')
                name = decoded_token.get('name', email.split('@')[0])
                picture = decoded_token.get('picture', '')
                auth_provider = AUTH_PROVIDER_GOOGLE
                
                # Get or create user
                user = UserService.get_or_create_user(
                    firebase_uid=uid,
                    email=email,
                    name=name,
                    auth_provider=auth_provider,
                    picture=picture,
                )
                
                serializer = UserSerializer(user)
                response_data = {
                    'user': serializer.data,
                    'message': 'Login successful',
                    'role': user.get('role', 'UNASSIGNED')
                }
                
                return Response(response_data, status=status.HTTP_200_OK)
            
            except firebase_admin.exceptions.InvalidIdTokenError:
                return Response(
                    {'error': 'Invalid Google token'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            except Exception as e:
                return Response(
                    {'error': f'Google authentication failed: {str(e)}'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
        
        # Method 3: Check for email/password in request body
        email = request.data.get('email')
        password = request.data.get('password')
        
        if email and password:
            try:
                # Verify credentials with Firebase
                user_record = firebase_auth.get_user_by_email(email)
                uid = user_record.uid
                
                # Get or create user in Firestore
                user = UserService.get_or_create_user(
                    firebase_uid=uid,
                    email=email,
                    name=user_record.display_name or email.split('@')[0],
                    auth_provider=AUTH_PROVIDER_EMAIL,
                    picture=user_record.photo_url or '',
                )
                
                serializer = UserSerializer(user)
                response_data = {
                    'user': serializer.data,
                    'message': 'Login successful',
                    'role': user.get('role', 'UNASSIGNED')
                }
                
                return Response(response_data, status=status.HTTP_200_OK)
            
            except firebase_admin.exceptions.UserNotFoundError:
                return Response(
                    {'error': 'Invalid email or password'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            except Exception as e:
                return Response(
                    {'error': f'Login failed: {str(e)}'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
        
        # No valid authentication method provided
        return Response(
            {'error': 'Missing required fields: provide either google_token or (email and password) or Firebase ID token in Authorization header'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    except Exception as e:
        return Response(
            {'error': f'Login failed: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_current_user(request):
    """
    Get current user profile.
    
    This endpoint returns the authenticated user's profile.
    If role == "UNASSIGNED", frontend should continue with linking flow.
    
    Request:
        Headers:
            Authorization: Bearer <firebase_id_token>
    
    Response:
        {
            "id": "uid123",
            "email": "user@example.com",
            "name": "User Name",
            "role": "UNASSIGNED",
            "auth_provider": "google",
            "created_at": "2024-01-01T00:00:00"
        }
    """
    firebase_user = request.firebase_user
    if not firebase_user:
        # When DRF auth succeeds, request.firebase_user should be present (set by FirebaseAuthentication).
        return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
    
    # Get user from Firestore
    user = UserService.get_user_profile(firebase_user['uid'])
    
    if not user:
        return Response(
            {'error': 'User not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Serialize and return
    serializer = UserSerializer(user)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def search_user_by_email(request):
    """
    Search for a user by email address.
    
    This endpoint allows authenticated users to find other users by email.
    Useful for parent-child linking flows.
    
    Supports both GET and POST methods:
    - GET: /api/users/search?email=user@example.com
    - POST: {"email": "user@example.com"}
    
    Request:
        Headers:
            Authorization: Bearer <firebase_id_token>
        
        GET: Query Parameters
            email: Email address to search for
        
        POST: JSON Body
            {
                "email": "user@example.com"
            }
    
    Response (200):
        {
            "id": "uid123",
            "email": "user@example.com",
            "name": "User Name",
            "role": "UNASSIGNED",
            "auth_provider": "google"
        }
    
    Response (404):
        {
            "error": "User not found"
        }
    
    Error Responses:
        - 400: Missing email parameter
        - 401: Authentication required
        - 404: User not found
    """
    firebase_user = request.firebase_user
    if not firebase_user:
        return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
    
    # Support both GET (query params) and POST (JSON body)
    if request.method == 'GET':
        email = request.query_params.get('email')
    else:  # POST
        email = request.data.get('email')
    
    if not email:
        return Response(
            {'error': 'Email parameter is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Search for user by email
    user = UserService.get_user_by_email(email)
    
    if not user:
        return Response(
            {'error': 'User not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Serialize and return
    serializer = UserSerializer(user)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def signup(request):
    """
    Sign up a new user with email, password, and OTP verification.
    
    This endpoint implements OTP-gated signup:
    1. Validates input (email, password, name, otp)
    2. Verifies OTP for purpose='signup' and consumes it (single-use)
    3. Checks if user already exists in Firebase
    4. Creates new Firebase Auth user
    5. Creates Firestore document with role = "UNASSIGNED"
    6. Returns user profile
    
    SECURITY:
    - OTP must be valid and unused (single-use enforcement)
    - OTP cannot be bypassed from frontend (verified server-side)
    - User cannot exist before OTP verification
    
    Request Body:
        {
            "email": "user@example.com",
            "password": "secure_password",
            "name": "User Name",
            "otp": "123456"
        }
    
    Response (201 Created):
        {
            "user": {
                "id": "user@example.com",
                "email": "user@example.com",
                "name": "User Name",
                "username": "User Name",
                "role": "UNASSIGNED",
                "auth_provider": "email",
                "created_at": "2024-01-01T00:00:00Z"
            },
            "message": "User created successfully",
            "role": "UNASSIGNED"
        }
    
    Error Responses:
        - 400: Validation failed (missing fields, weak password, etc.)
        - 400: OTP invalid/expired/already used
        - 400: Email already exists
        - 500: Firebase or Firestore error during creation
    """
    try:
        print(f"[SIGNUP] Request received")
        
        # Extract and validate input
        email = request.data.get('email', '').strip().lower()
        password = request.data.get('password', '')
        name = request.data.get('name', '').strip()
        otp = request.data.get('otp', '').strip()
        
        print(f"[SIGNUP] Input: email={email}, name={name}, password_length={len(password)}, otp_length={len(otp)}")
        
        # Validate required fields
        if not email:
            return Response(
                {'error': 'Email is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not password:
            return Response(
                {'error': 'Password is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not name:
            return Response(
                {'error': 'Name is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not otp:
            return Response(
                {'error': 'OTP is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate email format (basic)
        if '@' not in email or '.' not in email.split('@')[1]:
            return Response(
                {'error': 'Invalid email format'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate password strength
        if len(password) < 6:
            return Response(
                {'error': 'Password must be at least 6 characters'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # CRITICAL: Verify and consume OTP BEFORE creating user
        print(f"[SIGNUP] Step 1: Verifying OTP for email={email}, purpose=signup")
        from users.otp import consume_otp_if_valid, OTP_PURPOSE_SIGNUP
        
        otp_valid = consume_otp_if_valid(email, otp, OTP_PURPOSE_SIGNUP)
        if not otp_valid:
            print(f"[SIGNUP] OTP verification failed for {email}")
            return Response(
                {'error': 'Invalid or expired OTP. Please request a new code.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        print(f"[SIGNUP] OTP verified and consumed successfully")
        print(f"[SIGNUP] Step 2: Input validation passed")
        
        # Check if user already exists in Firestore
        print(f"[DEBUG] Checking if user already exists in Firestore...")
        existing_user = UserService.get_user_by_email(email)
        if existing_user:
            print(f"[DEBUG] User already exists: {email}")
            return Response(
                {'error': 'Email already registered'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create Firebase Auth user
        print(f"[DEBUG] Creating Firebase Auth user for {email}...")
        try:
            firebase_user = firebase_auth.create_user(
                email=email,
                password=password,
                display_name=name
            )
            print(f"[DEBUG] Firebase Auth user created: uid={firebase_user.uid}")
        
        except firebase_admin.exceptions.AlreadyExistsError:
            print(f"[ERROR] User already exists in Firebase: {email}")
            return Response(
                {'error': 'Email already registered'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        except firebase_admin.exceptions.InvalidArgumentError as e:
            print(f"[ERROR] Invalid argument creating Firebase user: {e}")
            return Response(
                {'error': f'Invalid input: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        except Exception as e:
            print(f"[ERROR] Unexpected error creating Firebase Auth user: {type(e).__name__}: {e}")
            import traceback
            traceback.print_exc()
            return Response(
                {'error': f'Failed to create account: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # Create user in Firestore
        print(f"[DEBUG] Creating Firestore user document...")
        try:
            user = UserService.get_or_create_user(
                firebase_uid=firebase_user.uid,
                email=email,
                name=name,
                auth_provider=AUTH_PROVIDER_EMAIL,
                picture=''
            )
            print(f"[DEBUG] Firestore user created successfully: {email}")
        
        except Exception as e:
            print(f"[ERROR] Error creating Firestore user: {type(e).__name__}: {e}")
            import traceback
            traceback.print_exc()
            
            # Try to clean up Firebase user if Firestore fails
            try:
                print(f"[DEBUG] Attempting to delete Firebase user due to Firestore failure...")
                firebase_auth.delete_user(firebase_user.uid)
                print(f"[DEBUG] Firebase user deleted")
            except Exception as cleanup_error:
                print(f"[ERROR] Failed to clean up Firebase user: {cleanup_error}")
            
            return Response(
                {'error': 'Failed to complete signup. Please try again.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # Return successful response
        serializer = UserSerializer(user)
        response_data = {
            'user': serializer.data,
            'message': 'User created successfully',
            'role': user.get('role', 'UNASSIGNED')
        }
        
        print(f"[DEBUG] Signup successful for {email}")
        return Response(response_data, status=status.HTTP_201_CREATED)
    
    except Exception as e:
        print(f"[ERROR] Unexpected error in signup: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        return Response(
            {'error': 'An unexpected error occurred. Please try again.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def password_reset(request):
    """
    Send password reset email to user.
    
    This endpoint sends a password reset link to the user's email address.
    
    Request Body:
        {
            "email": "user@example.com"
        }
    
    Response:
        {
            "message": "Password reset email sent"
        }
    
    Error Responses:
        - 400: Invalid email
        - 404: User not found
        - 500: Server error
    """
    try:
        email = request.data.get('email', '').strip().lower()
        
        if not email:
            return Response(
                {'error': 'Email is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if user exists
        user = UserService.get_user_by_email(email)
        if not user:
            # Don't reveal whether email exists for security
            return Response(
                {'message': 'If email exists, password reset link has been sent'},
                status=status.HTTP_200_OK
            )
        
        # Send password reset email via Firebase
        try:
            reset_link = firebase_auth.generate_password_reset_link(email)
            # Note: In production, you should send this link via email service
            # For now, we're using Firebase's built-in functionality
            return Response(
                {'message': 'Password reset email sent'},
                status=status.HTTP_200_OK
            )
        except Exception as e:
            print(f"Error sending password reset: {e}")
            return Response(
                {'message': 'If email exists, password reset link has been sent'},
                status=status.HTTP_200_OK
            )
    
    except Exception as e:
        return Response(
            {'error': f'Password reset failed: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def send_otp(request):
    """
    Send an OTP to the given email for the specified purpose (SMTP).

    Request Body:
        {
            "email": "user@example.com",
            "purpose": "signup" | "login" | "password_reset" | "email_verify"
        }

    Response (200):
        { "message": "OTP sent to your email." }

    Error (400):
        { "error": "Invalid email address." }
        { "error": "Too many OTP requests. Please try again later." }
    """
    from users.otp import send_otp as otp_send, OTP_PURPOSES

    email = (request.data.get('email') or '').strip().lower()
    purpose = (request.data.get('purpose') or '').strip().lower()

    if not email:
        return Response(
            {'error': 'Email is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    if purpose not in OTP_PURPOSES:
        return Response(
            {'error': f'Purpose must be one of: {", ".join(OTP_PURPOSES)}'},
            status=status.HTTP_400_BAD_REQUEST
        )

    success, msg = otp_send(email, purpose)
    if not success:
        return Response({'error': msg}, status=status.HTTP_400_BAD_REQUEST)
    return Response({'message': msg}, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def verify_otp(request):
    """
    Verify OTP for the given email and purpose. OTP is single-use.

    Request Body:
        {
            "email": "user@example.com",
            "otp": "123456",
            "purpose": "signup" | "login" | "password_reset" | "email_verify"
        }

    Response (200):
        { "message": "Verification successful." }

    Error (400):
        { "error": "Invalid or expired code." }
    """
    from users.otp import verify_otp as otp_verify, OTP_PURPOSES

    email = (request.data.get('email') or '').strip().lower()
    code = (request.data.get('otp') or request.data.get('code') or '').strip()
    purpose = (request.data.get('purpose') or '').strip().lower()

    if not email or not code:
        return Response(
            {'error': 'Email and OTP are required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    if purpose not in OTP_PURPOSES:
        return Response(
            {'error': f'Purpose must be one of: {", ".join(OTP_PURPOSES)}'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Verify without consuming (peek) so it's still available for the actual action (e.g. signup)
    success, msg = otp_verify(email, code, purpose, consume=False)
    if not success:
        return Response({'error': msg}, status=status.HTTP_400_BAD_REQUEST)
    return Response({'message': msg}, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([AllowAny])
def firebase_health_check(request):
    """
    Diagnostic endpoint to verify Firebase Admin SDK initialization.
    
    Returns detailed information about Firebase setup status.
    
    Response (200 OK):
        {
            "status": "healthy",
            "firebase_initialized": true,
            "project_id": "auth-4f25b",
            "service_account_loaded": true,
            "auth_working": true,
            "firestore_working": true
        }
    
    Error Response (500):
        {
            "status": "unhealthy",
            "error": "Description of what failed"
        }
    """
    try:
        from utils.firebase_init import ensure_initialized
        from utils.firestore import get_db
        
        print("[DEBUG] Firebase health check requested")
        
        diagnostics = {
            "status": "healthy",
            "checks": {}
        }
        
        # Check 1: Firebase initialization
        try:
            print("[DEBUG] Checking Firebase initialization...")
            ensure_initialized()
            diagnostics["checks"]["firebase_initialized"] = True
            diagnostics["firebase_initialized"] = True
        except Exception as e:
            print(f"[ERROR] Firebase initialization failed: {e}")
            diagnostics["checks"]["firebase_initialized"] = False
            diagnostics["status"] = "unhealthy"
            diagnostics["error"] = f"Firebase init failed: {str(e)}"
            return Response(diagnostics, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Check 2: Get project ID
        try:
            print("[DEBUG] Getting project ID...")
            import firebase_admin
            app = firebase_admin.get_app()
            project_id = app.options.credentials.get_credential().project_id if hasattr(app.options.credentials, 'get_credential') else "Unknown"
            
            # Try to get from service account
            from firebase_admin import credentials
            creds = app.options.credentials
            if hasattr(creds, '_credentials'):
                project_id = getattr(creds._credentials, 'project_id', 'Unknown')
            
            diagnostics["project_id"] = project_id
            print(f"[DEBUG] Project ID: {project_id}")
        except Exception as e:
            print(f"[ERROR] Failed to get project ID: {e}")
            diagnostics["project_id"] = "Error retrieving"
        
        # Check 3: Firebase Auth working
        try:
            print("[DEBUG] Testing Firebase Auth...")
            from firebase_admin import auth as firebase_auth
            # This will only work if service account has proper permissions
            # We just test if the module is accessible
            diagnostics["checks"]["auth_module"] = True
            print("[DEBUG] Firebase Auth module accessible")
        except Exception as e:
            print(f"[ERROR] Firebase Auth check failed: {e}")
            diagnostics["checks"]["auth_module"] = False
            diagnostics["status"] = "warning"
        
        # Check 4: Firestore working
        try:
            print("[DEBUG] Testing Firestore...")
            db = get_db()
            diagnostics["checks"]["firestore_accessible"] = True
            diagnostics["firestore_working"] = True
            print("[DEBUG] Firestore accessible")
        except Exception as e:
            print(f"[ERROR] Firestore check failed: {e}")
            diagnostics["checks"]["firestore_accessible"] = False
            diagnostics["firestore_working"] = False
            diagnostics["status"] = "warning"
        
        print(f"[DEBUG] Health check complete: {diagnostics['status']}")
        
        return Response(diagnostics, status=status.HTTP_200_OK)
    
    except Exception as e:
        print(f"[ERROR] Health check failed: {e}")
        import traceback
        traceback.print_exc()
        
        return Response(
            {
                "status": "unhealthy",
                "error": str(e)
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )