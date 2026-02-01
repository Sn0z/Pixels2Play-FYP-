import { EyeIcon, LockIcon, MailIcon, UserIcon, CheckCircleIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/authContext";
import { signup, loginWithGoogle } from "../../api/auth";
import { signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword } from "firebase/auth";
import React, { useState } from "react";
import { auth } from "../../FireBase/firebase";
import OTPModal from "../../components/OTPModal";
import { sendOtp, verifyOtp } from "../../api/otpHelpers";
import "./SignUp.css";

/**
 * SignUp Component with OTP-Gated Flow
 * 
 * Flow:
 * 1. Email Entry → Send OTP
 * 2. OTP Verification Modal
 * 3. Password Fields (shown after OTP verified)
 * 4. Account Creation
 * 
 * Security:
 * - OTP must be verified before password fields are visible
 * - otpVerified state prevents manual submission
 * - Backend enforces OTP verification (cannot be bypassed)
 */
const SignUp = () => {
  const navigate = useNavigate();
  const { userLoggedIn } = useAuth();

  // OTP Flow States
  const [currentStep, setCurrentStep] = useState("email"); // email -> details
  const [email, setEmail] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [otpSuccess, setOtpSuccess] = useState("");
  
  // Form States
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Loading States
  const [isRegistering, setIsRegistering] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isResendingOtp, setIsResendingOtp] = useState(false);

  // Error States
  const [errorMessage, setErrorMessage] = useState("");

  // Prevent logged-in users from accessing signup page
  if (userLoggedIn) {
    navigate("/");
  }

  // ----------------------------------------------------------
  // STEP 1: Send OTP to Email
  // ----------------------------------------------------------
  const handleSendOTP = async () => {
    setErrorMessage("");
    setOtpError("");

    if (!email || !email.includes("@")) {
      setErrorMessage("Please enter a valid email address");
      return;
    }

    try {
      setIsSendingOtp(true);
      const [ok, msg] = await sendOtp(email, "signup");
      
      if (ok) {
        setOtpSent(true);
        setShowOTPModal(true);
        setCurrentStep("otp");
      } else {
        setErrorMessage(msg || "Failed to send OTP");
      }
    } catch (error) {
      setErrorMessage(error.message || "Error sending OTP");
    } finally {
      setIsSendingOtp(false);
    }
  };

  // ----------------------------------------------------------
  // STEP 2: Verify OTP
  // ----------------------------------------------------------
  const handleVerifyOTP = async (otpValue) => {
    setOtpError("");
    setOtpSuccess("");

    try {
      setIsVerifyingOtp(true);
      const [ok, msg] = await verifyOtp(email, otpValue, "signup");
      
      if (ok) {
        setOtpVerified(true);
        setOtpSuccess("Email verified! Now create your password.");
        setShowOTPModal(false);
        setCurrentStep("details");
        // Auto-transition after success message
        setTimeout(() => {
          setOtpSuccess("");
        }, 2000);
      } else {
        setOtpError(msg || "Invalid OTP");
      }
    } catch (error) {
      setOtpError(error.message || "Error verifying OTP");
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // ----------------------------------------------------------
  // STEP 3: Resend OTP
  // ----------------------------------------------------------
  const handleResendOTP = async () => {
    try {
      setIsResendingOtp(true);
      const [ok, msg] = await sendOtp(email, "signup");
      
      if (ok) {
        setOtpError("");
        // Timer will reset automatically in OTPModal component
      } else {
        setOtpError(msg || "Failed to resend OTP");
      }
    } catch (error) {
      setOtpError(error.message || "Error resending OTP");
    } finally {
      setIsResendingOtp(false);
    }
  };

  // ----------------------------------------------------------
  // STEP 4: Create Account (OTP must be verified first)
  // ----------------------------------------------------------
  const onSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    // CRITICAL: Check OTP verification before signup
    if (!otpVerified) {
      setErrorMessage("Please verify your email with OTP first");
      return;
    }

    if (!username || !password || !confirmPassword) {
      return setErrorMessage("Please fill in all fields");
    }

    if (password !== confirmPassword) {
      return setErrorMessage("Passwords do not match.");
    }

    if (!agreedToTerms) {
      return setErrorMessage("You must agree to the Terms of Service.");
    }

    try {
      setIsRegistering(true);

      // Backend will verify OTP hasn't been used twice (single-use enforcement)
      const response = await signup(email, password, username);

      if (response.user) {
        try {
          await signInWithEmailAndPassword(auth, email, password);
        } catch (firebaseError) {
          console.error("Firebase auth error:", firebaseError);
        }
        setIsRegistering(false);
        navigate("/");
      }
    } catch (error) {
      setErrorMessage(error.message);
      setIsRegistering(false);
    }
  };

  // ----------------------------------------------------------
  // 🟦 GOOGLE SIGNUP
  // ----------------------------------------------------------
  const onGoogleSignIn = async () => {
    if (isSigningIn) return;
    setErrorMessage("");
    try {
      setIsSigningIn(true);
      
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const googleToken = await userCredential.user.getIdToken();
      
      const response = await loginWithGoogle(googleToken);
      
      if (response.user) {
        setIsSigningIn(false);
        navigate("/");
      }
    } catch (error) {
      setErrorMessage(error.message);
      setIsSigningIn(false);
    }
  };

  // ----------------------------------------------------------
  // 🟪 UI RETURN - OTP-GATED FLOW
  // ----------------------------------------------------------
  return (
    <main className="signup-container">
      <div className="signup-card">
        <div className="signup-content">
          <header className="signup-header">
            <h1 className="signup-title">Join the AI Adventure!</h1>
            <p className="signup-subtitle">
              Create your free account and start learning in minutes.
            </p>
          </header>

          <form className="signup-form" onSubmit={onSubmit}>

            {/* ===== STEP 1: EMAIL ENTRY ===== */}
            {currentStep === "email" && (
              <>
                {/* EMAIL */}
                <div className="signup-field">
                  <label className="signup-label">Email Address</label>
                  <div className="signup-input-wrapper">
                    <MailIcon className="signup-input-icon" />
                    <input
                      type="email"
                      placeholder="example@example.com"
                      className="signup-input"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isSendingOtp}
                    />
                  </div>
                </div>

                {/* ERROR MESSAGE */}
                {errorMessage && (
                  <p className="signup-error-text">{errorMessage}</p>
                )}

                {/* SEND OTP BUTTON */}
                <button
                  type="button"
                  disabled={isSendingOtp || !email}
                  onClick={handleSendOTP}
                  className="signup-submit"
                >
                  {isSendingOtp ? "Sending Code..." : "Send Verification Code"}
                </button>

                {/* DIVIDER */}
                <div className="signup-or">
                  <div className="signup-divider" />
                  <span>OR</span>
                  <div className="signup-divider" />
                </div>

                {/* GOOGLE SIGNUP */}
                <button
                  type="button"
                  disabled={isSigningIn}
                  onClick={onGoogleSignIn}
                  className="signup-google"
                >
                  <img
                    className="signup-google-icon"
                    alt="Google"
                    src="https://c.animaapp.com/mhqwa664vo7WOg/img/frame.svg"
                  />
                  {isSigningIn ? "Signing In..." : "Continue with Google"}
                </button>

                <p className="login-footer">
                  <span>Already have an account? </span>
                  <a href="/login" className="login-link">
                    Log In
                  </a>
                </p>
              </>
            )}

            {/* ===== STEP 2: DETAILS ENTRY (ONLY after OTP verified) ===== */}
            {currentStep === "details" && otpVerified && (
              <>
                {/* EMAIL VERIFIED INDICATOR */}
                <div className="signup-field signup-verified-indicator">
                  <CheckCircleIcon className="signup-check-icon" />
                  <span className="signup-verified-text">Email verified ✓</span>
                </div>

                {/* USERNAME */}
                <div className="signup-field">
                  <label className="signup-label">Username</label>
                  <div className="signup-input-wrapper">
                    <UserIcon className="signup-input-icon" />
                    <input
                      type="text"
                      placeholder="Your display name"
                      className="signup-input"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      disabled={isRegistering}
                    />
                  </div>
                </div>

                {/* PASSWORD */}
                <div className="signup-field">
                  <label className="signup-label">Create a Password</label>
                  <div className="signup-input-wrapper">
                    <LockIcon className="signup-input-icon" />
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Make it super secret!"
                      className="signup-input"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isRegistering}
                    />
                    <button
                      type="button"
                      className="signup-eye-button"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isRegistering}
                    >
                      {showPassword ? (
                        <img src="../../../public/assets/eye-open.png" alt="visible" className="eye-icon" />
                      ) : (
                        <img src="../../../public/assets/eye-closed.png" alt="hidden" className="eye-icon" />
                      )}
                    </button>
                  </div>
                </div>

                {/* CONFIRM PASSWORD */}
                <div className="signup-field">
                  <label className="signup-label">Confirm Password</label>
                  <div className="signup-input-wrapper">
                    <LockIcon className="signup-input-icon" />
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Repeat your password"
                      className="signup-input"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={isRegistering}
                    />
                  </div>
                </div>

                {/* TERMS CHECKBOX */}
                <div className="signup-terms">
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="signup-checkbox"
                    disabled={isRegistering}
                  />
                  <label className="signup-terms-text">
                    I agree to the{" "}
                    <a href="#" className="signup-link">
                      Terms of Service
                    </a>.
                  </label>
                </div>

                {/* ERROR MESSAGE */}
                {errorMessage && (
                  <p className="signup-error-text">{errorMessage}</p>
                )}

                {/* SUCCESS MESSAGE */}
                {otpSuccess && (
                  <p className="signup-success-text">{otpSuccess}</p>
                )}

                {/* SUBMIT */}
                <button
                  type="submit"
                  disabled={isRegistering}
                  className="signup-submit"
                >
                  {isRegistering ? "Registering..." : "Let's Go!"}
                </button>

                {/* BACK TO EMAIL */}
                <button
                  type="button"
                  onClick={() => {
                    setCurrentStep("email");
                    setOtpVerified(false);
                    setOtpSent(false);
                    setShowOTPModal(false);
                  }}
                  className="signup-back-button"
                  disabled={isRegistering}
                >
                  ← Change Email
                </button>
              </>
            )}

          </form>
        </div>
      </div>

      {/* OTP MODAL - appears when OTP step is active */}
      <OTPModal
        email={email}
        isOpen={showOTPModal}
        onClose={() => {
          setShowOTPModal(false);
          setCurrentStep("email");
        }}
        onVerify={handleVerifyOTP}
        onResend={handleResendOTP}
        loading={isVerifyingOtp}
        error={otpError}
        success={otpSuccess}
      />
    </main>
  );
};

export default SignUp;
