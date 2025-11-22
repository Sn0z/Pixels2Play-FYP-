import React, { useState } from "react";
import "./ChildAccountSetup.css";

const ChildAccountSetup1 = () => {
  const [email, setEmail] = useState("");

  return (
    <main className="setup1-page">
      {/* Background circles */}
      <div className="setup1-circle-blue" />
      <div className="setup1-circle-yellow" />
      <div className="setup1-circle-green" />

      <div className="setup1-container">
        <div className="setup1-form-card">
          {/* Step Header */}
          <div className="setup1-step-info">
            <p>Step 1 of 3</p>
            <div className="setup1-progress-bar">
              <div
                className="setup1-progress-fill"
                style={{ width: "33.33%" }}
              />
            </div>
          </div>

          {/* Title */}
          <h1 className="setup1-title">
            Let's Set Up Your Child's Account!
          </h1>

          {/* Form Area */}
          <div className="setup1-form-content">
            <label htmlFor="child-email" className="setup1-input-label">
              Child's Email Address
            </label>

            <input
              id="child-email"
              type="email"
              placeholder="name@example.com"
              className="setup1-text-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <p className="setup1-hint-text">
              This will be used to create their secure login. We’ll send a
              confirmation link here.
            </p>

            <button className="setup1-continue-button">Continue</button>
          </div>
        </div>

        {/* Right Side Image */}
        <div className="setup1-image-box">
          <img
            src="https://c.animaapp.com/miaatpqmWZ43wO/img/image-h-auto-w-full.png"
            alt="Child graphic"
            className="setup1-side-image"
          />
        </div>
      </div>
    </main>
  );
};

export default ChildAccountSetup1;
