import React from "react";
import { Link } from "react-router-dom";
import { useChildProfile } from "../../hooks/useChildProfile";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
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

import { NavigationSection } from "./NavigationSection";

export default function UserProfileDashboardSection() {
  const { parent, child, loading, error, accessDenied, refetch } =
    useChildProfile();

  /* Access denied ------------------------------------------------ */
  if (accessDenied) {
    return (
      <div className="flex bg-[#f8fafc] min-h-screen">
        <div className="w-[280px] flex-shrink-0 fixed h-screen z-50">
          <NavigationSection />
        </div>
        <div className="flex-1 ml-[280px] upd-shell upd-center" style={{ minHeight: '100vh', background: 'transparent' }}>
          <div className="upd-denied-card">
            <span className="upd-denied-icon">🔒</span>
            <h2>Access Restricted</h2>
            <p>This dashboard is only visible to linked parents.</p>
            <Link to="/login" className="upd-btn upd-btn-primary">
              Log in as a Parent
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* Error state -------------------------------------------------- */
  if (error && !loading) {
    return (
      <div className="flex bg-[#f8fafc] min-h-screen">
        <div className="w-[280px] flex-shrink-0 fixed h-screen z-50">
          <NavigationSection />
        </div>
        <div className="flex-1 ml-[280px] upd-shell upd-center" style={{ minHeight: '100vh', background: 'transparent' }}>
          <div className="upd-error-card">
            <span className="upd-error-icon">⚠️</span>
            <h2>Something went wrong</h2>
            <p>{error}</p>
            <button className="upd-btn upd-btn-primary" onClick={refetch}>
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="upd-dashboard-layout">
      {/* Sidebar */}
      <div className="upd-sidebar-container">
        <NavigationSection />
      </div>

      {/* Main Content Area */}
      <div className="upd-main-content">
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
        </section>
      </main>
      </div>
    </div>
  );
}