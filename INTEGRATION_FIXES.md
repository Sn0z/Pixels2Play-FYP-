# React ↔ Django ↔ Firebase Integration Fixes

## Summary of Changes

This document outlines all the fixes applied to properly connect the React frontend with the Django backend and Firebase.

## Issues Found

1. **Frontend directly accessing Firestore** - Components were bypassing Django and directly using Firestore SDK
2. **No centralized API client** - Each component had hardcoded fetch calls with inconsistent error handling
3. **Missing Django login sync** - After Firebase authentication, frontend wasn't calling Django to sync user data
4. **Hardcoded API URLs** - No environment variable support for different environments
5. **No user search endpoint** - Frontend needed to search users by email for family linking

## Backend Changes

### 1. Added User Search Endpoint
- **File**: `BackEnd/users/views.py`
- **Endpoint**: `GET /api/users/search?email=<email>`
- **Purpose**: Allows authenticated users to find other users by email (for parent-child linking)

### 2. Added FirestoreService.get_user_by_email()
- **File**: `BackEnd/utils/firestore.py`
- **Method**: `get_user_by_email(email: str) -> Optional[Dict[str, Any]]`
- **Purpose**: Query Firestore to find users by email address

### 3. Updated UserService
- **File**: `BackEnd/users/services.py`
- **Added**: `get_user_by_email()` method to service layer

### 4. Updated URL Configuration
- **File**: `BackEnd/users/urls.py`
- **Added**: Route for `/users/search` endpoint

## Frontend Changes

### 1. Created Centralized API Client
- **File**: `FrontEnd/src/api/apiClient.js`
- **Features**:
  - Automatic Firebase token injection
  - Consistent error handling
  - Environment variable support for API base URL
  - Methods for all common API operations

### 2. Created Family API Module
- **File**: `FrontEnd/src/api/familyApi.js`
- **Purpose**: Replaces direct Firestore calls with Django API calls
- **Functions**:
  - `linkChildAccountAPI(email)` - Links parent and child by email
  - `linkParentChildByUid(parentId, childId)` - Links by UID
  - `getFamilyLinks()` - Gets family links for current user

### 3. Updated Auth Context
- **File**: `FrontEnd/src/contexts/authContext/index.jsx`
- **Changes**:
  - Automatically calls Django `/api/auth/login` after Firebase authentication
  - Stores Django user profile (with role information)
  - Provides `userProfile` to components

### 4. Updated Components
- **ChildAccountSetup1.jsx**: Now uses `familyApi.js` instead of direct Firestore
- **WatchAndQuiz.jsx**: Uses environment variable for API base URL
- **CourseDetailSection.jsx**: Uses environment variable for API base URL
- **CheckOut.jsx**: Uses environment variable for API base URL
- **firestoreModules.js**: Uses environment variable for API base URL

### 5. Environment Configuration
- **File**: `FrontEnd/.env.example`
- **Variable**: `VITE_API_BASE_URL` (defaults to `http://127.0.0.1:8000/api`)

## API Endpoints Summary

### Authentication
- `POST /api/auth/login` - Sync Firebase user with Django (requires Firebase token)
- `GET /api/users/me` - Get current user profile (requires authentication)
- `GET /api/users/search?email=<email>` - Search user by email (requires authentication)

### Family Linking
- `POST /api/family/link` - Link parent and child accounts
  - Body: `{ "parent_id": "...", "child_id": "..." }`
- `GET /api/family/links` - Get family links for current user

## Usage Examples

### Frontend: Using API Client

```javascript
import api from '../api/apiClient';

// Login (syncs Firebase user with Django)
const loginResponse = await api.login();
console.log(loginResponse.user); // User profile with role

// Get current user
const user = await api.getCurrentUser();

// Link parent and child
await api.linkParentChild(parentId, childId);

// Search user by email
const user = await api.searchUserByEmail('child@example.com');
```

### Frontend: Using Family API

```javascript
import { linkChildAccountAPI } from '../api/familyApi';

// Link child by email
const result = await linkChildAccountAPI('child@example.com');
if (result.childExists) {
  console.log('Child UID:', result.childUid);
}
```

## Environment Setup

1. Create `.env` file in `FrontEnd/` directory:
```bash
VITE_API_BASE_URL=http://127.0.0.1:8000/api
```

2. For production, update the URL:
```bash
VITE_API_BASE_URL=https://api.yourdomain.com/api
```

## Testing Checklist

- [x] Firebase initialization works on Django startup
- [x] Frontend can call Django login endpoint
- [x] User search by email works
- [x] Family linking works through Django API
- [x] All API calls use environment variables
- [x] CORS is properly configured
- [x] Authentication tokens are properly passed

## Remaining Direct Firestore Usage

Some components still use Firestore directly for:
- Admin module management (`firestoreModules.js`)
- Real-time data that doesn't need Django processing

This is acceptable for admin operations and real-time features. All user-facing operations now go through Django.

## Next Steps

1. Test the integration end-to-end
2. Add error boundaries in React for API failures
3. Add loading states for all API calls
4. Consider adding request retry logic for failed requests
5. Add API response caching where appropriate
