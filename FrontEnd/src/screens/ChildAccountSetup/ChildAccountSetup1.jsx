import React, { useState, useEffect } from "react";
import "./ChildAccountSetup.css";
import { auth } from "../../FireBase/firebase";

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api").replace(/\/$/, ""); // Use Django API directly.

class UnauthenticatedError extends Error {
  constructor(message) {
    super(message);
    this.name = "UnauthenticatedError"; // Match UI error handling below.
  }
}

async function safeJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function findChildAccountAPI(childEmail) {
  if (!childEmail) {
    throw new Error("Child email is required."); // Prevent empty email searches.
  }

  const user = auth.currentUser;
  const token = await user?.getIdToken();
  if (!token) {
    throw new UnauthenticatedError("Authentication required to link accounts."); // Enforce Firebase auth for Django endpoints.
  }

  // Add a timeout so the UI never gets stuck on "Checking..." forever.
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 12000);

  let searchRes;
  try {
    searchRes = await fetch(
      `${API_BASE}/users/search?email=${encodeURIComponent(childEmail)}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` }, // Send Firebase token to Django.
        signal: controller.signal,
      }
    ); // Look up child by email via Django API.
  } catch (err) {
    if (err?.name === "AbortError") {
      throw new Error("Request timed out. Is the backend running on port 8000?");
    }
    throw err;
  } finally {
    window.clearTimeout(timeoutId);
  }

  if (searchRes.status === 404) {
    return { childExists: false };
  }

  if (!searchRes.ok) {
    const searchErr = await safeJson(searchRes);
    throw new Error(searchErr?.error || "Failed to search for child account.");
  }

  const child = await searchRes.json();

  if (child.role && child.role !== "UNASSIGNED") {
    throw new Error("This child account is already linked to a parent.");
  }

  return {
    childExists: true,
    childUid: child.id,
  };
}

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

const ChildAccountSetup1 = () => {
  const [email, setEmail] = useState("");
  const [linking, setLinking] = useState(false);
  const [childUid, setChildUid] = useState(null);
  const [animate, setAnimate] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  
  const [showUnauthenticatedPopup, setShowUnauthenticatedPopup] = useState(false);

  useEffect(() => setAnimate(true), []);

  const handleContinue = async () => {
    setErrorMessage("");
    setLinking(true);

    try {
      console.log("[Setup1] Searching child email:", email.trim(), "API_BASE:", API_BASE);
      const res = await findChildAccountAPI(email.trim());

      if (!res.childExists) {
        setErrorMessage(
          "We couldn't find an account with that email. Please ensure your child has logged in and created an account first."
        );
        setLinking(false);
        return;
      }
      
      setChildUid(res.childUid);
      
      goNext(res.childUid, email.trim()); 

    } catch (error) {
      if (error.name === "UnauthenticatedError") {
        console.error("Authentication check failed. User is not logged in.");
        setShowUnauthenticatedPopup(true); 
      } else {
        console.error("Child lookup failed:", error);
        setErrorMessage(error?.message || "Something went wrong. Please try again.");
      }
      setLinking(false);
    }
  };

  const goNext = (uid, childEmail) => {
    localStorage.setItem("childUid", uid);
    localStorage.setItem("childEmail", childEmail);
    window.location.href = "/setup2";
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
              disabled={linking || childUid} 
            />

            {errorMessage && (
              <p className="setup1-hint-text" role="alert">
                {errorMessage}
              </p>
            )}

            {!childUid && (
              <button 
                className="setup1-continue-button" 
                onClick={handleContinue} 
                disabled={linking || !email.trim()}
              >
                {linking ? "Checking..." : "Continue"}
              </button>
            )}

            {/* Success State */}
            {childUid && (
              <p className="setup1-hint-text">
                Child account found. Continuing to next step...
              </p>
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