# From Pixels to Play - Backend

Django REST Framework backend for a child-safe educational platform with Firebase Authentication and Firestore.

## Architecture Overview

This backend is **API-only** and uses:
- **Django REST Framework** for API endpoints
- **Firebase Authentication** for user authentication
- **Firebase Firestore** as the database (no Django models for users)
- **Role-based access control** for security

## Project Structure

```
BackEnd/
├── backend/                 # Django project settings
│   ├── settings.py         # Django configuration
│   ├── urls.py             # Root URL configuration
│   └── middleware/
│       └── firebase_auth.py  # Firebase token verification middleware
│
├── utils/                   # Shared utilities
│   ├── constants.py        # Role and constant definitions
│   └── firestore.py        # Firestore service abstraction
│
├── users/                   # User management app
│   ├── views.py            # API endpoints (login, profile)
│   ├── serializers.py      # Request/response serializers
│   ├── services.py         # Business logic
│   ├── permissions.py      # Role-based permissions
│   └── urls.py             # User app URLs
│
├── family/                  # Parent-child linking app
│   ├── views.py            # Linking endpoints
│   ├── serializers.py     # Link request/response serializers
│   ├── services.py        # Linking business logic
│   └── urls.py            # Family app URLs
│
├── courses/                 # Course management (existing)
├── payments/                # Payment processing (existing)
│
├── firebase-service-account.json  # Firebase credentials
├── requirements.txt        # Python dependencies
├── API_DOCUMENTATION.md    # Complete API documentation
└── EXAMPLE_USAGE.md        # Usage examples
```

## Key Features

### 1. Authentication Flow

- Users authenticate with Firebase (Google Sign-In or Email/Password)
- Backend verifies Firebase ID tokens via middleware
- Users are created with `role = "UNASSIGNED"` initially
- Roles are assigned only after parent-child linking

### 2. Role Management

**Roles:**
- `UNASSIGNED`: Default for new users
- `CHILD`: Assigned after linking (can play games, view own progress)
- `PARENT`: Assigned after linking (can view child's progress, attention reports)
- `ADMIN`: Pre-created manually (full system access)

### 3. Parent-Child Linking

- Frontend initiates linking via `POST /api/family/link`
- Backend validates both users exist
- Backend assigns roles:
  - Parent → `role = "PARENT"`
  - Child → `role = "CHILD"`
- Creates `family_links` document in Firestore

### 4. Security

- Firebase token verification on all protected endpoints
- Role-based permissions enforced at view level
- No role assignment without explicit linking
- Parent must be linked to access child data

## Installation

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Configure Firebase:**
   - Place `firebase-service-account.json` in `BackEnd/` directory
   - Ensure Firebase Authentication is enabled in Firebase Console
   - Enable Firestore database

3. **Run migrations (if using Django models):**
   ```bash
   python manage.py migrate
   ```

4. **Start development server:**
   ```bash
   python manage.py runserver
   ```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login/register user
- `GET /api/users/me` - Get current user profile

### Family Linking
- `POST /api/family/link` - Link parent and child
- `GET /api/family/links` - Get family links for user

See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for complete documentation.

## Firestore Collections

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

## Middleware

### FirebaseAuthenticationMiddleware

Located in `backend/middleware/firebase_auth.py`, this middleware:
- Extracts Firebase ID token from `Authorization: Bearer <token>` header
- Verifies token with Firebase Admin SDK
- Attaches user info to `request.firebase_user`
- Handles token errors gracefully

**Usage in views:**
```python
@api_view(['GET'])
@permission_classes([IsAuthenticatedFirebase])
def my_view(request):
    firebase_user = request.firebase_user
    uid = firebase_user['uid']
    email = firebase_user['email']
    # ... use user info
```

## Permissions

Role-based permissions in `users/permissions.py`:

- `IsAuthenticatedFirebase`: Requires valid Firebase token
- `IsChild`: Requires CHILD role
- `IsParent`: Requires PARENT role
- `IsAdmin`: Requires ADMIN role
- `IsParentOrAdmin`: Requires PARENT or ADMIN
- `IsChildOrParentOrAdmin`: Requires CHILD, PARENT, or ADMIN
- `IsAssignedRole`: Requires role other than UNASSIGNED

**Usage:**
```python
from users.permissions import IsParent

@api_view(['GET'])
@permission_classes([IsParent])
def parent_only_view(request):
    # Only PARENT role can access
    pass
```

## Service Layer

Business logic is separated into service classes:

- `UserService` (`users/services.py`): User operations
- `FamilyService` (`family/services.py`): Linking operations
- `FirestoreService` (`utils/firestore.py`): Firestore operations

This separation allows:
- Easy testing
- Reusable logic
- Clear separation of concerns

## Development Notes

### Adding New Endpoints

1. Create view in appropriate app (`users/views.py` or `family/views.py`)
2. Add serializer if needed (`serializers.py`)
3. Add URL pattern (`urls.py`)
4. Apply appropriate permissions
5. Update API documentation

### Testing

```bash
# Run Django tests
python manage.py test

# Test specific app
python manage.py test users
python manage.py test family
```

### Environment Variables

For production, set:
- `DJANGO_SECRET_KEY`: Django secret key
- `EYE_TRACKER_SECRET`: Secret for eye tracker API
- `FIREBASE_SERVICE_ACCOUNT`: Path to service account JSON (or use file)

## Security Considerations

1. **Never commit `firebase-service-account.json`** to version control
2. **Use environment variables** for secrets in production
3. **Enable CORS** only for trusted origins
4. **Validate all inputs** in serializers
5. **Use HTTPS** in production
6. **Rate limiting** should be added for production

## Academic Evaluation Notes

This implementation demonstrates:

- **Modular Architecture**: Clear separation of concerns (views, services, serializers)
- **Security Best Practices**: Token verification, role-based access control
- **Clean Code**: Well-commented, type hints, error handling
- **RESTful Design**: Standard HTTP methods and status codes
- **Documentation**: Comprehensive API docs and examples

## Troubleshooting

### Firebase Initialization Error

If you see Firebase initialization errors:
1. Check that `firebase-service-account.json` exists
2. Verify the JSON file is valid
3. Ensure Firebase Admin SDK is installed: `pip install firebase-admin`

### Token Verification Fails

- Verify token is being sent in `Authorization: Bearer <token>` format
- Check token hasn't expired (Firebase tokens expire after 1 hour)
- Ensure Firebase project is correctly configured

### User Not Found Errors

- Users are created on first login via `POST /api/auth/login`
- Check Firestore console to verify user document exists
- Ensure Firestore rules allow read/write access

## License

This project is for academic/educational purposes.
