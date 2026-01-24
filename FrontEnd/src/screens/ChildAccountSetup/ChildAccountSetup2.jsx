import React, { useState, useEffect } from "react";
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

async function linkParentChildAPI({ parentEmail, childUid, consent }) {
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
      parent_uid: user.uid,
      child_uid: childUid,
      parent_email: parentEmail,
      consent,
    }),
  });

  if (!res.ok) {
    const body = await safeJson(res);
    throw new Error(body?.error || body?.detail || "Failed to link parent and child.");
  }

  return await safeJson(res);
}

const ChildAccountSetupStep2 = () => {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false); // New state for loading/confirmation
  const [fadeIn, setFadeIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Get the child's UID (set in Step 1) from local storage
  const childUid = localStorage.getItem("childUid");

  // Trigger fade-in after component mounts
  useEffect(() => {
    setFadeIn(true);
  }, []);

  // Function to handle the form submission
  const handleSubmit = async () => {
    if (!childUid) {
      window.location.href = "/setup1";
      return;
    }

    if (!consent || !email || loading) {
      return; // Prevent submission if consent is missing or loading
    }
    
    // 1. Start loading state
    setLoading(true);
    setErrorMessage("");

    try {
      await linkParentChildAPI({ parentEmail: email.trim(), childUid, consent: true });

      // Redirect to Step 3 upon successful link
      window.location.href = "/setup3";
    } catch (error) {
      console.error("Consent submission error:", error);
      setErrorMessage(error?.message || "An unexpected error occurred. Please try again.");
    } finally {
      // 4. End loading state only if redirection didn't happen
      if (window.location.pathname !== "/setup3") {
        setLoading(false);
      }
    }
  };

  const isFormValid = consent && email.length > 5 && email.includes('@');

  return (
    <div className={`setup2-page ${fadeIn ? "fade-in" : ""}`}>
      {/* Background circles */}
      <div className="setup1-circle-blue" />
      <div className="setup1-circle-yellow" />
      <div className="setup1-circle-green" />

      <div className={`setup2-container ${fadeIn ? "fade-in delay-1" : ""}`}>
        <div className={`setup2-form-card ${fadeIn ? "fade-in delay-2" : ""}`}>
          {/* Step header */}
          <div className="setup2-step-info">
            <p>Step 2 of 3</p>
            <div className="setup2-progress-bar">
              <div
                className="setup2-progress-fill"
                style={{ width: "66.67%" }}
              />
            </div>
          </div>

          {/* Title and description */}
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
                require a parent's consent. This helps us provide a safe, fun
                experience for everyone.
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
            <p>Verify with your email to confirm</p>
          </div>

          {/* Email Input */}
          <div className="setup2-email-section">
            <div className="setup2-email-input-wrapper">
              <MailIcon className="setup2-email-icon" />
              <input
                id="parent-email" // Changed ID to parent-email for clarity
                type="email"
                placeholder="yourparent.email@example.com"
                className="setup2-text-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>

            {errorMessage && (
              <p className="setup1-hint-text" role="alert">
                {errorMessage}
              </p>
            )}

            <button
              className="setup2-continue-button"
              onClick={handleSubmit} // Call the new submit function
              disabled={!isFormValid || loading} // Disable if form is invalid or loading
            >
              {loading ? "Confirming..." : "Confirm & Continue"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChildAccountSetupStep2;