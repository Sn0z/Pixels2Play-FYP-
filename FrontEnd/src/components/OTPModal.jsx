import React, { useState, useEffect, useRef } from "react";
import { XIcon, CheckCircleIcon, AlertCircleIcon } from "lucide-react";
import {
  formatCountdown,
  isCountdownExpired,
  maskEmail,
  canResendOtp,
  getResendCooldown,
  parseOtpInput,
  isOtpComplete,
} from "../utils/otpUI";
import "./OTPModal.css";

/**
 * OTP Modal Component (Option 1)
 * 
 * Production-grade OTP verification modal with:
 * - 6-digit input with auto-focus and auto-advance
 * - Countdown timer with visual progress
 * - Resend button with cooldown
 * - Error and success states
 * - Auto-close on success (configurable)
 * 
 * Props:
 *   email: Email receiving OTP
 *   isOpen: Whether modal is visible
 *   onClose: Callback when user closes modal
 *   onVerify: Callback on successful OTP verification (otp: string)
 *   onResend: Callback to resend OTP
 *   initialCountdown: Countdown time in seconds (default: 600 = 10 mins)
 *   onCountdownExpire: Callback when countdown reaches 0
 *   loading: Whether verification is in progress
 *   error: Error message to display
 *   success: Success message to display
 * 
 * Usage:
 *   <OTPModal
 *     email={email}
 *     isOpen={showOTP}
 *     onClose={() => setShowOTP(false)}
 *     onVerify={handleOTPVerify}
 *     onResend={handleResendOTP}
 *   />
 */
const OTPModal = ({
  email = "",
  isOpen = false,
  onClose = () => {},
  onVerify = () => {},
  onResend = () => {},
  initialCountdown = 600, // 10 minutes
  onCountdownExpire = () => {},
  loading = false,
  error = "",
  success = "",
}) => {
  const [otp, setOtp] = useState("");
  const [countdown, setCountdown] = useState(initialCountdown);
  const [lastResendTime, setLastResendTime] = useState(null);
  const inputRefs = useRef([]);

  // Countdown timer effect
  useEffect(() => {
    if (!isOpen || countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          onCountdownExpire();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, onCountdownExpire]);

  // Reset OTP when modal opens
  useEffect(() => {
    if (isOpen) {
      setOtp("");
      setCountdown(initialCountdown);
      setLastResendTime(null);
      // Auto-focus first input
      inputRefs.current[0]?.focus();
    }
  }, [isOpen, initialCountdown]);

  const handleOtpChange = (index, value) => {
    const cleaned = parseOtpInput(value, 1);
    const newOtp = otp.split("");
    newOtp[index] = cleaned;
    const otpString = newOtp.join("");

    setOtp(otpString);

    // Auto-advance to next input on digit entry
    if (cleaned && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit on complete
    if (isOtpComplete(otpString)) {
      handleVerify(otpString);
    }
  };

  const handleBackspace = (index, event) => {
    if (
      event.key === "Backspace" &&
      !otp[index] &&
      index > 0
    ) {
      // Move focus back on backspace if current field is empty
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = (otpValue) => {
    if (!isOtpComplete(otpValue)) return;
    onVerify(otpValue);
  };

  const handleResend = () => {
    if (!canResendOtp(lastResendTime, 30)) return;
    setLastResendTime(new Date());
    setCountdown(initialCountdown);
    setOtp("");
    onResend();
    inputRefs.current[0]?.focus();
  };

  if (!isOpen) return null;

  const isExpired = isCountdownExpired(countdown);
  const canResend = canResendOtp(lastResendTime, 30);
  const resendCooldown = getResendCooldown(lastResendTime, 30);
  const isComplete = isOtpComplete(otp);

  return (
    <div className="otp-modal-overlay">
      <div className="otp-modal-container">
        {/* Header */}
        <div className="otp-modal-header">
          <h2 className="otp-modal-title">Verify Your Email</h2>
          <button
            className="otp-modal-close"
            onClick={onClose}
            disabled={loading}
            aria-label="Close"
          >
            <XIcon size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="otp-modal-content">
          {/* Email display */}
          <p className="otp-modal-email">
            We sent a code to <strong>{maskEmail(email)}</strong>
          </p>

          {/* Success state */}
          {success && (
            <div className="otp-modal-success">
              <CheckCircleIcon size={20} />
              <span>{success}</span>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="otp-modal-error">
              <AlertCircleIcon size={20} />
              <span>{error}</span>
            </div>
          )}

          {/* OTP input fields */}
          {!success && (
            <>
              <div className="otp-modal-input-group">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <input
                    key={idx}
                    ref={(el) => {
                      inputRefs.current[idx] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength="1"
                    className={`otp-modal-input ${
                      otp[idx] ? "otp-modal-input-filled" : ""
                    } ${isExpired ? "otp-modal-input-expired" : ""}`}
                    value={otp[idx] || ""}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleBackspace(idx, e)}
                    disabled={loading || isExpired}
                    placeholder="•"
                  />
                ))}
              </div>

              {/* Countdown timer */}
              <div className={`otp-modal-countdown ${isExpired ? "otp-modal-countdown-expired" : ""}`}>
                {isExpired ? (
                  <span className="otp-modal-countdown-text">Code expired</span>
                ) : (
                  <>
                    <span className="otp-modal-countdown-text">
                      Valid for {formatCountdown(countdown)}
                    </span>
                    <div className="otp-modal-progress-bar">
                      <div
                        className="otp-modal-progress-fill"
                        style={{
                          width: `${(countdown / initialCountdown) * 100}%`,
                        }}
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Resend button */}
              <div className="otp-modal-resend-wrapper">
                {isExpired ? (
                  <p className="otp-modal-resend-text">
                    Code expired. Please request a new one.
                  </p>
                ) : (
                  <>
                    <p className="otp-modal-resend-text">
                      Didn't receive the code?
                    </p>
                    <button
                      className={`otp-modal-resend-button ${
                        canResend ? "" : "otp-modal-resend-button-disabled"
                      }`}
                      onClick={handleResend}
                      disabled={!canResend || loading}
                    >
                      {canResend ? (
                        "Resend Code"
                      ) : (
                        `Resend in ${resendCooldown}s`
                      )}
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="otp-modal-footer">
          <button
            className={`otp-modal-button otp-modal-button-secondary ${
              loading || !isComplete ? "otp-modal-button-disabled" : ""
            }`}
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            className={`otp-modal-button otp-modal-button-primary ${
              loading || !isComplete || isExpired ? "otp-modal-button-disabled" : ""
            }`}
            onClick={() => handleVerify(otp)}
            disabled={loading || !isComplete || isExpired}
          >
            {loading ? "Verifying..." : "Verify Code"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OTPModal;
