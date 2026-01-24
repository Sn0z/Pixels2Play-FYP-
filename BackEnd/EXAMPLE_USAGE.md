# Example API Usage

This document provides practical examples of how to use the From Pixels to Play API.

## Prerequisites

1. Firebase project configured with Authentication enabled
2. Firebase service account JSON file in `BackEnd/firebase-service-account.json`
3. Frontend obtains Firebase ID token after user authentication

## Authentication Flow Example

### Step 1: User Authenticates with Firebase (Frontend)

```javascript
// Frontend: User signs in with Google or Email/Password
import { getAuth, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

const auth = getAuth();
const provider = new GoogleAuthProvider();

signInWithPopup(auth, provider)
  .then((result) => {
    const user = result.user;
    const idToken = await user.getIdToken();
    
    // Send token to backend
    loginToBackend(idToken);
  });
```

### Step 2: Backend Login

```javascript
// Frontend: Call login endpoint
async function loginToBackend(idToken) {
  const response = await fetch('http://localhost:8000/api/auth/login', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
  });
  
  const data = await response.json();
  
  if (data.role === 'UNASSIGNED') {
    // User needs to link with parent/child
    showLinkingInterface();
  } else {
    // User has assigned role, proceed to dashboard
    redirectToDashboard(data.role);
  }
}
```

## Parent-Child Linking Flow

### Scenario: Parent Links with Child

```javascript
// Frontend: Parent initiates linking
async function linkParentChild(parentToken, parentId, childId) {
  const response = await fetch('http://localhost:8000/api/family/link', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${parentToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      parent_id: parentId,
      child_id: childId,
    }),
  });
  
  if (response.ok) {
    const data = await response.json();
    console.log('Linked successfully:', data);
    // Both users now have assigned roles
    // Parent: role = "PARENT"
    // Child: role = "CHILD"
  } else {
    const error = await response.json();
    console.error('Linking failed:', error.error);
  }
}
```

## Complete Flow Example

### 1. Parent Signs Up and Logs In

```python
# Python example using requests
import requests

# Step 1: Parent authenticates with Firebase (frontend does this)
# Frontend gets Firebase ID token: parent_token

# Step 2: Parent logs in to backend
parent_token = "firebase_id_token_from_frontend"

login_response = requests.post(
    'http://localhost:8000/api/auth/login',
    headers={'Authorization': f'Bearer {parent_token}'}
)

login_data = login_response.json()
print(f"Parent logged in: {login_data['user']['email']}")
print(f"Role: {login_data['role']}")  # Should be "UNASSIGNED"

parent_id = login_data['user']['id']
```

### 2. Child Signs Up and Logs In

```python
# Child authenticates with Firebase (frontend)
child_token = "child_firebase_id_token"

child_login_response = requests.post(
    'http://localhost:8000/api/auth/login',
    headers={'Authorization': f'Bearer {child_token}'}
)

child_data = child_login_response.json()
child_id = child_data['user']['id']
```

### 3. Link Parent and Child

```python
# Parent initiates linking (using parent's token)
link_response = requests.post(
    'http://localhost:8000/api/family/link',
    headers={
        'Authorization': f'Bearer {parent_token}',
        'Content-Type': 'application/json'
    },
    json={
        'parent_id': parent_id,
        'child_id': child_id
    }
)

link_result = link_response.json()
print(f"Status: {link_result['status']}")
print(f"Parent role: {link_result['parent_role']}")  # "PARENT"
print(f"Child role: {link_result['child_role']}")    # "CHILD"
```

### 4. Verify Roles

```python
# Check parent's role
parent_profile = requests.get(
    'http://localhost:8000/api/users/me',
    headers={'Authorization': f'Bearer {parent_token}'}
)
print(f"Parent role: {parent_profile.json()['role']}")  # "PARENT"

# Check child's role
child_profile = requests.get(
    'http://localhost:8000/api/users/me',
    headers={'Authorization': f'Bearer {child_token}'}
)
print(f"Child role: {child_profile.json()['role']}")  # "CHILD"
```

### 5. Get Family Links

```python
# Parent gets their family links
links_response = requests.get(
    'http://localhost:8000/api/family/links',
    headers={'Authorization': f'Bearer {parent_token}'}
)

links = links_response.json()
print(f"Parent has {len(links)} child(ren)")
for link in links:
    print(f"  - Child ID: {link['child_id']}")
```

## Error Handling Examples

### Invalid Token

```python
response = requests.get(
    'http://localhost:8000/api/users/me',
    headers={'Authorization': 'Bearer invalid_token'}
)

if response.status_code == 401:
    print("Authentication failed: Invalid token")
```

### User Not Found

```python
response = requests.post(
    'http://localhost:8000/api/family/link',
    headers={'Authorization': f'Bearer {token}'},
    json={
        'parent_id': 'nonexistent_uid',
        'child_id': 'child_uid'
    }
)

if response.status_code == 400:
    error = response.json()
    print(f"Error: {error['error']}")  # "Parent user nonexistent_uid not found"
```

### Link Already Exists

```python
# Try to link same parent-child again
response = requests.post(
    'http://localhost:8000/api/family/link',
    headers={'Authorization': f'Bearer {token}'},
    json={
        'parent_id': parent_id,
        'child_id': child_id
    }
)

if response.status_code == 400:
    error = response.json()
    print(f"Error: {error['error']}")  # "Family link already exists"
```

## Using with React Frontend

### Custom Hook for API Calls

```javascript
// hooks/useApi.js
import { useState } from 'react';
import { getAuth } from 'firebase/auth';

export function useApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const auth = getAuth();
  
  const apiCall = async (endpoint, options = {}) => {
    setLoading(true);
    setError(null);
    
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      const token = await user.getIdToken();
      
      const response = await fetch(`http://localhost:8000/api${endpoint}`, {
        ...options,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'API request failed');
      }
      
      const data = await response.json();
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  return { apiCall, loading, error };
}
```

### Using the Hook

```javascript
// components/LinkParentChild.jsx
import { useApi } from '../hooks/useApi';

function LinkParentChild({ parentId, childId }) {
  const { apiCall, loading, error } = useApi();
  
  const handleLink = async () => {
    try {
      const result = await apiCall('/family/link', {
        method: 'POST',
        body: JSON.stringify({
          parent_id: parentId,
          child_id: childId,
        }),
      });
      
      console.log('Linked successfully:', result);
      alert('Parent and child linked successfully!');
    } catch (err) {
      console.error('Linking failed:', err);
    }
  };
  
  return (
    <button onClick={handleLink} disabled={loading}>
      {loading ? 'Linking...' : 'Link Parent and Child'}
    </button>
  );
}
```

## Testing with cURL

### Login

```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  -H "Content-Type: application/json"
```

### Get Profile

```bash
curl -X GET http://localhost:8000/api/users/me \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN"
```

### Link Parent-Child

```bash
curl -X POST http://localhost:8000/api/family/link \
  -H "Authorization: Bearer PARENT_FIREBASE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "parent_id": "parent_uid_123",
    "child_id": "child_uid_456"
  }'
```

### Get Family Links

```bash
curl -X GET http://localhost:8000/api/family/links \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN"
```
