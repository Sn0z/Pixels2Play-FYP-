import React, { useState, useEffect, useRef } from "react";
import { ChevronLeftIcon, CheckCircleIcon, AlertCircleIcon, RefreshCwIcon } from "lucide-react";
import {
  formatCountdown,
  isCountdownExpired,
  maskEmail,
  canResendOtp,
  getResendCooldown,
  parseOtpInput,
  isOtpComplete,
} from "@/utils/otpUI";
import "./OTPVerification.css";

/**
 * OTP Verification Page Component (Option 2)
 * 
 * Dedicated page for OTP verification with:
 * - Full-page layout for better visibility on mobile
 * - Masked email display
 * - Clear instructions and typography
 * - Loading and retry states
 * - Back button navigation
 * - Accessible and mobile-optimized
 * 
 * Props:
 *   email: Email receiving OTP
 *   onVerify: Callback on successful OTP verification (otp: string)
 *   onResend: Callback to resend OTP
 *   onBack: Callback when user navigates back
 *   initialCountdown: Countdown time in seconds (default: 600)
 *   loading: Whether verification is in progress
 *   error: Error message to display
 *   success: Success message to display
 * 
 * Usage:
 *   <OTPVerification
 *     email={email}
 *     onVerify={handleVerify}
 *     onResend={handleResend}
 *     onBack={() => navigate(-1)}
 *   />
 */
const OTPVerification = ({
  email = "",
  onVerify = () => {},
  onResend = () => {},
  onBack = () => {},
  initialCountdown = 600,
  loading = false,
  error = "",
  success = "",
}) => {
  const [otp, setOtp] = useState("");
  const [countdown, setCountdown] = useState(initialCountdown);
  const [lastResendTime, setLastResendTime] = useState(null);
  const [manualError, setManualError] = useState("");
  const inputRefs = useRef([]);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleOtpChange = (index, value) => {
    const cleaned = parseOtpInput(value, 1);
    const newOtp = otp.split("");
    newOtp[index] = cleaned;
    const otpString = newOtp.join("");

    setOtp(otpString);
    setManualError(""); // Clear error on input

    // Auto-advance
    if (cleaned && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit on complete
    if (isOtpComplete(otpString)) {
      handleVerify(otpString);
    }
  };

  const handleBackspace = (index, event) => {
    if (event.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = (otpValue) => {
    if (!isOtpComplete(otpValue)) {
      setManualError("Please enter a complete code");
      return;
    }
    onVerify(otpValue);
  };

  const handleResend = () => {
    if (!canResendOtp(lastResendTime, 30)) return;
    setLastResendTime(new Date());
    setCountdown(initialCountdown);
    setOtp("");
    setManualError("");
    onResend();
    inputRefs.current[0]?.focus();
  };

  const isExpired = isCountdownExpired(countdown);
  const canResend = canResendOtp(lastResendTime, 30);
  const resendCooldown = getResendCooldown(lastResendTime, 30);
  const isComplete = isOtpComplete(otp);
  const displayError = error || manualError;

  return (
    <div className="otp-verification-wrapper">
      {/* Background decoration */}
      <div className="otp-verification-bg-decoration otp-verification-bg-1" />
      <div className="otp-verification-bg-decoration otp-verification-bg-2" />
      <div className="otp-verification-bg-decoration otp-verification-bg-3" />

      <div className="otp-verification-container">
        {/* Header with back button */}
        <div className="otp-verification-header">
          <button
            className="otp-verification-back-button"
            onClick={onBack}
            disabled={loading}
            aria-label="Go back"
          >
            <ChevronLeftIcon size={20} />
            <span>Back</span>
          </button>
        </div>

        {/* Main content */}
        <div className="otp-verification-content">
          {/* Success state - full page */}
          {success && (
            <div className="otp-verification-success-state">
              <div className="otp-verification-success-icon">
                <CheckCircleIcon size={64} />
              </div>
              <h2 className="otp-verification-success-title">Verified!</h2>
              <p className="otp-verification-success-message">
                {success || "Your email has been verified successfully."}
              </p>
            </div>
          )}

          {/* Normal state */}
          {!success && (
            <>
              {/* Illustration / Icon */}
              <div className="otp-verification-icon-wrapper">
                <div className="otp-verification-icon-circle">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="16" rx="2" />
                    <path d="M3 4l9 8 9-8" />
                  </svg>
                </div>
              </div>

              {/* Title & Description */}
              <div className="otp-verification-text-section">
                <h1 className="otp-verification-title">Verify Your Email</h1>
                <p className="otp-verification-subtitle">
                  We've sent a 6-digit verification code to <br />
                  <strong>{maskEmail(email)}</strong>
                </p>
              </div>

              {/* Error message */}
              {displayError && (
                <div className="otp-verification-error-banner">
                  <AlertCircleIcon size={18} />
                  <span>{displayError}</span>
                </div>
              )}

              {/* OTP Input Section */}
              <div className="otp-verification-input-section">
                <div className="otp-verification-input-group">
                  {Array.from({ length: 6 }).map((_, idx) => (
                    <input
                      key={idx}
                      ref={(el) => {
                        inputRefs.current[idx] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength="1"
                      className={`otp-verification-input ${
                        otp[idx] ? "otp-verification-input-filled" : ""
                      } ${isExpired ? "otp-verification-input-expired" : ""}`}
                      value={otp[idx] || ""}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleBackspace(idx, e)}
                      disabled={loading || isExpired}
                      placeholder="•"
                    />
                  ))}
                </div>

                {/* Countdown & Timer Info */}
                <div className="otp-verification-timer-section">
                  {isExpired ? (
                    <div className="otp-verification-timer-expired">
                      <AlertCircleIcon size={16} />
                      <span>Verification code has expired</span>
                    </div>
                  ) : (
                    <>
                      <div className="otp-verification-timer-text">
                        Code valid for{" "}
                        <strong className="otp-verification-timer-countdown">
                          {formatCountdown(countdown)}
                        </strong>
                      </div>
                      <div className="otp-verification-progress-bar">
                        <div
                          className="otp-verification-progress-fill"
                          style={{
                            width: `${(countdown / initialCountdown) * 100}%`,
                          }}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Resend Section */}
              <div className="otp-verification-resend-section">
                <p className="otp-verification-resend-prompt">
                  Didn't receive the code?
                </p>
                <button
                  className={`otp-verification-resend-button ${
                    canResend ? "" : "otp-verification-resend-button-disabled"
                  }`}
                  onClick={handleResend}
                  disabled={!canResend || loading}
                >
                  <RefreshCwIcon size={16} />
                  <span>
                    {canResend ? "Resend Code" : `Resend in ${resendCooldown}s`}
                  </span>
                </button>
              </div>

              {/* Action Button */}
              <button
                className={`otp-verification-button ${
                  loading || !isComplete || isExpired
                    ? "otp-verification-button-disabled"
                    : ""
                }`}
                onClick={() => handleVerify(otp)}
                disabled={loading || !isComplete || isExpired}
              >
                {loading ? (
                  <>
                    <span className="otp-verification-spinner" />
                    Verifying...
                  </>
                ) : (
                  "Verify Code"
                )}
              </button>

              {/* Helper text */}
              <p className="otp-verification-helper-text">
                Check your spam folder if you don't see the email.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default OTPVerification;
