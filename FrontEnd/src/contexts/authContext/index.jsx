import React, { useContext, useState, useEffect } from "react";
import { auth } from "../../FireBase/firebase";
import { GoogleAuthProvider } from "firebase/auth";
import { onAuthStateChanged } from "firebase/auth";

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api").replace(/\/$/, ""); // Use Django API directly.

async function safeJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

const AuthContext = React.createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userLoggedIn, setUserLoggedIn] = useState(false);
  const [isEmailUser, setIsEmailUser] = useState(false);
  const [isGoogleUser, setIsGoogleUser] = useState(false);
  const [userProfile, setUserProfile] = useState(null); // Django user profile
  const [authLoading, setAuthLoading] = useState(true); // Firebase auth state resolution
  const [profileLoading, setProfileLoading] = useState(false); // Django sync in background

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, initializeUser);
    return unsubscribe;
  }, []);

  async function initializeUser(user) {
    if (user) {
      setCurrentUser({ ...user });

      // check if provider is email and password login
      const isEmail = user.providerData.some(
        (provider) => provider.providerId === "password"
      );
      setIsEmailUser(isEmail);

      // check if the auth provider is google or not
      const isGoogle = user.providerData.some(
        (provider) => provider.providerId === GoogleAuthProvider.PROVIDER_ID
      );
      setIsGoogleUser(isGoogle);

      setUserLoggedIn(true);
    } else {
      setCurrentUser(null);
      setUserLoggedIn(false);
      setUserProfile(null);
    }

    // Never block initial render on backend sync; render immediately after Firebase state resolves.
    setAuthLoading(false);

    // Sync with Django in the background (best-effort).
    if (user) {
      setProfileLoading(true);
      try {
        const token = await user.getIdToken();
        const response = await fetch(`${API_BASE}/auth/login`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` }, // Send Firebase ID token to Django.
        });
        const data = await safeJson(response);
        if (!response.ok) {
          throw new Error(data?.error || "Login failed");
        }
        setUserProfile(data?.user || null);
      } catch (error) {
        console.error("Failed to sync user with Django backend:", error);
        // Continue even if Django sync fails - user is still authenticated with Firebase
      } finally {
        setProfileLoading(false);
      }
    }
  }

  const value = {
    userLoggedIn,
    isEmailUser,
    isGoogleUser,
    currentUser,
    setCurrentUser,
    userProfile, // Django user profile (role, etc.)
    setUserProfile,
    authLoading,
    profileLoading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}