/**
 * OTP UI Utilities
 * 
 * Provides UI-related helpers for OTP flows:
 * - Countdown timer with formatting
 * - Input validation and formatting
 * - State helpers
 */

/**
 * Format countdown time for display.
 * 
 * @param {number} seconds - Remaining seconds
 * @returns {string} Formatted string like "5:30" or "0:45"
 */
export function formatCountdown(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Check if countdown has expired.
 * 
 * @param {number} seconds - Remaining seconds
 * @returns {boolean} True if expired (seconds <= 0)
 */
export function isCountdownExpired(seconds) {
  return seconds <= 0;
}

/**
 * Validate OTP format (numeric, correct length).
 * 
 * @param {string} otp - OTP to validate
 * @param {number} length - Expected OTP length (default: 6)
 * @returns {boolean} True if valid
 */
export function isValidOtpFormat(otp, length = 6) {
  const cleaned = (otp || "").replace(/\D/g, "");
  return cleaned.length === length && /^\d+$/.test(cleaned);
}

/**
 * Mask email for display in OTP flow (show first char + @domain).
 * 
 * @param {string} email - Email to mask
 * @returns {string} Masked email like "u***@example.com"
 */
export function maskEmail(email) {
  if (!email) return "***@***.***";
  const [local, domain] = email.split("@");
  if (!local || !domain) return "***@***.***";
  
  const firstChar = local.charAt(0);
  const maskedLocal = firstChar + "*".repeat(Math.max(1, local.length - 1));
  return `${maskedLocal}@${domain}`;
}

/**
 * Generate example OTP for display purposes.
 * 
 * @param {number} length - OTP length (default: 6)
 * @returns {string} Example OTP like "123456"
 */
export function generateExampleOtp(length = 6) {
  return Array(length).fill(0).map(() => Math.floor(Math.random() * 10)).join("");
}

/**
 * Calculate resend cooldown in seconds.
 * 
 * @param {Date} lastSentTime - Last OTP send time
 * @param {number} cooldownSeconds - Cooldown duration (default: 30)
 * @returns {number} Seconds remaining before resend is allowed (0 if ready)
 */
export function getResendCooldown(lastSentTime, cooldownSeconds = 30) {
  if (!lastSentTime) return 0;
  const elapsedSeconds = (Date.now() - lastSentTime.getTime()) / 1000;
  return Math.max(0, Math.ceil(cooldownSeconds - elapsedSeconds));
}

/**
 * Check if resend is allowed.
 * 
 * @param {Date} lastSentTime - Last OTP send time
 * @param {number} cooldownSeconds - Cooldown duration
 * @returns {boolean} True if resend is allowed
 */
export function canResendOtp(lastSentTime, cooldownSeconds = 30) {
  return getResendCooldown(lastSentTime, cooldownSeconds) === 0;
}

/**
 * Convert countdown seconds to progress percentage (0-100).
 * Useful for progress bars.
 * 
 * @param {number} remainingSeconds - Remaining time
 * @param {number} totalSeconds - Total OTP validity (default: 600)
 * @returns {number} Progress percentage (0-100)
 */
export function getCountdownProgress(remainingSeconds, totalSeconds = 600) {
  return Math.max(0, Math.min(100, (remainingSeconds / totalSeconds) * 100));
}

/**
 * Parse OTP input - remove non-digits and limit to specified length.
 * 
 * @param {string} input - Raw user input
 * @param {number} length - Max length (default: 6)
 * @returns {string} Cleaned OTP
 */
export function parseOtpInput(input, length = 6) {
  return (input || "")
    .replace(/\D/g, "")
    .slice(0, length);
}

/**
 * Check if OTP input is complete.
 * 
 * @param {string} otp - OTP input
 * @param {number} length - Expected length
 * @returns {boolean} True if complete
 */
export function isOtpComplete(otp, length = 6) {
  return otp.length === length && /^\d+$/.test(otp);
}

export default {
  formatCountdown,
  isCountdownExpired,
  isValidOtpFormat,
  maskEmail,
  generateExampleOtp,
  getResendCooldown,
  canResendOtp,
  getCountdownProgress,
  parseOtpInput,
  isOtpComplete,
};
