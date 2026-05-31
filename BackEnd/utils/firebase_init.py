"""
Centralized Firebase Admin SDK initialization.

This module ensures Firebase is initialized exactly once, safely,
before any Firestore operations are attempted.

Handles service account credentials with special attention to:
- Private key formatting (escaped newlines vs actual newlines)
- Project ID validation
- Credential verification
"""

import json
import os
from pathlib import Path

import firebase_admin
from firebase_admin import credentials, auth as firebase_auth
from django.conf import settings


_initialized = False
_initialization_error = None


def _load_service_account_json(path_or_dict):
    """
    Load and validate service account JSON.
    
    Handles:
    - File paths (loads from disk)
    - JSON strings (parses directly)
    - Dict objects (validates structure)
    - Private key formatting (fixes escaped newlines)
    
    Args:
        path_or_dict: Path string, JSON string, or dict
        
    Returns:
        Dict with valid service account credentials
        
    Raises:
        ValueError: If credentials are invalid or missing required fields
        FileNotFoundError: If file path doesn't exist
    """
    # Handle file path
    if isinstance(path_or_dict, (str, Path)):
        path = Path(path_or_dict)
        
        if not path.exists():
            raise FileNotFoundError(f"Service account file not found: {path}")
        
        print(f"[DEBUG] Loading service account from file: {path}")
        with open(path, 'r') as f:
            service_account = json.load(f)
    
    # Handle JSON string
    elif isinstance(path_or_dict, str):
        print(f"[DEBUG] Parsing service account JSON string")
        service_account = json.loads(path_or_dict)
    
    # Handle dict
    elif isinstance(path_or_dict, dict):
        service_account = path_or_dict
    else:
        raise ValueError(f"Service account must be path, JSON string, or dict, got {type(path_or_dict)}")
    
    # Validate required fields
    required_fields = ['type', 'project_id', 'private_key', 'client_email']
    missing = [f for f in required_fields if f not in service_account]
    if missing:
        raise ValueError(f"Service account missing required fields: {missing}")
    
    # Fix private key formatting
    # Firebase Admin SDK expects actual newlines, not escaped strings
    private_key = service_account.get('private_key', '')
    if private_key:
        # Replace escaped newlines with actual newlines
        if '\\n' in private_key:
            print(f"[DEBUG] Fixing escaped newlines in private_key")
            service_account['private_key'] = private_key.replace('\\n', '\n')
        
        # Validate that key starts and ends correctly
        if not private_key.startswith('-----BEGIN'):
            raise ValueError("Private key appears to be malformed (doesn't start with -----BEGIN)")
        if not private_key.rstrip().endswith('-----'):
            raise ValueError("Private key appears to be malformed (doesn't end with -----)")
    
    print(f"[DEBUG] Service account loaded: project_id={service_account.get('project_id')}, type={service_account.get('type')}")
    
    return service_account


def _load_service_account_from_env():
    """
    Load service account credentials from environment variables.
    
    Expected environment variables:
    - FIREBASE_TYPE
    - FIREBASE_PROJECT_ID
    - FIREBASE_PRIVATE_KEY_ID
    - FIREBASE_PRIVATE_KEY
    - FIREBASE_CLIENT_EMAIL
    - FIREBASE_CLIENT_ID
    - FIREBASE_AUTH_URI
    - FIREBASE_TOKEN_URI
    - FIREBASE_AUTH_PROVIDER_X509_CERT_URL
    - FIREBASE_CLIENT_X509_CERT_URL
    - FIREBASE_UNIVERSE_DOMAIN
    
    Returns:
        Dict with service account credentials if all required vars present, None otherwise
    """
    required_vars = [
        'FIREBASE_TYPE',
        'FIREBASE_PROJECT_ID',
        'FIREBASE_PRIVATE_KEY_ID',
        'FIREBASE_PRIVATE_KEY',
        'FIREBASE_CLIENT_EMAIL',
        'FIREBASE_CLIENT_ID',
        'FIREBASE_AUTH_URI',
        'FIREBASE_TOKEN_URI',
    ]
    
    # Check if all required environment variables are present
    missing_vars = [var for var in required_vars if not os.environ.get(var)]
    
    if missing_vars:
        return None
    
    print(f"[DEBUG] Building Firebase credentials from environment variables")
    
    private_key = os.environ.get('FIREBASE_PRIVATE_KEY', '')
    # Handle escaped newlines in environment variables
    if '\\n' in private_key:
        print(f"[DEBUG] Fixing escaped newlines in FIREBASE_PRIVATE_KEY from environment")
        private_key = private_key.replace('\\n', '\n')
    
    service_account_dict = {
        'type': os.environ.get('FIREBASE_TYPE'),
        'project_id': os.environ.get('FIREBASE_PROJECT_ID'),
        'private_key_id': os.environ.get('FIREBASE_PRIVATE_KEY_ID'),
        'private_key': private_key,
        'client_email': os.environ.get('FIREBASE_CLIENT_EMAIL'),
        'client_id': os.environ.get('FIREBASE_CLIENT_ID'),
        'auth_uri': os.environ.get('FIREBASE_AUTH_URI'),
        'token_uri': os.environ.get('FIREBASE_TOKEN_URI'),
        'auth_provider_x509_cert_url': os.environ.get('FIREBASE_AUTH_PROVIDER_X509_CERT_URL'),
        'client_x509_cert_url': os.environ.get('FIREBASE_CLIENT_X509_CERT_URL'),
        'universe_domain': os.environ.get('FIREBASE_UNIVERSE_DOMAIN', 'googleapis.com'),
    }
    
    return service_account_dict


def initialize_firebase():
    """
    Initialize Firebase Admin SDK if not already initialized.
    
    This function is safe to call multiple times - it will only
    initialize once and cache the result.
    
    Raises:
        Exception: If Firebase initialization fails for any reason
    """
    global _initialized, _initialization_error
    
    print("[DEBUG] initialize_firebase() called")
    
    # Check if already initialized
    if firebase_admin._apps:
        print("[DEBUG] Firebase already initialized from previous call")
        _initialized = True
        return
    
    # Check if we already tried and failed
    if _initialization_error:
        print(f"[ERROR] Firebase initialization previously failed: {_initialization_error}")
        raise _initialization_error
    
    try:
        # Try to load from environment variables first (preferred)
        service_account_dict = _load_service_account_from_env()
        
        # Fall back to file-based loading if env vars not available
        if not service_account_dict:
            print(f"[DEBUG] Environment variables not found, falling back to file-based loading")
            service_account = settings.FIREBASE_SERVICE_ACCOUNT
            env_override = os.environ.get("FIREBASE_SERVICE_ACCOUNT") or os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
            
            if env_override:
                print(f"[DEBUG] Using FIREBASE_SERVICE_ACCOUNT from environment")
                service_account = env_override
            
            # Load and validate service account
            service_account_dict = _load_service_account_json(service_account)
        
        # Initialize Firebase Admin SDK
        print(f"[DEBUG] Initializing Firebase Admin SDK with project: {service_account_dict.get('project_id')}")
        cred = credentials.Certificate(service_account_dict)
        firebase_admin.initialize_app(cred)
        
        # Verify initialization by making a test call
        print(f"[DEBUG] Verifying Firebase Admin SDK with test auth call...")
        try:
            # This will fail gracefully if there's a permission issue but shows SDK works
            firebase_auth.list_users(max_results=1)
        except Exception as verify_error:
            # Log but don't fail - the verify call might have permission restrictions
            print(f"[DEBUG] Verification call note (may be normal): {verify_error}")
        
        print(f"[DEBUG] Firebase Admin SDK initialized successfully")
        _initialized = True
        return True
        
    except Exception as e:
        print(f"[ERROR] Failed to initialize Firebase: {e}")
        import traceback
        traceback.print_exc()
        _initialization_error = e
        raise


def ensure_initialized():
    """
    Ensure Firebase is initialized before any operations.
    
    Call this before attempting to:
    - Create/verify Firebase Auth users
    - Access Firestore
    - Use any Firebase Admin SDK features
    
    Raises:
        Exception: If Firebase initialization fails
    """
    print("[DEBUG] ensure_initialized() called")
    
    if not _initialized and not firebase_admin._apps:
        print("[DEBUG] Firebase not yet initialized, calling initialize_firebase()")
        initialize_firebase()
    else:
        print("[DEBUG] Firebase already initialized, skipping")

