"""
Constants for the From Pixels to Play platform.

This module defines all role types, auth providers, and other constants
used throughout the application.
"""

# User Roles
ROLE_UNASSIGNED = "UNASSIGNED"
ROLE_CHILD = "CHILD"
ROLE_PARENT = "PARENT"
ROLE_ADMIN = "ADMIN"

# Valid roles list
VALID_ROLES = [
    ROLE_UNASSIGNED,
    ROLE_CHILD,
    ROLE_PARENT,
    ROLE_ADMIN,
]

# Authentication Providers
AUTH_PROVIDER_GOOGLE = "google"
AUTH_PROVIDER_EMAIL = "email"

# Valid auth providers
VALID_AUTH_PROVIDERS = [
    AUTH_PROVIDER_GOOGLE,
    AUTH_PROVIDER_EMAIL,
]

# Firestore Collections
FIRESTORE_COLLECTION_USERS = "users"
FIRESTORE_COLLECTION_FAMILY_LINKS = "family_links"
FIRESTORE_COLLECTION_GAMES_PROGRESS = "games_progress"
FIRESTORE_COLLECTION_PROGRESS = "progress"
FIRESTORE_COLLECTION_PAYMENTS = "payments"
FIRESTORE_COLLECTION_PURCHASED_COURSES = "purchased_courses"
FIRESTORE_COLLECTION_ATTENTION_SUMMARY = "attention_summary"
FIRESTORE_COLLECTION_EVALUATION = "evaluation"

# Family Link Status
FAMILY_LINK_APPROVED = True
FAMILY_LINK_PENDING = False
