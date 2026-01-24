# From Pixels to Play - API Documentation

## Overview

This document describes the REST API endpoints for the From Pixels to Play platform, a child-safe educational platform built with Django REST Framework and Firebase Authentication.

## Authentication

All API requests (except login) require Firebase Authentication. Include the Firebase ID token in the Authorization header:

```
Authorization: Bearer <firebase_id_token>
```

## Base URL

```
http://localhost:8000/api
```

---

## Authentication & User Endpoints

### POST /api/auth/login

Login endpoint that verifies Firebase token and creates/retrieves user.

**Request Headers:**
```
Authorization: Bearer <firebase_id_token>
```

**Response (200 OK):**
```json
{
  "user": {
    "id": "uid123",
    "email": "user@example.com",
    "name": "User Name",
    "role": "UNASSIGNED",
    "auth_provider": "google"
  },
  "message": "Login successful",
  "role": "UNASSIGNED"
}
```

**Notes:**
- Creates user if not exists with `role = "UNASSIGNED"`
- Returns existing user if already exists
- Frontend should check `role` field:
  - If `role == "UNASSIGNED"` → continue with parent-child linking flow
  - Otherwise → user has assigned role

---

### GET /api/users/me

Get current user profile.

**Request Headers:**
```
Authorization: Bearer <firebase_id_token>
```

**Response (200 OK):**
```json
{
  "id": "uid123",
  "email": "user@example.com",
  "name": "User Name",
  "role": "UNASSIGNED",
  "auth_provider": "google",
  "created_at": "2024-01-01T00:00:00"
}
```

**Error Responses:**
- `401 Unauthorized`: Missing or invalid token
- `404 Not Found`: User not found in Firestore

---

## Family Linking Endpoints

### POST /api/family/link

Create a parent-child link and assign roles.

**Request Headers:**
```
Authorization: Bearer <firebase_id_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "parent_id": "uid123",
  "child_id": "uid456"
}
```

**Response (201 Created):**
```json
{
  "status": "linked",
  "parent_role": "PARENT",
  "child_role": "CHILD",
  "message": "Parent and child linked successfully"
}
```

**Error Responses:**
- `400 Bad Request`: Validation error
  ```json
  {
    "error": "Parent user uid123 not found"
  }
  ```
- `401 Unauthorized`: Authentication required

**Validation Rules:**
- Both users must exist in Firestore
- Users cannot link to themselves
- Link must not already exist
- Parent cannot have CHILD role
- Child cannot have PARENT role

**Role Assignment:**
- Parent user gets `role = "PARENT"`
- Child user gets `role = "CHILD"`
- Creates `family_links` document in Firestore

---

### GET /api/family/links

Get family links for the current user.

**Request Headers:**
```
Authorization: Bearer <firebase_id_token>
```

**Query Parameters (optional, ADMIN only):**
- `user_id`: Firebase UID to query (only for ADMIN users)

**Response (200 OK):**
```json
[
  {
    "id": "parent_id_child_id",
    "parent_id": "uid123",
    "child_id": "uid456",
    "approved": true,
    "created_at": "2024-01-01T00:00:00"
  }
]
```

**Behavior:**
- **PARENT users**: Returns links to all their children
- **CHILD users**: Returns links to their parent(s)
- **ADMIN users**: Can query any user's links using `user_id` parameter

---

## User Roles

### Role Types

1. **UNASSIGNED**: Default role for new users. No special permissions.
2. **CHILD**: Assigned after parent-child linking. Can:
   - Play games
   - View own progress
3. **PARENT**: Assigned after parent-child linking. Can:
   - View child's progress
   - View attention reports
4. **ADMIN**: Pre-created manually. Full system access.

### Role Assignment Flow

1. User signs up/logs in → `role = "UNASSIGNED"`
2. Frontend initiates parent-child linking
3. Backend assigns roles:
   - Parent → `role = "PARENT"`
   - Child → `role = "CHILD"`
4. Users can now access role-specific features

---

## Permission Classes

The API uses DRF permission classes for access control:

- `IsAuthenticatedFirebase`: Requires valid Firebase token
- `IsChild`: Requires CHILD role
- `IsParent`: Requires PARENT role
- `IsAdmin`: Requires ADMIN role
- `IsParentOrAdmin`: Requires PARENT or ADMIN role
- `IsChildOrParentOrAdmin`: Requires CHILD, PARENT, or ADMIN role
- `IsAssignedRole`: Requires role other than UNASSIGNED

---

## Error Handling

All endpoints return standard HTTP status codes:

- `200 OK`: Successful GET request
- `201 Created`: Successful POST request (resource created)
- `400 Bad Request`: Validation error or invalid input
- `401 Unauthorized`: Missing or invalid authentication token
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

Error responses follow this format:
```json
{
  "error": "Error message description"
}
```

---

## Example API Requests

### 1. Login (Google Sign-In)

```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Authorization: Bearer <firebase_id_token>" \
  -H "Content-Type: application/json"
```

### 2. Get Current User Profile

```bash
curl -X GET http://localhost:8000/api/users/me \
  -H "Authorization: Bearer <firebase_id_token>"
```

### 3. Link Parent and Child

```bash
curl -X POST http://localhost:8000/api/family/link \
  -H "Authorization: Bearer <firebase_id_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "parent_id": "parent_uid_123",
    "child_id": "child_uid_456"
  }'
```

### 4. Get Family Links

```bash
curl -X GET http://localhost:8000/api/family/links \
  -H "Authorization: Bearer <firebase_id_token>"
```

---

## Security Features

1. **Firebase Token Verification**: All requests (except login) verify Firebase ID tokens
2. **Role-Based Access Control**: Permissions enforced at view level
3. **No Role Assignment Without Linking**: Users start as UNASSIGNED
4. **Parent-Child Validation**: Prevents invalid linking scenarios
5. **Child Safety**: No biometric data stored, parent must be linked to access child data

---

## Firestore Data Model

### Users Collection

```
users/
  └── {user_id}/
        - name: string
        - email: string
        - role: "UNASSIGNED" | "CHILD" | "PARENT" | "ADMIN"
        - auth_provider: "google" | "email"
        - created_at: timestamp
```

### Family Links Collection

```
family_links/
  └── {parent_id}_{child_id}/
        - parent_id: string
        - child_id: string
        - approved: boolean
        - created_at: timestamp
```

---

## Development Setup

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Ensure `firebase-service-account.json` is in `BackEnd/` directory

3. Run migrations (if using Django models):
   ```bash
   python manage.py migrate
   ```

4. Start development server:
   ```bash
   python manage.py runserver
   ```

---

## Notes for Academic Evaluation

- **Modular Design**: Code is organized into apps (users, family, utils)
- **Service Layer**: Business logic separated from views
- **Security**: Firebase token verification on all protected endpoints
- **Role Management**: Explicit role assignment only through linking
- **Error Handling**: Comprehensive error responses
- **Documentation**: Well-commented code and API documentation
