import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./ChildAccountSetup.css";
import { auth } from "../../FireBase/firebase";

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api").replace(/\/$/, "");

// Plan child limits
const PLAN_LIMITS = {
  starter: 1,
  pro: 2,
  family: 5,
};

const PLAN_NAMES = {
  starter: "Starter",
  pro: "Pro",
  family: "Family",
};

class UnauthenticatedError extends Error {
  constructor(message) {
    super(message);
    this.name = "UnauthenticatedError";
  }
}

async function safeJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function getToken() {
  const user = auth.currentUser;
  const token = await user?.getIdToken();
  if (!token) throw new UnauthenticatedError("Authentication required to link accounts.");
  return token;
}

async function findChildAccountAPI(childEmail) {
  if (!childEmail) throw new Error("Child email is required.");

  const token = await getToken();

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 12000);

  let searchRes;
  try {
    searchRes = await fetch(
      `${API_BASE}/users/search?email=${encodeURIComponent(childEmail)}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      }
    );
  } catch (err) {
    if (err?.name === "AbortError") {
      throw new Error("Request timed out. Is the backend running on port 8000?");
    }
    throw err;
  } finally {
    window.clearTimeout(timeoutId);
  }

  if (searchRes.status === 404) return { childExists: false };

  if (!searchRes.ok) {
    const searchErr = await safeJson(searchRes);
    throw new Error(searchErr?.error || "Failed to search for child account.");
  }

  const child = await searchRes.json();
  if (child.role && child.role !== "UNASSIGNED") {
    throw new Error("This child account is already linked to a parent.");
  }

  return { childExists: true, childUid: child.id };
}

async function fetchSubscriptionStatus() {
  const token = await getToken();
  const res = await fetch(`${API_BASE}/payments/subscription-status/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await safeJson(res);
  return body || { subscribed: false };
}

async function fetchCurrentChildCount() {
  const token = await getToken();
  const res = await fetch(`${API_BASE}/family/links`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return 0;
  const links = await safeJson(res);
  return Array.isArray(links) ? links.length : 0;
}

// ── Subscription gate modal ────────────────────────────────────
function SubscriptionGate({ planId, currentCount, limit, onDismiss }) {
  const navigate = useNavigate();
  const isNoSub = !planId;
  const isLimitReached = !isNoSub && currentCount >= limit;

  let icon, title, message, upgradeTo;

  if (isNoSub) {
    title = "Subscription Required";
    message =
      "You need an active subscription to add a child account. Choose a plan to get started — Starter supports 1 child, Pro supports 2, and Family supports up to 5.";
  } else if (isLimitReached) {
    const nextPlan =
      planId === "starter" ? "Pro" : planId === "pro" ? "Family" : null;
    title = `${PLAN_NAMES[planId]} Plan Limit Reached`;
    message = nextPlan
      ? `Your ${PLAN_NAMES[planId]} plan supports up to ${limit} child account${limit > 1 ? "s" : ""}. Upgrade to ${nextPlan} to add more children.`
      : `Your ${PLAN_NAMES[planId]} plan supports up to ${limit} child accounts. You've reached the maximum.`;
    upgradeTo = nextPlan;
  }

  return (
    <div className="sub-gate-overlay" onClick={onDismiss}>
      <div className="sub-gate-card" onClick={(e) => e.stopPropagation()}>
        <span className="sub-gate-icon">{icon}</span>
        {!isNoSub && (
          <div className="sub-gate-plan-badge">
            Current plan: {PLAN_NAMES[planId] || planId}
          </div>
        )}
        <h2>{title}</h2>
        <p>{message}</p>
        <button
          className="sub-gate-btn"
          onClick={() => navigate("/pricing")}
        >
          {isNoSub ? "View Plans →" : `Upgrade to ${upgradeTo || "a higher plan"} →`}
        </button>
        <br />
        <button className="sub-gate-dismiss" onClick={onDismiss}>
          Go back
        </button>
      </div>
    </div>
  );
}

// ── Not-logged-in popup ────────────────────────────────────────
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

// ── Main component ────────────────────────────────────────────
const ChildAccountSetup1 = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [linking, setLinking] = useState(false);
  const [childUid, setChildUid] = useState(null);
  const [animate, setAnimate] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [showUnauthenticatedPopup, setShowUnauthenticatedPopup] = useState(false);

  // Subscription gate state
  const [subLoading, setSubLoading] = useState(true);
  const [gateInfo, setGateInfo] = useState(null); // { planId, currentCount, limit } or null
  const [showGate, setShowGate] = useState(false);

  useEffect(() => {
    setAnimate(true);
    // Check subscription status on mount
    (async () => {
      try {
        const [subStatus, childCount] = await Promise.all([
          fetchSubscriptionStatus(),
          fetchCurrentChildCount(),
        ]);

        const planId = subStatus.plan_id?.toLowerCase() || null;
        const subscribed = subStatus.subscribed && planId;
        const limit = subscribed ? (PLAN_LIMITS[planId] ?? 0) : 0;

        if (!subscribed || childCount >= limit) {
          setGateInfo({ planId: subscribed ? planId : null, currentCount: childCount, limit });
          setShowGate(true);
        }
      } catch (err) {
        // If auth fails, let the form handle it naturally
        if (!(err instanceof UnauthenticatedError)) {
          console.warn("[Setup1] Subscription check failed:", err);
        }
      } finally {
        setSubLoading(false);
      }
    })();
  }, []);

  const handleContinue = async () => {
    // Re-check gate before proceeding
    if (showGate || gateInfo) {
      setShowGate(true);
      return;
    }

    setErrorMessage("");
    setLinking(true);

    try {
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
        setShowUnauthenticatedPopup(true);
      } else {
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
      <button
        type="button"
        className="setup-back-button setup1-back-button"
        onClick={() => navigate("/")}
      >
        Back
      </button>

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
              onChange={(e) => {
                setEmail(e.target.value);
                setErrorMessage("");
              }}
              disabled={linking || !!childUid}
            />

            {errorMessage && (
              <p className="setup1-hint-text" role="alert">
                ⚠ {errorMessage}
              </p>
            )}

            {!childUid && (
              <button
                className="setup1-continue-button"
                onClick={handleContinue}
                disabled={linking || !email.trim() || subLoading}
              >
                {subLoading ? "Checking…" : linking ? "Checking..." : "Continue"}
              </button>
            )}

            {childUid && (
              <p className="setup1-hint-text">
                Child account found. Continuing to next step…
              </p>
            )}
          </div>
        </div>

        <div className="setup1-image-box">
          <img
            src="https://c.animaapp.com/miaatpqmWZ43wO/img/image-h-auto-w-full.png"
            alt="Child graphic"
            className="setup1-side-image"
          />
        </div>
      </div>

      {/* Subscription gate modal */}
      {showGate && gateInfo && (
        <SubscriptionGate
          planId={gateInfo.planId}
          currentCount={gateInfo.currentCount}
          limit={gateInfo.limit}
          onDismiss={() => setShowGate(false)}
        />
      )}

      {showUnauthenticatedPopup && (
        <NotLoggedInPopup onClose={() => setShowUnauthenticatedPopup(false)} />
      )}
    </main>
  );
};

export default ChildAccountSetup1;