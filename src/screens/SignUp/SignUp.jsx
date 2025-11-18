import { EyeIcon, LockIcon, MailIcon, UserIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/authContext";
import { doCreateUserWithEmailAndPassword } from "../../FireBase/auth";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import React, { useState } from "react";
import { auth } from "../../FireBase/firebase";
import "./SignUp.css";

const SignUp = () => {
  const navigate = useNavigate();
  const { userLoggedIn } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const [username, setUsername] = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [isRegistering, setIsRegistering] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");

  // Prevent logged-in users from accessing signup page
  if (userLoggedIn) {
    navigate("/");
  }

  // ----------------------------------------------------------
  // HANDLE EMAIL SIGNUP
  // ----------------------------------------------------------
  const onSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (password !== confirmPassword) {
      return setErrorMessage("Passwords do not match.");
    }

    if (!agreedToTerms) {
      return setErrorMessage("You must agree to the Terms of Service.");
    }

    try {
      setIsRegistering(true);

      // create user with custom auth function
      await doCreateUserWithEmailAndPassword(email, password, username);

      setIsRegistering(false);

      navigate("/"); // redirect home after success
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
      await signInWithPopup(auth, provider);

      setIsSigningIn(false);
      navigate("/");
    } catch (error) {
      setErrorMessage(error.message);
      setIsSigningIn(false);
    }
  };

  // ----------------------------------------------------------
  // 🟪 UI RETURN
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
                />
                <button
                  type="button"
                  className="signup-eye-button"
                  onClick={() => setShowPassword(!showPassword)}
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

            {/* SUBMIT */}
            <button
              type="submit"
              disabled={isRegistering}
              className="signup-submit"
            >
              {isRegistering ? "Registering..." : "Let’s Go!"}
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
          </form>
        </div>
      </div>
    </main>
  );
};

export default SignUp;
