import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { MailIcon, ShieldCheckIcon } from "lucide-react";
import "./ChildAccountSetup.css";
import { auth } from "../../FireBase/firebase";

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api").replace(/\/$/, "");

async function safeJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

/** Send OTP to child email for email_verify purpose */
async function sendOtpAPI(childEmail) {
  const res = await fetch(`${API_BASE}/auth/otp/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: childEmail, purpose: "email_verify" }),
  });
  const body = await safeJson(res);
  if (!res.ok) throw new Error(body?.error || "Failed to send OTP.");
  return body;
}

/** Link parent and child - requires OTP */
async function linkParentChildAPI({ parentEmail, childEmail, otp, consent }) {
  const user = auth.currentUser;
  const token = await user?.getIdToken();
  if (!token || !user?.uid) {
    const err = new Error("Authentication required. Please log in again.");
    err.name = "UnauthenticatedError";
    throw err;
  }

  const res = await fetch(`${API_BASE}/family/link`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      parent_email: parentEmail,
      child_email: childEmail,
      otp,
      consent,
    }),
  });

  if (!res.ok) {
    const body = await safeJson(res);
    throw new Error(
      body?.message || body?.error || body?.error_code || body?.detail || "Failed to link parent and child."
    );
  }

  return await safeJson(res);
}

/** A single OTP digit input box */
function OtpBox({ index, value, onChange, onKeyDown, inputRef, disabled }) {
  return (
    <input
      ref={inputRef}
      className={`setup2-otp-input${value ? " setup2-otp-input-filled" : ""}`}
      type="text"
      inputMode="numeric"
      maxLength={1}
      placeholder="·"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(index, e.target.value)}
      onKeyDown={(e) => onKeyDown(index, e)}
      aria-label={`OTP digit ${index + 1}`}
    />
  );
}

const OTP_LENGTH = 6;

const ChildAccountSetupStep2 = () => {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fadeIn, setFadeIn] = useState(false);

  // Error states
  const [emailError, setEmailError] = useState(""); // email mismatch / validation
  const [otpError, setOtpError] = useState("");      // OTP errors
  const [submitError, setSubmitError] = useState(""); // final submission errors

  // OTP state
  const [otpSent, setOtpSent] = useState(false);
  const [otpDigits, setOtpDigits] = useState(Array(OTP_LENGTH).fill(""));
  const [sendingOtp, setSendingOtp] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0); // seconds before resend allowed
  const otpRefs = useRef([]);
  const navigate = useNavigate();

  const childEmail = localStorage.getItem("childEmail");

  useEffect(() => {
    setFadeIn(true);
  }, []);

  // Countdown timer for OTP resend
  useEffect(() => {
    if (otpCooldown <= 0) return;
    const timer = setTimeout(() => setOtpCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [otpCooldown]);

  // ── Email validation ──────────────────────────────────────────
  const validateEmail = (val) => {
    const currentUser = auth.currentUser;
    if (!val) return "";
    if (!val.includes("@") || val.length < 5) return "Please enter a valid email address.";
    if (currentUser?.email && val.trim().toLowerCase() !== currentUser.email.toLowerCase()) {
      return "This email doesn't match your logged-in account. Please use your own email.";
    }
    return "";
  };

  const handleEmailChange = (e) => {
    const val = e.target.value;
    setEmail(val);
    setEmailError(validateEmail(val));
    setSubmitError("");
  };

  const handleEmailBlur = () => {
    setEmailError(validateEmail(email));
  };

  // ── OTP box logic ─────────────────────────────────────────────
  const handleOtpChange = (index, val) => {
    const digit = val.replace(/\D/g, "").slice(-1);
    const updated = [...otpDigits];
    updated[index] = digit;
    setOtpDigits(updated);
    setOtpError("");
    if (digit && index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const otpValue = otpDigits.join("");

  // ── Send OTP ──────────────────────────────────────────────────
  const handleSendOtp = async () => {
    if (!childEmail) {
      setSubmitError("Child email not found. Please go back to Step 1.");
      return;
    }
    setSendingOtp(true);
    setOtpError("");
    setSubmitError("");
    try {
      await sendOtpAPI(childEmail);
      setOtpSent(true);
      setOtpCooldown(60);
      setOtpDigits(Array(OTP_LENGTH).fill(""));
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (err) {
      setOtpError(err?.message || "Failed to send OTP. Please try again.");
    } finally {
      setSendingOtp(false);
    }
  };

  // ── Submit ────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!childEmail) {
      window.location.href = "/setup1";
      return;
    }

    // Re-validate email
    const emailErr = validateEmail(email);
    if (emailErr) {
      setEmailError(emailErr);
      return;
    }

    if (!consent) {
      setSubmitError("Please confirm parental consent before continuing.");
      return;
    }

    if (!otpSent) {
      setSubmitError("Please send and enter the OTP verification code first.");
      return;
    }

    if (otpValue.length !== OTP_LENGTH) {
      setOtpError("Please enter the full 6-digit code.");
      return;
    }

    setLoading(true);
    setSubmitError("");
    setOtpError("");

    try {
      await linkParentChildAPI({
        parentEmail: email.trim(),
        childEmail,
        otp: otpValue,
        consent: true,
      });
      window.location.href = "/setup3";
    } catch (error) {
      console.error("Consent submission error:", error);
      const msg = error?.message || "An unexpected error occurred. Please try again.";
      // Distinguish OTP errors from other errors
      if (
        msg.toLowerCase().includes("otp") ||
        msg.toLowerCase().includes("code") ||
        msg.toLowerCase().includes("invalid_otp") ||
        msg.toLowerCase().includes("expired")
      ) {
        setOtpError(msg);
      } else {
        setSubmitError(msg);
      }
    } finally {
      if (window.location.pathname !== "/setup3") {
        setLoading(false);
      }
    }
  };

  const isEmailValid = email.length > 5 && email.includes("@") && !emailError;
  const isFormValid = consent && isEmailValid && otpSent && otpValue.length === OTP_LENGTH;

  return (
    <div className={`setup2-page ${fadeIn ? "fade-in" : ""}`}>
      {/* Background circles */}
      <div className="setup1-circle-blue" />
      <div className="setup1-circle-yellow" />
      <div className="setup1-circle-green" />
      <button
        type="button"
        className="setup-back-button setup1-back-button"
        onClick={() => navigate(-1)}
      >
        Back
      </button>

      <div className={`setup2-container ${fadeIn ? "fade-in delay-1" : ""}`}>
        <div className={`setup2-form-card ${fadeIn ? "fade-in delay-2" : ""}`}>

          {/* Step header */}
          <div className="setup2-step-info">
            <p>Step 2 of 3</p>
            <div className="setup2-progress-bar">
              <div className="setup2-progress-fill" style={{ width: "66.67%" }} />
            </div>
          </div>

          {/* Title */}
          <div className="setup2-title-section">
            <h1>Almost there, Parent!</h1>
            <p>We need your permission to create your child's account.</p>
          </div>

          {/* Info Box */}
          <div className="setup2-info-box">
            <div className="setup2-icon-circle">
              <ShieldCheckIcon className="setup2-icon" />
            </div>
            <div className="setup2-info-text">
              <h3>Why we ask for this</h3>
              <p>
                To protect your child's privacy online and comply with the law, we
                require a parent's consent and OTP verification. This helps us provide a
                safe, fun experience for everyone.
              </p>
            </div>
          </div>

          {/* Consent Checkbox */}
          <div className="setup2-consent-section">
            <label className="setup2-consent-label">
              <input
                type="checkbox"
                checked={consent}
                onChange={() => setConsent(!consent)}
                disabled={loading}
              />
              I confirm I am the parent or legal guardian and I consent to the
              creation of this account for my child under the platform's terms.
            </label>
          </div>

          {/* Email Input */}
          <div className="setup2-email-section">
            <p style={{ margin: 0, fontSize: "0.875rem", color: "#374151", fontWeight: 500 }}>
              Verify with your email to confirm
            </p>
            <div
              className="setup2-email-input-wrapper"
              style={{ borderColor: emailError ? "#ef4444" : "#d1d5db" }}
            >
              <MailIcon className="setup2-email-icon" />
              <input
                id="parent-email"
                type="email"
                placeholder="yourparent.email@example.com"
                className="setup2-text-input"
                value={email}
                onChange={handleEmailChange}
                onBlur={handleEmailBlur}
                disabled={loading}
              />
            </div>

            {/* Email error in red */}
            {emailError && (
              <p className="setup2-field-error" role="alert">
                ⚠ {emailError}
              </p>
            )}

            {/* Send OTP button */}
            {isEmailValid && !emailError && (
              <div className="setup2-otp-section">
                <p style={{ margin: 0, fontSize: "0.85rem", color: "#374151", fontWeight: 500 }}>
                  {otpSent
                    ? `A 6-digit code was sent to your child's email (${childEmail}).`
                    : `We'll send a verification code to your child's email (${childEmail}).`}
                </p>

                {/* OTP digit boxes */}
                {otpSent && (
                  <>
                    <div className="setup2-otp-input-group">
                      {otpDigits.map((digit, i) => (
                        <OtpBox
                          key={i}
                          index={i}
                          value={digit}
                          onChange={handleOtpChange}
                          onKeyDown={handleOtpKeyDown}
                          inputRef={(el) => (otpRefs.current[i] = el)}
                          disabled={loading}
                        />
                      ))}
                    </div>

                    {/* OTP error in red */}
                    {otpError && (
                      <p className="setup2-field-error" role="alert">
                        ⚠ {otpError}
                      </p>
                    )}
                  </>
                )}

                {/* Send / Resend OTP */}
                <div className="setup2-otp-resend">
                  {otpSent && (
                    <p>
                      Didn't receive the code?
                    </p>
                  )}
                  <button
                    type="button"
                    className="setup2-otp-resend-btn"
                    onClick={handleSendOtp}
                    disabled={sendingOtp || otpCooldown > 0 || loading}
                  >
                    {sendingOtp
                      ? "Sending…"
                      : otpCooldown > 0
                      ? `Resend in ${otpCooldown}s`
                      : otpSent
                      ? "Resend Code"
                      : "Send Verification Code →"}
                  </button>
                </div>
              </div>
            )}

            {/* OTP error if shown outside the OTP section */}
            {otpError && !isEmailValid && (
              <p className="setup2-field-error" role="alert">
                ⚠ {otpError}
              </p>
            )}

            {/* General submit error */}
            {submitError && (
              <p className="setup2-field-error" role="alert">
                ⚠ {submitError}
              </p>
            )}

            <button
              className="setup2-continue-button"
              onClick={handleSubmit}
              disabled={!isFormValid || loading}
            >
              {loading ? "Confirming…" : "Confirm & Continue"}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ChildAccountSetupStep2;