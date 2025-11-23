import React, { useState, useEffect } from "react";
import "./ChildAccountSetup.css";
// NOTE: Make sure the path to your API file is correct
import { sendChildVerificationLinkAPI, checkChildVerificationAPI } from "../../api/parentChildApi";

// --- New Component: Not Logged In Popup ---
const NotLoggedInPopup = ({ onClose }) => (
  <div className="popup-overlay">
    <div className="popup-content">
      <h3 className="popup-title">Authentication Required</h3>
      <p className="popup-message">
        You must be logged in as a parent to link a child's account.
        Please log in and try again.
      </p>
      <button className="popup-button" onClick={onClose}>
        Close
      </button>
    </div>
  </div>
);
// ------------------------------------------

const ChildAccountSetup1 = () => {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [childUid, setChildUid] = useState(null);
  const [verified, setVerified] = useState(false);
  const [polling, setPolling] = useState(false);
  const [animate, setAnimate] = useState(false);
  
  // NEW STATE: For the unauthenticated popup
  const [showUnauthenticatedPopup, setShowUnauthenticatedPopup] = useState(false);

  useEffect(() => setAnimate(true), []);

  // Send verification link
  const handleContinue = async () => {
    setSending(true);

    try {
      // The API call that might throw 'UnauthenticatedError'
      const res = await sendChildVerificationLinkAPI(email);

      if (!res.childExists) {
        alert("Child email does not exist.");
        setSending(false);
        return;
      }

      setChildUid(res.childUid);
      alert("Verification link sent to child's email.");

    } catch (error) {
      if (error.name === "UnauthenticatedError") {
        console.error("Authentication check failed. User is not logged in.");
        // Trigger the popup instead of an alert
        setShowUnauthenticatedPopup(true); 
      } else {
        // Handle other errors (network, server, etc.)
        console.error("An unexpected error occurred during link sending:", error);
        alert(`Error: ${error.message || 'An unknown error occurred'}`);
      }
    }

    setSending(false); // Ensure sending state is reset even on error
  };

  // Poll for verification every 3 seconds
  useEffect(() => {
    if (!childUid) return;
    setPolling(true);

    const interval = setInterval(async () => {
      // NOTE: checkChildVerificationAPI also uses the 'token()' function,
      // so you should wrap this logic in a try...catch block in a real app,
      // but for polling, we assume the user remains logged in.
      try {
        const result = await checkChildVerificationAPI(childUid);
        if (result.verified) {
          setVerified(true);
          clearInterval(interval);
        }
      } catch (e) {
        // If the polling fails (e.g., user logged out mid-poll), stop the polling
        console.warn("Polling interrupted or user logged out.", e);
        clearInterval(interval);
        setPolling(false);
        // Consider redirecting or showing the unauthenticated popup here too
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [childUid]);

  const goNext = () => {
    localStorage.setItem("childUid", childUid);
    window.location.href = "/setup-step-2";
  };

  return (
    <main className={`setup1-page ${animate ? "fade-in" : ""}`}>
      
      {/* Background elements */}
      <div className="setup1-circle-blue" />
      <div className="setup1-circle-yellow" />
      <div className="setup1-circle-green" />

      <div className={`setup1-container ${animate ? "fade-in" : ""}`}>
        <div className="setup1-form-card">
          
          <div className="setup1-step-info">
            <p>Step 1 of 3</p>
            <div className="setup1-progress-bar">
              <div className="setup1-progress-fill" style={{ width: "33.33%" }} />
            </div>
          </div>

          <h1 className="setup1-title">Enter Your Child's Account Email</h1>

          <div className="setup1-form-content">

            <label className="setup1-input-label">Child's Email Address</label>

            <input
              type="email"
              placeholder="child@example.com"
              className="setup1-text-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={childUid}
            />

            {!childUid && (
              <button className="setup1-continue-button" onClick={handleContinue} disabled={sending}>
                {sending ? "Sending..." : "Send Verification Link"}
              </button>
            )}

            {/* Verification waiting state */}
            {childUid && !verified && (
              <p className="setup1-hint-text">Waiting for child to click verification link...</p>
            )}

            {verified && (
              <button className="setup1-continue-button" onClick={goNext}>
                Continue
              </button>
            )}

          </div>
        </div>

        <div className="setup1-image-box">
          <img src="https://c.animaapp.com/miaatpqmWZ43wO/img/image-h-auto-w-full.png" alt="Child graphic" className="setup1-side-image" />
        </div>

      </div>

      {/* Render the Popup if state is true */}
      {showUnauthenticatedPopup && (
        <NotLoggedInPopup onClose={() => setShowUnauthenticatedPopup(false)} />
      )}
    </main>
  );
};

export default ChildAccountSetup1;