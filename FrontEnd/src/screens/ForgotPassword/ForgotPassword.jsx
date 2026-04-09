import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { MailIcon, ArrowLeftIcon, CheckCircle2Icon, AlertCircleIcon, KeyRoundIcon } from "lucide-react";
import { requestPasswordReset } from "../../api/auth";
import "./ForgotPassword.css";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);

    try {
      await requestPasswordReset(trimmedEmail);
      setSuccess(true);
    } catch (err) {
      setError(err.message || "Failed to send reset email. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="forgot-page">
      {/* Background */}
      <div className="forgot-background">
        <img
          className="forgot-bg-image"
          alt="Decorative background"
          src="https://c.animaapp.com/mhqukxxjAGK3sq/img/vector.png"
        />
      </div>

      <div className="forgot-card">
        {/* ─── Success State ───────────────────────────── */}
        {success ? (
          <div className="forgot-success">
            <div className="forgot-success-icon">
              <CheckCircle2Icon />
            </div>
            <h2>Check Your Email!</h2>
            <p>
              We've sent a password reset link to{" "}
              <span className="forgot-email-highlight">{email.trim()}</span>
            </p>
            <p>
              Click the link in the email to create a new password. It may take a minute to arrive.
            </p>
            <p className="forgot-success-note">
              Don't see it? Check your spam or junk folder.
            </p>
            <Link to="/login" className="forgot-back-to-login">
              <ArrowLeftIcon size={18} />
              Back to Login
            </Link>
          </div>
        ) : (
          /* ─── Email Entry State ──────────────────────── */
          <>
            <div className="forgot-header">
              <div className="forgot-icon-wrapper">
                <KeyRoundIcon />
              </div>
              <h1>Forgot Password?</h1>
              <p>
                No worries! Enter the email address linked to your account and
                we'll send you a link to reset your password.
              </p>
            </div>

            <form className="forgot-form" onSubmit={handleSubmit}>
              {/* Email field */}
              <div className="forgot-field">
                <label htmlFor="forgot-email">Email Address</label>
                <div className="forgot-input-wrapper">
                  <MailIcon className="forgot-input-icon" />
                  <input
                    id="forgot-email"
                    type="email"
                    placeholder="your.email@example.com"
                    required
                    className="forgot-input"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError("");
                    }}
                    disabled={loading}
                    autoFocus
                  />
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="forgot-error">
                  <AlertCircleIcon />
                  <span>{error}</span>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                className="forgot-submit"
                disabled={loading || !email.trim()}
              >
                {loading ? (
                  <>
                    <span className="forgot-spinner" />
                    Sending...
                  </>
                ) : (
                  "Send Reset Link"
                )}
              </button>

              {/* Back to login */}
              <p className="forgot-footer">
                <Link to="/login">← Back to Login</Link>
              </p>
            </form>
          </>
        )}
      </div>
    </main>
  );
};

export default ForgotPassword;
