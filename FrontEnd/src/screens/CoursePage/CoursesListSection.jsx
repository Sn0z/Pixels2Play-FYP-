import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import "./CoursesListSection.css";

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api").replace(/\/$/, "");

const COURSES_URL = `${API_BASE}/courses/`;
const SUB_STATUS_URL = `${API_BASE}/payments/subscription-status/`;

const auth = getAuth();

export default function CoursesListSection() {
  const navigate = useNavigate();
  const [sortValue, setSortValue] = useState("");
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Subscription state
  const [subscribed, setSubscribed] = useState(false);
  const [subChecked, setSubChecked] = useState(false);

  // ── Check subscription status when user is available ──────────────────
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setSubscribed(false);
        setSubChecked(true);
        return;
      }
      try {
        const token = await user.getIdToken();
        const res = await fetch(SUB_STATUS_URL, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setSubscribed(!!data.subscribed);
        }
      } catch {
        setSubscribed(false);
      } finally {
        setSubChecked(true);
      }
    });
    return () => unsubscribe();
  }, []);

  // ── Fetch courses ─────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function fetchCourses() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(COURSES_URL);
        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        const data = await res.json();
        if (!cancelled) setCourses(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!cancelled) setError("Failed to load courses. Please try again.");
        console.error("[CoursesListSection] fetch error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchCourses();
    return () => { cancelled = true; };
  }, []);

  // ── Sort ───────────────────────────────────────────────────────────────
  const sortedCourses = [...courses].sort((a, b) => {
    if (sortValue === "popular") return (b.enrolled || 0) - (a.enrolled || 0);
    if (sortValue === "rating") return (b.rating || 0) - (a.rating || 0);
    return 0;
  });

  const getTitle = (c) => c.title || c.name || "Untitled Course";
  const getImage = (c) => c.thumbnail || c.course_image || "https://c.animaapp.com/miujjzjc7Bh8SC/img/rectangle-5.png";
  const getDesc = (c) => c.description || c.details || c.short_description || "";

  const difficultyBadge = {
    beginner: { label: "Beginner", color: "#10b981" },
    intermediate: { label: "Intermediate", color: "#3b82f6" },
    advanced: { label: "Advanced", color: "#8b5cf6" },
  };

  return (
    <section className="courses-list-section">
      {/* ── Subscription Banner ── */}
      {subChecked && !subscribed && (
        <div className="sub-banner">
          <span>🔒 Subscribe to unlock all courses</span>
          <button className="sub-banner-btn" onClick={() => navigate("/pricing")}>
            View Plans →
          </button>
        </div>
      )}

      {/* ── Header ── */}
      <header className="courses-header">
        <div className="header-left">
          <h2 className="courses-title">All Courses</h2>
          <p className="courses-subtitle">
            {loading ? "Loading…" : `Showing ${sortedCourses.length} course${sortedCourses.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <div className="sort-box">
          <span className="sort-label">Sort by:</span>
          <select
            className="sort-select"
            value={sortValue}
            onChange={(e) => setSortValue(e.target.value)}
          >
            <option value="">Default</option>
            <option value="newest">Newest</option>
            <option value="popular">Most Popular</option>
            <option value="rating">Highest Rated</option>
          </select>
        </div>
      </header>

      {/* ── Grid ── */}
      <div className="courses-grid">
        {loading ? (
          <p className="courses-placeholder">Loading courses…</p>
        ) : error ? (
          <p className="courses-placeholder" style={{ color: "#e53e3e" }}>{error}</p>
        ) : sortedCourses.length === 0 ? (
          <p className="courses-placeholder">No courses available.</p>
        ) : (
          sortedCourses.map((course, index) => {
            const locked = !subscribed;
            const badge = difficultyBadge[course.difficulty] || difficultyBadge.beginner;
            return (
              <div
                key={course.id}
                className={`course-card ${locked ? "course-card-locked" : ""}`}
                style={{ animationDelay: `${index * 80}ms` }}
              >
                {/* Lock overlay */}
                {locked && (
                  <div className="lock-overlay">
                    <div className="lock-badge">
                      <span>🔒</span>
                      <p>Subscribe to unlock</p>
                      <button onClick={() => navigate("/pricing")}>View Plans</button>
                    </div>
                  </div>
                )}

                {/* Thumbnail */}
                <div className="course-image">
                  <img src={getImage(course)} alt={getTitle(course)} loading="lazy" />
                  {/* Difficulty badge */}
                  <span className="difficulty-tag" style={{ background: badge.color }}>
                    {badge.label}
                  </span>
                </div>

                {/* Card body */}
                <div className="course-content">
                  {course.category && <p className="clist-category">{course.category}</p>}
                  <h3 className="clist-title">{getTitle(course)}</h3>
                  {getDesc(course) && <p className="clist-description">{getDesc(course)}</p>}

                  {/* Module count */}
                  {course.module_count > 0 && (
                    <p className="course-meta">
                      📦 {course.module_count} module{course.module_count !== 1 ? "s" : ""}
                      {course.ageGroup && ` · 👦 Ages ${course.ageGroup}`}
                    </p>
                  )}

                  <button
                    className="details-btn"
                    disabled={locked}
                    onClick={() => !locked && navigate(`/coursedetails/${course.id}`)}
                  >
                    {locked ? "🔒 Locked" : "View Details"}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
