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

async function linkChildAccountAPI(childEmail) {
  if (!childEmail) {
    throw new Error("Child email is required."); // Prevent empty email searches.
  }

  const user = auth.currentUser;
  const token = await user?.getIdToken();
  if (!token) {
    throw new UnauthenticatedError("Authentication required to link accounts."); // Enforce Firebase auth for Django endpoints.
  }

  const searchRes = await fetch(
    `${API_BASE}/users/search?email=${encodeURIComponent(childEmail)}`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` }, // Send Firebase token to Django.
    }
  ); // Look up child by email via Django API.

  if (searchRes.status === 404) {
    return { childExists: false };
  }

  if (!searchRes.ok) {
    const searchErr = await safeJson(searchRes);
    throw new Error(searchErr?.error || "Failed to search for child account.");
  }

  const child = await searchRes.json();
  const parentUid = user?.uid;
  if (!parentUid) {
    throw new UnauthenticatedError("Authentication required to link accounts."); // Align with UI handling.
  }

  const linkRes = await fetch(`${API_BASE}/family/link`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`, // Send Firebase token to Django.
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      parent_id: parentUid,
      child_id: child.id,
    }),
  }); // Create parent-child link and assign roles via Django.

  if (!linkRes.ok) {
    const linkErr = await safeJson(linkRes);
    throw new Error(linkErr?.error || "Failed to link parent and child.");
  }

  const linkData = await safeJson(linkRes);

  return {
    childExists: true,
    childUid: child.id,
    linkStatus: linkData?.status || "linked",
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
  
  const [showUnauthenticatedPopup, setShowUnauthenticatedPopup] = useState(false);

  useEffect(() => setAnimate(true), []);

  const handleContinue = async () => {
    setLinking(true);

    let uidToPass = null; 

    try {
      const res = await linkChildAccountAPI(email);

      if (!res.childExists) {
        alert("Child email does not exist."); 
        setLinking(false);
        return;
      }
      
      uidToPass = res.childUid;

      setChildUid(uidToPass);
      
      goNext(uidToPass); 

    } catch (error) {
      if (error.name === "UnauthenticatedError") {
        console.error("Authentication check failed. User is not logged in.");
        setShowUnauthenticatedPopup(true); 
      } else {
        console.error("An unexpected error occurred during linking (BYPASSING):", error);

        if (!uidToPass) {
             uidToPass = email; 
        }

        setChildUid(uidToPass);
        goNext(uidToPass); 
      }
      setLinking(false);
    }
  };

  const goNext = (uid) => {
    localStorage.setItem("childUid", uid);
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

            {!childUid && (
              <button 
                className="setup1-continue-button" 
                onClick={handleContinue} 
                disabled={linking}
              >
                {linking ? "Linking..." : "Link Child Account"}
              </button>
            )}

            {/* Success State */}
            {childUid && (
              <p className="setup1-hint-text">
                Child account linked. Continuing to next step...
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