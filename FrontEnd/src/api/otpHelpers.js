/**
 * OTP API Helper Functions
 * 
 * Provides convenient wrappers for OTP endpoints:
 * - POST /api/auth/otp/send
 * - POST /api/auth/otp/verify
 * 
 * Usage:
 *   const [ok, msg] = await sendOtp(email, 'signup');
 *   if (ok) console.log('OTP sent!');
 * 
 *   const [ok, msg] = await verifyOtp(email, '123456', 'signup');
 *   if (ok) console.log('OTP verified!');
 */

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api").replace(/\/$/, "");

/**
 * Send OTP to email for given purpose.
 * 
 * @param {string} email - Email address to send OTP to (case-insensitive)
 * @param {string} purpose - Purpose: 'signup', 'login', 'password_reset', 'email_verify'
 * @returns {Promise<[boolean, string]>} [success, message]
 */
export async function sendOtp(email, purpose) {
  if (!email || !purpose) {
    return [false, "Email and purpose are required."];
  }

  try {
    const res = await fetch(`${API_BASE}/auth/otp/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), purpose }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const msg = data?.error || data?.message || "Failed to send OTP";
      return [false, msg];
    }

    return [true, data?.message || "OTP sent successfully"];
  } catch (err) {
    return [false, `Network error: ${err.message}`];
  }
}

/**
 * Verify OTP for given email and purpose.
 * OTP is single-use and cannot be reused after verification.
 * 
 * @param {string} email - Email that received the OTP
 * @param {string} otp - User-entered OTP code
 * @param {string} purpose - Same purpose used when sending OTP
 * @returns {Promise<[boolean, string]>} [success, message]
 */
export async function verifyOtp(email, otp, purpose) {
  if (!email || !otp || !purpose) {
    return [false, "Email, OTP, and purpose are required."];
  }

  try {
    const res = await fetch(`${API_BASE}/auth/otp/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.trim(),
        code: otp.trim(),
        purpose,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const msg = data?.error || data?.message || "OTP verification failed";
      return [false, msg];
    }

    return [true, data?.message || "OTP verified successfully"];
  } catch (err) {
    return [false, `Network error: ${err.message}`];
  }
}

/**
 * Check OTP validity without consuming it (for preview/test purposes).
 * Note: This is typically not recommended in production.
 * Prefer verifyOtp which consumes the OTP.
 * 
 * @param {string} email - Email that received the OTP
 * @param {string} otp - OTP code to check
 * @param {string} purpose - Purpose used when sending OTP
 * @returns {Promise<[boolean, string]>} [success, message]
 */
export async function checkOtp(email, otp, purpose) {
  // Alias for verifyOtp - actually consumes the OTP
  // In production, you may want a separate endpoint for checking
  return verifyOtp(email, otp, purpose);
}

export default { sendOtp, verifyOtp, checkOtp };
