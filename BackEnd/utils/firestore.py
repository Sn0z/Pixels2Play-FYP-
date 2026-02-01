"""
Firestore service abstraction for From Pixels to Play.

This module provides a clean interface for interacting with Firebase Firestore,
abstracting away the Firebase SDK details and providing type-safe operations
for users and family links.
"""

from datetime import datetime
from typing import Optional, Dict, Any, List
from firebase_admin import firestore
from google.cloud.firestore_v1.base_batch import BaseBatch
from django.conf import settings
from .firebase_init import ensure_initialized
from .constants import (
    ROLE_UNASSIGNED,
    ROLE_PARENT,
    ROLE_CHILD,
    AUTH_PROVIDER_GOOGLE,
    AUTH_PROVIDER_EMAIL,
    FIRESTORE_COLLECTION_USERS,
    FIRESTORE_COLLECTION_FAMILY_LINKS,
    FAMILY_LINK_APPROVED,
)
import threading


# Lazy-loaded Firestore client - initialized on first use
_db = None


def get_db():
    """
    Get Firestore client, initializing Firebase if needed.
    This ensures Firebase is initialized before creating the client.
    """
    global _db
    if _db is None:
        print("[DEBUG] Firestore client not initialized, initializing Firebase...")
        ensure_initialized()
        try:
            _db = firestore.client()
            print("[DEBUG] Firestore client successfully initialized")
        except Exception as e:
            print(f"[ERROR] Failed to initialize Firestore client: {e}")
            import traceback
            traceback.print_exc()
            raise
    else:
        print("[DEBUG] Using cached Firestore client")
    return _db


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
        Retrieve a user document from Firestore by UID.
        
        Args:
            user_id: Firebase Auth UID
            
        Returns:
            User document as dict, or None if not found
        """
        try:
            db = get_db()
            # Find user by uid field stored in document
            users_ref = db.collection(FIRESTORE_COLLECTION_USERS)
            query = users_ref.where('uid', '==', user_id).limit(1)
            docs = query.stream()
            
            for doc in docs:
                user_data = doc.to_dict()
                user_data['id'] = doc.id
                # Ensure all expected fields exist
                user_data.setdefault('role', ROLE_UNASSIGNED)
                user_data.setdefault('auth_provider', AUTH_PROVIDER_EMAIL)
                user_data.setdefault('photo_url', '')
                user_data.setdefault('username', user_data.get('name', ''))
                print(f"Retrieved user by UID from Firestore: {user_id} - {user_data}")
                return user_data
            
            print(f"User not found by UID in Firestore: {user_id}")
            return None
        except Exception as e:
            print(f"Error getting user {user_id}: {e}")
            return None

    @staticmethod
    def create_user(
        user_id: str,
        email: str,
        name: str,
        auth_provider: str = AUTH_PROVIDER_EMAIL,
        picture: str = ""
    ) -> Dict[str, Any]:
        """
        Create a new user document in Firestore.
        
        Users are created with role = "UNASSIGNED" by default.
        Document ID is the email address (normalized to lowercase).
        
        Args:
            user_id: Firebase Auth UID
            email: User email address (used as document ID)
            name: User display name
            auth_provider: Authentication provider (google or email)
            picture: User profile picture URL
            
        Returns:
            Created user document as dict
        """
        # Normalize email to lowercase for consistent document IDs
        email_normalized = email.lower().strip()
        print(f"[DEBUG] FirestoreService.create_user called")
        print(f"  user_id: {user_id}")
        print(f"  email_normalized: {email_normalized}")
        print(f"  name: {name}")
        print(f"  auth_provider: {auth_provider}")
        print(f"  picture: {picture}")
        
        user_data = {
            'uid': user_id,  # Store UID in document for reference
            'email': email_normalized,
            'username': name,
            'name': name,
            'role': ROLE_UNASSIGNED,
            'auth_provider': auth_provider,
            'photo_url': picture or '',
            'created_at': firestore.SERVER_TIMESTAMP,
            'last_login': firestore.SERVER_TIMESTAMP,
        }
        
        try:
            print(f"[DEBUG] Getting Firestore database...")
            db = get_db()
            print(f"[DEBUG] Firestore database obtained")
            print(f"[DEBUG] Creating user data: {user_data}")
            
            # Use email as document ID instead of UID
            doc_ref = db.collection(FIRESTORE_COLLECTION_USERS).document(email_normalized)
            print(f"[DEBUG] Document reference created: {doc_ref.path}")
            
            # Set the document with merge=False to ensure it's created/overwritten
            print(f"[DEBUG] Calling doc_ref.set() with timeout...")
            
            set_result = [False]
            set_exception = [None]
            
            def set_doc():
                try:
                    print(f"[DEBUG] Inside thread: calling doc_ref.set()...")
                    doc_ref.set(user_data)
                    print(f"[DEBUG] Inside thread: doc_ref.set() completed successfully")
                    set_result[0] = True
                except Exception as e:
                    print(f"[ERROR] Inside thread: Exception in doc_ref.set(): {e}")
                    set_exception[0] = e
            
            thread = threading.Thread(target=set_doc, daemon=True)
            thread.start()
            thread.join(timeout=5.0)  # 5 second timeout
            
            if thread.is_alive():
                print(f"[ERROR] Firestore .set() call timed out after 5 seconds!")
                return user_data  # Return the data we tried to save
            
            if set_exception[0]:
                raise set_exception[0]
            
            if not set_result[0]:
                print(f"[ERROR] Document set operation failed!")
                return user_data
            
            print(f"[DEBUG] doc_ref.set() confirmed completed")
            
            # Now retrieve the document to get the actual server timestamps
            print(f"[DEBUG] Retrieving document after creation with timeout...")
            
            get_result = [None]
            get_exception = [None]
            
            def get_doc():
                try:
                    print(f"[DEBUG] Inside thread: calling doc_ref.get()...")
                    doc = doc_ref.get()
                    print(f"[DEBUG] Inside thread: doc_ref.get() completed, exists={doc.exists}")
                    get_result[0] = doc
                except Exception as e:
                    print(f"[ERROR] Inside thread: Exception in doc_ref.get(): {e}")
                    get_exception[0] = e
            
            thread2 = threading.Thread(target=get_doc, daemon=True)
            thread2.start()
            thread2.join(timeout=5.0)  # 5 second timeout
            
            if thread2.is_alive():
                print(f"[ERROR] Firestore .get() call timed out after 5 seconds during creation!")
                print(f"[WARNING] Document likely was created but we couldn't verify it")
                # Return the data anyway since the write likely succeeded
                user_data['id'] = email_normalized
                user_data['created_at'] = datetime.utcnow().isoformat()
                user_data['last_login'] = datetime.utcnow().isoformat()
                return user_data
            
            if get_exception[0]:
                raise get_exception[0]
            
            doc = get_result[0]
            
            if doc and doc.exists:
                print(f"[DEBUG] Document exists, calling to_dict()...")
                result = doc.to_dict()
                print(f"[DEBUG] to_dict() returned: {result}")
                result['id'] = doc.id
                print(f"[DEBUG] Successfully created user {email_normalized}: {result}")
                return result
            else:
                # Fallback if retrieval fails
                print(f"[DEBUG] Document not found after creation, using fallback timestamps")
                user_data['id'] = email_normalized
                user_data['created_at'] = datetime.utcnow().isoformat()
                user_data['last_login'] = datetime.utcnow().isoformat()
                print(f"[DEBUG] Returning user data with fallback timestamps: {user_data}")
                return user_data
                
        except Exception as e:
            print(f"[ERROR] Exception in create_user({user_id}): {e}")
            import traceback
            traceback.print_exc()
            raise

    @staticmethod
    def upsert_user(user_id: str, email: str, data: Dict[str, Any]) -> bool:
        """
        Create or update a user document in Firestore (merge semantics).
        
        Args:
            user_id: Firebase Auth UID
            email: User email (used to find document)
            data: Data to merge
            
        Returns:
            True if successful, False otherwise
        """
        try:
            db = get_db()
            email_normalized = email.lower().strip()
            doc_ref = db.collection(FIRESTORE_COLLECTION_USERS).document(email_normalized)
            # Use merge=True to update only the provided fields
            doc_ref.set(data, merge=True)
            print(f"Successfully upserted user {email_normalized} with data: {data}")
            return True
        except Exception as e:
            print(f"Error upserting user {user_id}: {e}")
            return False

    @staticmethod
    def update_user_role(user_id: str, email: str, role: str) -> bool:
        """
        Update a user's role in Firestore.
        
        Args:
            user_id: Firebase Auth UID
            email: User email (used to find document)
            role: New role (CHILD, PARENT, ADMIN)
            
        Returns:
            True if successful, False otherwise
        """
        try:
            db = get_db()
            email_normalized = email.lower().strip()
            doc_ref = db.collection(FIRESTORE_COLLECTION_USERS).document(email_normalized)
            is_parent = role == "PARENT"
            is_child = role == "CHILD"
            doc_ref.update(
                {
                    'role': role,
                    'isParent': is_parent,
                    'isChild': is_child,
                }
            )
            return True
        except Exception as e:
            print(f"Error updating user role {user_id}: {e}")
            return False
    
    @staticmethod
    def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve a user document from Firestore by email (document ID).
        
        Args:
            email: User email address (used as document ID)
            
        Returns:
            User document as dict, or None if not found
        """
        try:
            print(f"[DEBUG] FirestoreService.get_user_by_email called with: {email}")
            db = get_db()
            print(f"[DEBUG] Got Firestore database instance")
            
            email_normalized = email.lower().strip()
            print(f"[DEBUG] Normalized email: {email_normalized}")
            
            # Email IS the document ID now
            doc_ref = db.collection(FIRESTORE_COLLECTION_USERS).document(email_normalized)
            print(f"[DEBUG] Got document reference, calling .get() with timeout...")
            
            # Call get() with a timeout to prevent hanging
            result = [None]
            exception = [None]
            
            def get_doc():
                try:
                    print(f"[DEBUG] Inside thread: calling doc_ref.get()...")
                    doc = doc_ref.get()
                    print(f"[DEBUG] Inside thread: doc_ref.get() returned, exists={doc.exists}")
                    result[0] = doc
                except Exception as e:
                    print(f"[ERROR] Inside thread: Exception in doc_ref.get(): {e}")
                    exception[0] = e
            
            thread = threading.Thread(target=get_doc, daemon=True)
            thread.start()
            thread.join(timeout=5.0)  # 5 second timeout
            
            if thread.is_alive():
                print(f"[ERROR] Firestore .get() call timed out after 5 seconds!")
                print(f"[ERROR] This usually indicates network connectivity or Firestore client initialization issues")
                return None
            
            if exception[0]:
                raise exception[0]
            
            doc = result[0]
            if not doc:
                print(f"[ERROR] Document retrieval returned None!")
                return None
                
            print(f"[DEBUG] Document exists: {doc.exists}")
            
            if doc.exists:
                print(f"[DEBUG] Document exists, calling to_dict()...")
                user_data = doc.to_dict()
                print(f"[DEBUG] to_dict() returned: {user_data}")
                
                user_data['id'] = doc.id  # This will be the email
                # Ensure all expected fields exist
                user_data.setdefault('role', ROLE_UNASSIGNED)
                user_data.setdefault('auth_provider', AUTH_PROVIDER_EMAIL)
                user_data.setdefault('photo_url', '')
                user_data.setdefault('username', user_data.get('name', ''))
                print(f"[DEBUG] Retrieved user from Firestore: {email_normalized} - {user_data}")
                return user_data
            
            print(f"[DEBUG] User document not found in Firestore: {email_normalized}")
            return None
        except Exception as e:
            print(f"[ERROR] Exception in get_user_by_email({email}): {e}")
            import traceback
            traceback.print_exc()
            return None


    @staticmethod
    def update_user(user_id: str, email: str, updates: Dict[str, Any]) -> bool:
        """
        Update user document with provided fields.
        
        Args:
            user_id: Firebase Auth UID
            email: User email (used to find document)
            updates: Dictionary of fields to update
            
        Returns:
            True if successful, False otherwise
        """
        try:
            db = get_db()
            email_normalized = email.lower().strip()
            doc_ref = db.collection(FIRESTORE_COLLECTION_USERS).document(email_normalized)
            doc_ref.update(updates)
            return True
        except Exception as e:
            print(f"Error updating user {user_id}: {e}")
            return False

    @staticmethod
    def create_family_link(
        parent_id: str,
        parent_email: str,
        child_id: str,
        child_email: str,
        approved: bool = FAMILY_LINK_APPROVED
    ) -> Optional[Dict[str, Any]]:
        """
        Create a family link document in Firestore.
        
        Args:
            parent_id: Firebase Auth UID of parent
            parent_email: Email of parent
            child_id: Firebase Auth UID of child
            child_email: Email of child
            approved: Whether the link is approved (default: True)
            
        Returns:
            Created family link document as dict, or None on error
        """
        parent_email_normalized = parent_email.lower().strip()
        child_email_normalized = child_email.lower().strip()
        
        link_data = {
            'parent_id': parent_id,
            'parent_email': parent_email_normalized,
            'child_id': child_id,
            'child_email': child_email_normalized,
            'approved': approved,
            'created_at': firestore.SERVER_TIMESTAMP,
        }
        
        try:
            db = get_db()
            # Use emails as composite key for consistency
            link_id = f"{parent_email_normalized}_{child_email_normalized}"
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
            db = get_db()
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
            db = get_db()
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
    def link_exists(parent_id: str, parent_email: str, child_id: str, child_email: str) -> bool:
        """
        Check if a family link already exists.
        
        Args:
            parent_id: Firebase Auth UID of parent
            parent_email: Email of parent
            child_id: Firebase Auth UID of child
            child_email: Email of child
            
        Returns:
            True if link exists, False otherwise
        """
        try:
            db = get_db()
            parent_email_normalized = parent_email.lower().strip()
            child_email_normalized = child_email.lower().strip()
            link_id = f"{parent_email_normalized}_{child_email_normalized}"
            doc_ref = db.collection(FIRESTORE_COLLECTION_FAMILY_LINKS).document(link_id)
            doc = doc_ref.get()
            return doc.exists
        except Exception as e:
            print(f"Error checking link existence: {e}")
            return False

    @staticmethod
    def create_parent_child_link_transaction(
        parent_email: str,
        parent_uid: str,
        child_email: str,
        child_uid: str,
    ) -> Optional[Dict[str, Any]]:
        """
        Atomically link parent and child using a Firestore transaction.
        
        Uses Firestore transaction pattern to ensure atomic updates:
        1. Parent user: role = PARENT, linked_child_email, linked_at
        2. Child user: role = CHILD, parent_email, parent_uid, linked_at
        3. Family link: creates linking relationship
        
        All updates succeed or all fail (no partial states).
        
        Args:
            parent_email: Normalized parent email (document ID)
            parent_uid: Parent Firebase UID
            child_email: Normalized child email (document ID)
            child_uid: Child Firebase UID
            
        Returns:
            Transaction result dict or None on error
        """
        try:
            db = get_db()
            parent_email_normalized = parent_email.lower().strip()
            child_email_normalized = child_email.lower().strip()
            
            print(f"[TRANSACTION] Started: linking {parent_email_normalized} -> {child_email_normalized}")
            
            # Define transaction function (must be decorated and called with transaction)
            # Use "tx" for the transaction param to avoid any name shadowing with refs.
            @firestore.transactional
            def update_in_transaction(tx):
                """
                Transaction function that executes atomically.
                All operations succeed or all fail.
                """
                print(f"[TRANSACTION] Executing update function")
                
                # Get parent document (tx.get returns generator; take first snapshot)
                parent_ref = db.collection(FIRESTORE_COLLECTION_USERS).document(parent_email_normalized)
                parent_doc = next(tx.get(parent_ref))
                
                if not parent_doc.exists:
                    raise ValueError(f"Parent user {parent_email_normalized} not found in Firestore")
                
                parent_data = parent_doc.to_dict()
                if parent_data.get('uid') != parent_uid:
                    raise ValueError(f"Parent UID mismatch: expected {parent_uid}, got {parent_data.get('uid')}")
                
                print(f"[TRANSACTION] Parent verified: {parent_email_normalized}")
                
                # Get child document (tx.get returns generator; take first snapshot)
                child_ref = db.collection(FIRESTORE_COLLECTION_USERS).document(child_email_normalized)
                child_doc = next(tx.get(child_ref))
                
                if not child_doc.exists:
                    raise ValueError(f"Child user {child_email_normalized} not found in Firestore")
                
                child_data = child_doc.to_dict()
                if child_data.get('uid') != child_uid:
                    raise ValueError(f"Child UID mismatch: expected {child_uid}, got {child_data.get('uid')}")
                
                # Verify child role is UNASSIGNED
                if child_data.get('role') != ROLE_UNASSIGNED:
                    raise ValueError(f"Child role must be UNASSIGNED, got {child_data.get('role')}")
                
                print(f"[TRANSACTION] Child verified: {child_email_normalized}")
                
                # Writes: use BaseBatch.update/set so we always use batch API (Transaction extends WriteBatch)
                BaseBatch.update(tx, parent_ref, {
                    'role': ROLE_PARENT,
                    'isParent': True,
                    'isChild': False,
                    'linked_child_email': child_email_normalized,
                    'linked_at': firestore.SERVER_TIMESTAMP,
                })
                print(f"[TRANSACTION] Parent updated: role=PARENT")
                
                BaseBatch.update(tx, child_ref, {
                    'role': ROLE_CHILD,
                    'isChild': True,
                    'isParent': False,
                    'parent_email': parent_email_normalized,
                    'parent_uid': parent_uid,
                    'linked_at': firestore.SERVER_TIMESTAMP,
                })
                print(f"[TRANSACTION] Child updated: role=CHILD")
                
                link_id = f"{parent_email_normalized}_{child_email_normalized}"
                link_ref = db.collection(FIRESTORE_COLLECTION_FAMILY_LINKS).document(link_id)
                BaseBatch.set(tx, link_ref, {
                    'parent_id': parent_uid,
                    'parent_email': parent_email_normalized,
                    'child_id': child_uid,
                    'child_email': child_email_normalized,
                    'approved': FAMILY_LINK_APPROVED,
                    'created_at': firestore.SERVER_TIMESTAMP,
                }, merge=False)
                print(f"[TRANSACTION] Family link created: {link_id}")
                
                return {
                    'status': 'linked',
                    'parent_role': ROLE_PARENT,
                    'child_role': ROLE_CHILD,
                    'link_id': link_id,
                }
            
            # Execute transaction: pass transaction as first arg to the decorated function
            print(f"[TRANSACTION] Creating transaction")
            transaction = db.transaction()
            
            print(f"[TRANSACTION] Executing transaction")
            result = update_in_transaction(transaction)
            
            print(f"[TRANSACTION] Commit successful: {result.get('link_id')}")
            return result
            
        except ValueError as e:
            # Validation errors (bad state, not found, etc.)
            print(f"[TRANSACTION] Validation error: {str(e)}")
            return None
        except Exception as e:
            # Database or other errors
            print(f"[TRANSACTION] Error in create_parent_child_link_transaction: {str(e)}")
            import traceback
            traceback.print_exc()
            return None