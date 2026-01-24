"""
Centralized Firebase Admin SDK initialization.

This module ensures Firebase is initialized exactly once, safely,
before any Firestore operations are attempted.
"""

import json
import os
from pathlib import Path

import firebase_admin
from firebase_admin import credentials
from django.conf import settings


_initialized = False


def initialize_firebase():
    """
    Initialize Firebase Admin SDK if not already initialized.
    
    This function is safe to call multiple times - it will only
    initialize once. Uses credentials from settings.FIREBASE_SERVICE_ACCOUNT.
    """
    global _initialized
    
    # Check if Firebase is already initialized
    if firebase_admin._apps:
        _initialized = True
        return
    
    # Initialize Firebase with service account credentials.
    try:
        service_account = settings.FIREBASE_SERVICE_ACCOUNT  # Default path or dict from settings.
        env_override = os.environ.get("FIREBASE_SERVICE_ACCOUNT") or os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
        if env_override:
            service_account = env_override  # Allow env override for local/dev deployments.

        if isinstance(service_account, str) and service_account.strip().startswith("{"):
            service_account = json.loads(service_account)  # Allow JSON string credentials in env.

        if isinstance(service_account, (str, Path)) and not Path(service_account).exists():
            raise FileNotFoundError(f"Firebase service account file not found: {service_account}")  # Clear init error.

        cred = credentials.Certificate(service_account)
        firebase_admin.initialize_app(cred)
        _initialized = True
    except Exception as e:
        print(f"Error initializing Firebase: {e}")
        raise


def ensure_initialized():
    """
    Ensure Firebase is initialized. Call this before any Firestore operations.
    """
    if not _initialized and not firebase_admin._apps:
        initialize_firebase()
