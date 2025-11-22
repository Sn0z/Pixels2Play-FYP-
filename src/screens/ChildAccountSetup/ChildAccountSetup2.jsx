import React, { useState } from "react";
import { MailIcon, ShieldCheckIcon } from "lucide-react";
import "./ChildAccountSetup.css";

const ChildAccountSetupStep2 = () => {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);

  return (
    <div className="setup2-page">
      {/* Background circles */}
      <div className="setup2-circle-blue" />
      <div className="setup2-circle-yellow" />
      <div className="setup2-circle-green" />

      <div className="setup2-container">
        <div className="setup2-form-card">
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
                id="child-email"
                type="email"
                placeholder="yourparent.email@example.com"
                className="setup2-text-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}/>
            </div>

            <button
              className="setup2-continue-button"
              disabled={!consent}
            >
              Confirm & Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChildAccountSetupStep2;
