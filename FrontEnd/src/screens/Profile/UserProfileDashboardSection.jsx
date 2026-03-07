import React from "react";
import { Link } from "react-router-dom";
import { useChildProfile } from "../../hooks/useChildProfile";
import "./UserProfileDashboardSection.css";

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

/* ─── Main component ─────────────────────────────────────── */
export default function UserProfileDashboardSection() {
  const { parent, child, loading, error, accessDenied, refetch } =
    useChildProfile();

  /* Access denied ------------------------------------------------ */
  if (accessDenied) {
    return (
      <div className="upd-shell upd-center">
        <div className="upd-denied-card">
          <span className="upd-denied-icon">🔒</span>
          <h2>Access Restricted</h2>
          <p>This dashboard is only visible to linked parents.</p>
          <Link to="/login" className="upd-btn upd-btn-primary">
            Log in as a Parent
          </Link>
        </div>
      </div>
    );
  }

  /* Error state -------------------------------------------------- */
  if (error && !loading) {
    return (
      <div className="upd-shell upd-center">
        <div className="upd-error-card">
          <span className="upd-error-icon">⚠️</span>
          <h2>Something went wrong</h2>
          <p>{error}</p>
          <button className="upd-btn upd-btn-primary" onClick={refetch}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="upd-shell">
      {/* ── Page header ─────────────────────────────────────────── */}
      <header className="upd-header">
        <div className="upd-header-inner">
          <Link to="/" className="upd-logo">
            <span className="upd-logo-icon">🎮</span>
            <span>Pixels2Play</span>
          </Link>
          <nav className="upd-nav">
            <Link to="/settings" className="upd-btn upd-btn-outline upd-btn-sm">
              ✏️ Edit Child Profile
            </Link>
          </nav>
        </div>
      </header>

      <main className="upd-main">
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
          {!loading && !child && (
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
          {(loading || child) && (
            <div className="upd-child-card">
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
        </section>
      </main>
    </div>
  );
}