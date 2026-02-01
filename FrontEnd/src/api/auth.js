/**
 * Authentication API service
 * 
 * This module handles all authentication-related API calls to the backend.
 * All Firebase operations are handled server-side via the backend API.
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

/**
 * Sign up a new user
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {string} name - User display name
 * @returns {Promise<Object>} User data and response
 */
export const signup = async (email, password, name) => {
  const response = await fetch(`${API_URL}/auth/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      password,
      name: name.trim(),
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Signup failed');
  }

  return response.json();
};

/**
 * Login user with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<Object>} User data and response
 */
export const login = async (email, password) => {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      password,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Login failed');
  }

  return response.json();
};

/**
 * Login user with Google authentication
 * @param {string} googleToken - Google ID token from Google Sign-In
 * @returns {Promise<Object>} User data and response
 */
export const loginWithGoogle = async (googleToken) => {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      google_token: googleToken,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Google login failed');
  }

  return response.json();
};

/**
 * Send OTP to email (SMTP). Use before signup, login, or password reset.
 * @param {string} email - User email
 * @param {string} purpose - One of: signup, login, password_reset, email_verify
 * @returns {Promise<Object>} { message }
 */
export const sendOtp = async (email, purpose = 'email_verify') => {
  const response = await fetch(`${API_URL}/auth/otp/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      purpose: purpose.trim().toLowerCase(),
    }),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to send OTP');
  }
  return response.json();
};

/**
 * Verify OTP for email (single-use).
 * @param {string} email - User email
 * @param {string} otp - 6-digit code from email
 * @param {string} purpose - Same purpose used in sendOtp
 * @returns {Promise<Object>} { message }
 */
export const verifyOtp = async (email, otp, purpose = 'email_verify') => {
  const response = await fetch(`${API_URL}/auth/otp/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      otp: String(otp).trim(),
      purpose: purpose.trim().toLowerCase(),
    }),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Invalid or expired code');
  }
  return response.json();
};

/**
 * Request password reset for email
 * @param {string} email - User email
 * @returns {Promise<Object>} Response message
 */
export const requestPasswordReset = async (email) => {
  const response = await fetch(`${API_URL}/auth/password-reset`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Password reset request failed');
  }

  return response.json();
};

/**
 * Search for a user by email
 * @param {string} token - Firebase ID token for authentication
 * @param {string} email - Email to search for
 * @returns {Promise<Object>} User data if found
 */
export const searchUserByEmail = async (token, email) => {
  const response = await fetch(`${API_URL}/users/search?email=${encodeURIComponent(email)}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'User search failed');
  }

  return response.json();
};

/**
 * Get current user profile
 * @param {string} token - Firebase ID token for authentication
 * @returns {Promise<Object>} Current user data
 */
export const getCurrentUser = async (token) => {
  const response = await fetch(`${API_URL}/users/me`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch user profile');
  }

  return response.json();
};
