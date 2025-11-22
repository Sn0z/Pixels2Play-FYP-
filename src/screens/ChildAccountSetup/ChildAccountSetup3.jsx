import React, { useState, useEffect } from "react";
import "./ChildAccountSetup.css";

export default function ChildAccountSetup3() {
  const [fadeIn, setFadeIn] = useState(false);

  useEffect(() => {
    // Trigger fade-in after mount
    setFadeIn(true);
  }, []);

  return (
    <div className="cas-wrapper">
      {/* Background circles */}
      <div className="setup1-circle-blue" />
      <div className="setup1-circle-yellow" />
      <div className="setup1-circle-green" />

      {/* Content container */}
      <div className="cas-container">

        {/* Step + Progress */}
        <div className={`cas-step-block ${fadeIn ? "fade-in delay-1" : ""}`}>
          <div className="cas-step-text">Step 3 of 3</div>

          <div className="cas-progress">
            <div className="cas-progress-bar" style={{ width: "100%" }}></div>
          </div>
        </div>

        {/* Card */}
        <div className={`cas-card ${fadeIn ? "fade-in delay-2" : ""}`}>
          <div className="cas-card-content">

            <img
              className="cas-image"
              alt="Completion Illustration"
              src="https://c.animaapp.com/miachx48ukYCXz/img/relative-h-48-w-48.svg"
            />

            <h1 className="cas-title">All Done!</h1>

            <p className="cas-desc">
              Your child&apos;s account is ready! Click the button below to go to
              their dashboard and start exploring.
            </p>

            <button
              className="cas-button"
              onClick={() => (window.location.href = "/")}
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
