"""
Role-based permissions for From Pixels to Play.

This module defines DRF permission classes that enforce role-based access control
for different user types: CHILD, PARENT, ADMIN, and UNASSIGNED.
"""

from rest_framework import permissions
from utils.firestore import FirestoreService
from utils.constants import (
    ROLE_CHILD,
    ROLE_PARENT,
    ROLE_ADMIN,
    ROLE_UNASSIGNED,
)


class IsAuthenticatedFirebase(permissions.BasePermission):
    """
    Permission class that requires Firebase authentication.
    
    Checks that request.firebase_user exists (set by middleware).
    """
    
    def has_permission(self, request, view):
        return request.firebase_user is not None


class IsChild(permissions.BasePermission):
    """
    Permission class that requires user to have CHILD role.
    """
    
    def has_permission(self, request, view):
        if not request.firebase_user:
            return False
        
        user = FirestoreService.get_user(request.firebase_user['uid'])
        return user and user.get('role') == ROLE_CHILD


class IsParent(permissions.BasePermission):
    """
    Permission class that requires user to have PARENT role.
    """
    
    def has_permission(self, request, view):
        if not request.firebase_user:
            return False
        
        user = FirestoreService.get_user(request.firebase_user['uid'])
        return user and user.get('role') == ROLE_PARENT


class IsAdmin(permissions.BasePermission):
    """
    Permission class that requires user to have ADMIN role.
    """
    
    def has_permission(self, request, view):
        if not request.firebase_user:
            return False
        
        user = FirestoreService.get_user(request.firebase_user['uid'])
        return user and user.get('role') == ROLE_ADMIN


class IsParentOrAdmin(permissions.BasePermission):
    """
    Permission class that requires user to have PARENT or ADMIN role.
    """
    
    def has_permission(self, request, view):
        if not request.firebase_user:
            return False
        
        user = FirestoreService.get_user(request.firebase_user['uid'])
        if not user:
            return False
        
        role = user.get('role')
        return role in [ROLE_PARENT, ROLE_ADMIN]


class IsChildOrParentOrAdmin(permissions.BasePermission):
    """
    Permission class that allows CHILD, PARENT, or ADMIN roles.
    """
    
    def has_permission(self, request, view):
        if not request.firebase_user:
            return False
        
        user = FirestoreService.get_user(request.firebase_user['uid'])
        if not user:
            return False
        
        role = user.get('role')
        return role in [ROLE_CHILD, ROLE_PARENT, ROLE_ADMIN]


class IsAssignedRole(permissions.BasePermission):
    """
    Permission class that requires user to have an assigned role (not UNASSIGNED).
    """
    
    def has_permission(self, request, view):
        if not request.firebase_user:
            return False
        
        user = FirestoreService.get_user(request.firebase_user['uid'])
        if not user:
            return False
        
        role = user.get('role')
        return role != ROLE_UNASSIGNED
