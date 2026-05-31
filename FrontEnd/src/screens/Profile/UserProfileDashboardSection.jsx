import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useChildProfile } from "../../hooks/useChildProfile";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { auth } from "../../FireBase/firebase";
import { signOut } from "firebase/auth";
import ConfirmModal from "../../components/ConfirmModal";
import "./UserProfileDashboardSection.css";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api").replace(/\/$/, "");

/* ─── badge icon mapping ─────────────────────────────────── */
const BADGE_ICONS = {
  first_game: "🎮",
  perfect_score: "⭐",
  persistent_learner: "📚",
  pattern_master: "🔷",
  decision_expert: "🧠",
  prediction_pro: "🔮",
};

/* ─── Skeleton loader ────────────────────────────────────── */
function Skeleton({ className }) {
  return <div className={`upd-skeleton ${className || ""}`} />;
}

import { NavigationSection } from "./NavigationSection";

export default function UserProfileDashboardSection() {
  const navigate = useNavigate();
  const { parent, children, childLimit, canAddChild, loading, error, accessDenied, refetch } =
    useChildProfile();

  const [activeChildIndex, setActiveChildIndex] = useState(0);
  const child = children[activeChildIndex] || null;

  const [paymentVerified, setPaymentVerified] = useState(false);

  // Check for Khalti pidx in URL
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pidx = params.get("pidx");

    if (pidx) {
      const verifyPayment = async () => {
        try {
          const user = auth.currentUser;
          if (!user) return; // auth hasn't resolved yet
          const token = await user.getIdToken();
          
          const res = await fetch(`${API_BASE}/payments/verify/`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ pidx }),
          });
          const data = await res.json();
          if (data.success) {
            setPaymentVerified(true);
            window.history.replaceState({}, document.title, window.location.pathname);
            refetch(); // Reload limits and children
            setTimeout(() => setPaymentVerified(false), 5000); // Hide banner after 5s
          }
        } catch (err) {
          console.error("Payment verification failed:", err);
        }
      };
      
      const unsubscribe = auth.onAuthStateChanged((user) => {
        if (user) verifyPayment();
      });
      return unsubscribe;
    }
  }, [refetch]);

  const [showSignOutModal, setShowSignOutModal] = useState(false);

  const handleSignOutRequest = () => setShowSignOutModal(true);

  const handleSignOutConfirm = async () => {
    setShowSignOutModal(false);
    await signOut(auth);
    navigate("/login");
  };

  /* Access denied ------------------------------------------------ */
  if (accessDenied) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>
        <div style={{ width: 280, flexShrink: 0, position: 'fixed', top: 0, left: 0, height: '100vh', zIndex: 50 }}>
          <NavigationSection onSignOut={handleSignOutRequest} />
        </div>
        <div style={{ flex: 1, marginLeft: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
          <div className="upd-denied-card">
            <span className="upd-denied-icon">🔒</span>
            <h2>Access Restricted</h2>
            <p>This dashboard is only visible to linked parents.</p>
            <Link to="/login" className="upd-btn upd-btn-primary">
              Log in as a Parent
            </Link>
          </div>
        </div>
        <ConfirmModal
          isOpen={showSignOutModal}
          title="Sign Out"
          message="Are you sure you want to sign out?"
          onConfirm={handleSignOutConfirm}
          onCancel={() => setShowSignOutModal(false)}
        />
      </div>
    );
  }

  /* Error state -------------------------------------------------- */
  if (error && !loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>
        <div style={{ width: 280, flexShrink: 0, position: 'fixed', top: 0, left: 0, height: '100vh', zIndex: 50 }}>
          <NavigationSection onSignOut={handleSignOutRequest} />
        </div>
        <div style={{ flex: 1, marginLeft: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
          <div className="upd-error-card">
            <span className="upd-error-icon">⚠️</span>
            <h2>Something went wrong</h2>
            <p>{error}</p>
            <button className="upd-btn upd-btn-primary" onClick={refetch}>
              Try Again
            </button>
          </div>
        </div>
        <ConfirmModal
          isOpen={showSignOutModal}
          title="Sign Out"
          message="Are you sure you want to sign out?"
          onConfirm={handleSignOutConfirm}
          onCancel={() => setShowSignOutModal(false)}
        />
      </div>
    );
  }

  return (
    <div className="upd-dashboard-layout">
      {/* Sign Out Confirm Modal */}
      <ConfirmModal
        isOpen={showSignOutModal}
        title="Sign Out"
        message="Are you sure you want to sign out of your account?"
        onConfirm={handleSignOutConfirm}
        onCancel={() => setShowSignOutModal(false)}
      />

      {/* Sidebar */}
      <div className="upd-sidebar-container">
        <NavigationSection onSignOut={handleSignOutRequest} />
      </div>

      {/* Main Content Area */}
      <div className="upd-main-content">
        <main className="upd-main">
          
        {paymentVerified && (
          <div style={{ background: '#dcfce3', color: '#166534', padding: '15px 20px', borderRadius: 8, marginBottom: 20, border: '1px solid #bbf7d0', fontWeight: 500 }}>
            🎉 Payment Successful! Your subscription is now active.
          </div>
        )}

        {/* ── Parent card ─────────────────────────────────────────── */}
        <section className="upd-parent-card">
          {loading ? (
            <Skeleton className="upd-parent-avatar-skel" />
          ) : (
            <div className="upd-parent-avatar">
              {parent?.photo_url ? (
                <img src={parent.photo_url} alt={parent.name} />
              ) : (
                <span>{parent?.name?.[0]?.toUpperCase() || "P"}</span>
              )}
            </div>
          )}
          <div className="upd-parent-info">
            {loading ? (
              <>
                <Skeleton className="upd-skel-line upd-skel-h3" />
                <Skeleton className="upd-skel-line upd-skel-p" />
              </>
            ) : (
              <>
                <p className="upd-parent-label">Parent Account</p>
                <h3 className="upd-parent-name">{parent?.name || "—"}</h3>
              </>
            )}
          </div>
        </section>

        {/* ── Child section ───────────────────────────────────────── */}
        <section className="upd-child-section">
          {/* No child linked */}
          {!loading && children.length === 0 && (
            <div className="upd-no-child">
              <span className="upd-no-child-icon">👧</span>
              <h2>No child linked yet</h2>
              <p>
                Link a child account to see their progress and achievements
                here.
              </p>
              <Link to="/setup1" className="upd-btn upd-btn-primary">
                Link a Child Account
              </Link>
            </div>
          )}

          {/* Child card */}
          {(loading || children.length > 0) && (
            <div className="upd-child-card">
              {children.length > 1 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, padding: '0 10px' }}>
                  <button 
                    onClick={() => setActiveChildIndex(Math.max(0, activeChildIndex - 1))}
                    disabled={activeChildIndex === 0}
                    style={{ padding: '8px 15px', borderRadius: 8, border: '1px solid #ccc', background: activeChildIndex === 0 ? '#f1f5f9' : '#fff', cursor: activeChildIndex === 0 ? 'not-allowed' : 'pointer' }}
                  >
                    ◀ Prev
                  </button>
                  <strong style={{ color: '#475569' }}>Child {activeChildIndex + 1} of {children.length}</strong>
                  <button 
                    onClick={() => setActiveChildIndex(Math.min(children.length - 1, activeChildIndex + 1))}
                    disabled={activeChildIndex === children.length - 1}
                    style={{ padding: '8px 15px', borderRadius: 8, border: '1px solid #ccc', background: activeChildIndex === children.length - 1 ? '#f1f5f9' : '#fff', cursor: activeChildIndex === children.length - 1 ? 'not-allowed' : 'pointer' }}
                  >
                    Next ▶
                  </button>
                </div>
              )}
              {/* Avatar + name + level */}
              <div className="upd-child-hero">
                {loading ? (
                  <Skeleton className="upd-child-avatar-skel" />
                ) : (
                  <div className="upd-child-avatar">
                    {child?.photo_url ? (
                      <img src={child.photo_url} alt={child.name} />
                    ) : (
                      <span>{child?.name?.[0]?.toUpperCase() || "C"}</span>
                    )}
                    <span className="upd-level-badge">
                      Lvl {loading ? "…" : child?.level ?? 1}
                    </span>
                  </div>
                )}
                <div className="upd-child-meta">
                  {loading ? (
                    <>
                      <Skeleton className="upd-skel-line upd-skel-h2" />
                      <Skeleton className="upd-skel-line upd-skel-p" />
                    </>
                  ) : (
                    <>
                      <h2 className="upd-child-name">{child?.name}</h2>
                      <p className="upd-child-sublabel">Child Profile</p>
                    </>
                  )}
                </div>
              </div>

              {/* Progress bars */}
              <div className="upd-section">
                <h4 className="upd-section-title">Learning Progress</h4>
                {loading ? (
                  [1, 2, 3].map((i) => (
                    <div key={i} className="upd-progress-row">
                      <Skeleton className="upd-skel-line upd-skel-label" />
                      <Skeleton className="upd-skel-bar" />
                    </div>
                  ))
                ) : child?.progress?.length > 0 ? (
                  child.progress.map((item) => (
                    <div key={item.label} className="upd-progress-row">
                      <div className="upd-progress-header">
                        <span className="upd-progress-label">{item.label}</span>
                        <span className="upd-progress-pct">{item.value}%</span>
                      </div>
                      <div className="upd-progress-track">
                        <div
                          className="upd-progress-fill"
                          style={{ width: `${item.value}%` }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="upd-empty-text">
                    No games played yet. Start learning to see progress!
                  </p>
                )}
              </div>

              {/* Activity Chart */}
              <div className="upd-section">
                <h4 className="upd-section-title">Daily Activity (Minutes)</h4>
                {loading ? (
                  <Skeleton className="upd-skel-chart" style={{ height: 200 }} />
                ) : child?.activity?.length > 0 ? (
                  <div style={{ width: '100%', height: 250, marginTop: 16 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={child.activity.map(a => ({
                        date: new Date(a.date).toLocaleDateString(undefined, {weekday:'short', month:'short', day:'numeric'}) || a.date,
                        Study: Math.round(a.study_seconds / 60),
                        Play: Math.round(a.play_seconds / 60)
                      }))} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="date" tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} />
                        <YAxis tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} />
                        <Tooltip cursor={{fill: 'rgba(0,0,0,0.04)'}} />
                        <Legend iconType="circle" wrapperStyle={{fontSize: 14}} />
                        <Bar dataKey="Study" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                        <Bar dataKey="Play" fill="#14b8a6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="upd-empty-text">
                    No activity recorded yet for the past 7 days.
                  </p>
                )}
              </div>

              {/* Badges */}
              <div className="upd-section">
                <h4 className="upd-section-title">Achievements</h4>
                {loading ? (
                  <div className="upd-badges-grid">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="upd-badge-skel" />
                    ))}
                  </div>
                ) : child?.badges?.length > 0 ? (
                  <div className="upd-badges-grid">
                    {child.badges.map((badge) => (
                      <div key={badge.id} className="upd-badge-card">
                        <span className="upd-badge-icon">
                          {BADGE_ICONS[badge.id] || "🏅"}
                        </span>
                        <span className="upd-badge-name">{badge.name}</span>
                        <span className="upd-badge-desc">
                          {badge.description}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="upd-empty-text">
                    Complete games to earn badges!
                  </p>
                )}
              </div>
            </div>
          )}
          
          {/* Add Another Child Button */}
          {!loading && children.length > 0 && canAddChild && (
            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'center' }}>
              <Link to="/setup1" className="upd-btn upd-btn-outline" style={{ display: 'inline-block', padding: '10px 20px', borderRadius: 12, border: '2px dashed #cbd5e1', color: '#64748b', textDecoration: 'none', fontWeight: 600 }}>
                + Link Another Child
              </Link>
            </div>
          )}
        </section>
      </main>
      </div>
    </div>
  );
}