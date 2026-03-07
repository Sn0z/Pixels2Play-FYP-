import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/authContext";
import { db } from "../../FireBase/firebase";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  getDoc,
} from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth } from "../../FireBase/firebase";
import "./AdminPanel.css";

const BLANK_COURSE = {
  name: "",
  duration: "",
  details: "",
  price: "",
  category: "",
  ageRange: "",
  thumbnail: "",
};

export default function AdminPanel() {
  const navigate = useNavigate();
  const { userProfile, currentUser, profileLoading } = useAuth();
  const [page, setPage] = useState("dashboard");
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState(null);
  const [course, setCourse] = useState(BLANK_COURSE);
  const [alert, setAlert] = useState(null); // { type: 'success'|'error', msg }

  /* ── Auth / Role guard ─────────────────────────────────────── */
  // While Django profile is still loading, show spinner.
  // Once loaded, kick non-admins back to home.
  if (profileLoading) {
    return (
      <div className="ap-denied-screen">
        <div className="ap-denied-card">
          <div className="ap-spinner" />
          <p style={{ color: "#63748a", fontSize: "0.9rem" }}>
            Verifying access…
          </p>
        </div>
      </div>
    );
  }

  if (userProfile && userProfile.role !== "admin") {
    return (
      <div className="ap-denied-screen">
        <div className="ap-denied-card">
          <span className="ap-denied-icon">🚫</span>
          <h2>Access Denied</h2>
          <p>You don't have permission to view this page.</p>
          <button className="ap-btn ap-btn-primary" onClick={() => navigate("/")}>
            Go Home
          </button>
        </div>
      </div>
    );
  }

  /* ── Data loaders ──────────────────────────────────────────── */
  const loadCourses = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "courses"));
      setCourses(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch {
      showAlert("error", "Failed to load courses.");
    }
    setLoading(false);
  };

  useEffect(() => {
    loadCourses();
  }, []);

  /* ── Helpers ───────────────────────────────────────────────── */
  const showAlert = (type, msg) => {
    setAlert({ type, msg });
    setTimeout(() => setAlert(null), 3500);
  };

  const handleInput = (e) =>
    setCourse({ ...course, [e.target.name]: e.target.value });

  const saveCourse = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, "courses"), course);
      showAlert("success", "Course added successfully!");
      setCourse(BLANK_COURSE);
      setPage("courses");
      loadCourses();
    } catch {
      showAlert("error", "Failed to add course.");
    }
  };

  const deleteCourse = async (id) => {
    if (!window.confirm("Delete this course? This cannot be undone.")) return;
    try {
      await deleteDoc(doc(db, "courses", id));
      showAlert("success", "Course deleted.");
      loadCourses();
    } catch {
      showAlert("error", "Failed to delete course.");
    }
  };

  const loadSingleCourse = async (id) => {
    const snap = await getDoc(doc(db, "courses", id));
    setCourse(snap.data() || BLANK_COURSE);
    setEditId(id);
    setPage("edit");
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    try {
      await updateDoc(doc(db, "courses", editId), course);
      showAlert("success", "Course updated successfully!");
      setPage("courses");
      loadCourses();
    } catch {
      showAlert("error", "Failed to update course.");
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    navigate("/login");
  };

  /* ── Sidebar Nav ───────────────────────────────────────────── */
  const navItems = [
    { id: "dashboard", icon: "🏠", label: "Dashboard" },
    { id: "courses", icon: "📚", label: "All Courses" },
    { id: "add", icon: "➕", label: "Add Course" },
    { id: "modules", icon: "🎬", label: "Manage Modules", onClick: () => navigate("/admin/modules") },
  ];

  /* ── Stat counts ───────────────────────────────────────────── */
  const cats = [...new Set(courses.map((c) => c.category).filter(Boolean))];
  const totalRevenue = courses.reduce((sum, c) => sum + (parseFloat(c.price) || 0), 0);

  /* ═══════════════════════════════════════════════════════════ */
  return (
    <div className="ap-shell">
      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside className="ap-sidebar">
        <div className="ap-sidebar-brand">
          <div className="ap-brand-icon">🎮</div>
          <div>
            <div className="ap-brand-title">Pixels2Play</div>
            <div className="ap-brand-sub">Admin Panel</div>
          </div>
        </div>

        <nav className="ap-nav">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`ap-nav-item ${page === item.id ? "active" : ""}`}
              onClick={item.onClick || (() => setPage(item.id))}
            >
              <span className="ap-nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="ap-sidebar-footer">
          <button className="ap-sign-out-btn" onClick={handleSignOut}>
            🚪 Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────── */}
      <div className="ap-main">
        {/* Top Bar */}
        <header className="ap-topbar">
          <span className="ap-topbar-title">
            {page === "dashboard" && "Dashboard Overview"}
            {page === "courses" && "All Courses"}
            {page === "add" && "Add New Course"}
            {page === "edit" && "Edit Course"}
          </span>
          <div className="ap-topbar-right">
            <span className="ap-topbar-email">
              {currentUser?.email || "Admin"}
            </span>
            <span className="ap-admin-badge">🛡️ Admin</span>
          </div>
        </header>

        {/* Content */}
        <main className="ap-content">
          {/* Alert Banner */}
          {alert && (
            <div className={`ap-alert ap-alert-${alert.type}`}>
              {alert.type === "success" ? "✅" : "❌"} {alert.msg}
            </div>
          )}

          {/* ── DASHBOARD ─────────────────────────────────── */}
          {page === "dashboard" && (
            <>
              <div className="ap-page-header">
                <h1 className="ap-page-title">Welcome back, Admin 👋</h1>
                <p className="ap-page-sub">Here's what's happening on Pixels2Play.</p>
              </div>

              {/* Stat Cards */}
              <div className="ap-stats-grid">
                <div className="ap-stat-card">
                  <div className="ap-stat-icon purple">📚</div>
                  <div>
                    <div className="ap-stat-value">{courses.length}</div>
                    <div className="ap-stat-label">Total Courses</div>
                  </div>
                </div>
                <div className="ap-stat-card">
                  <div className="ap-stat-icon blue">🏷️</div>
                  <div>
                    <div className="ap-stat-value">{cats.length}</div>
                    <div className="ap-stat-label">Categories</div>
                  </div>
                </div>
                <div className="ap-stat-card">
                  <div className="ap-stat-icon green">💰</div>
                  <div>
                    <div className="ap-stat-value">${totalRevenue.toFixed(0)}</div>
                    <div className="ap-stat-label">Total Value</div>
                  </div>
                </div>
                <div className="ap-stat-card">
                  <div className="ap-stat-icon amber">🎬</div>
                  <div>
                    <div className="ap-stat-value">—</div>
                    <div className="ap-stat-label">Modules</div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="ap-section-header">
                <span className="ap-section-title">Quick Actions</span>
              </div>
              <div className="ap-actions-grid">
                <button className="ap-action-card" onClick={() => setPage("courses")}>
                  <span className="ap-action-icon">📋</span>
                  <div className="ap-action-label">View All Courses</div>
                  <div className="ap-action-desc">Browse, edit or delete courses</div>
                </button>
                <button className="ap-action-card" onClick={() => setPage("add")}>
                  <span className="ap-action-icon">➕</span>
                  <div className="ap-action-label">Add New Course</div>
                  <div className="ap-action-desc">Create a brand-new course</div>
                </button>
                <button className="ap-action-card" onClick={() => navigate("/admin/modules")}>
                  <span className="ap-action-icon">🎬</span>
                  <div className="ap-action-label">Manage Modules</div>
                  <div className="ap-action-desc">Add or edit video modules</div>
                </button>
              </div>
            </>
          )}

          {/* ── ALL COURSES ───────────────────────────────── */}
          {page === "courses" && (
            <>
              <div className="ap-page-header">
                <h1 className="ap-page-title">All Courses</h1>
                <p className="ap-page-sub">{courses.length} course{courses.length !== 1 ? "s" : ""} in your library</p>
              </div>

              <div className="ap-section-header">
                <span className="ap-section-title">Course Library</span>
                <button className="ap-btn ap-btn-primary" onClick={() => setPage("add")}>
                  ➕ Add Course
                </button>
              </div>

              {loading ? (
                <div className="ap-denied-screen" style={{ minHeight: 200, background: "transparent" }}>
                  <div className="ap-spinner" />
                </div>
              ) : courses.length === 0 ? (
                <div className="ap-empty">
                  <span className="ap-empty-icon">📭</span>
                  <h3>No courses yet</h3>
                  <p>Add your first course to get started.</p>
                </div>
              ) : (
                <div className="ap-courses-grid">
                  {courses.map((c) => (
                    <div key={c.id} className="ap-course-card">
                      {c.thumbnail ? (
                        <img
                          src={c.thumbnail}
                          alt={c.name}
                          className="ap-course-thumb"
                          onError={(e) => {
                            e.target.style.display = "none";
                            e.target.nextSibling.style.display = "flex";
                          }}
                        />
                      ) : null}
                      <div
                        className="ap-course-thumb"
                        style={{ display: c.thumbnail ? "none" : "flex" }}
                      >
                        📚
                      </div>
                      <div className="ap-course-body">
                        <div className="ap-course-name" title={c.name}>
                          {c.name || "Untitled Course"}
                        </div>
                        <div className="ap-course-meta">
                          {c.category && (
                            <span className="ap-course-tag">{c.category}</span>
                          )}
                          {c.ageRange && (
                            <span className="ap-course-tag blue">
                              {c.ageRange}
                            </span>
                          )}
                          {c.duration && (
                            <span className="ap-course-tag green">
                              ⏱ {c.duration}
                            </span>
                          )}
                        </div>
                        <div className="ap-course-price">
                          {c.price ? `$${c.price}` : "Free"}
                        </div>
                        <div className="ap-course-actions">
                          <button
                            className="ap-btn ap-btn-outline ap-btn-sm"
                            onClick={() => loadSingleCourse(c.id)}
                          >
                            ✏️ Edit
                          </button>
                          <button
                            className="ap-btn ap-btn-danger ap-btn-sm"
                            onClick={() => deleteCourse(c.id)}
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── ADD COURSE ────────────────────────────────── */}
          {page === "add" && (
            <>
              <div className="ap-page-header">
                <h1 className="ap-page-title">Add New Course</h1>
                <p className="ap-page-sub">Fill in the details to publish a new course.</p>
              </div>

              <div className="ap-form-card">
                <form onSubmit={saveCourse}>
                  <div className="ap-form-grid">
                    <div className="ap-form-group">
                      <label className="ap-form-label">Course Name *</label>
                      <input
                        className="ap-form-input"
                        name="name"
                        placeholder="e.g. Intro to Machine Learning"
                        required
                        value={course.name}
                        onChange={handleInput}
                      />
                    </div>
                    <div className="ap-form-group">
                      <label className="ap-form-label">Duration</label>
                      <input
                        className="ap-form-input"
                        name="duration"
                        placeholder="e.g. 4 weeks"
                        value={course.duration}
                        onChange={handleInput}
                      />
                    </div>
                    <div className="ap-form-group">
                      <label className="ap-form-label">Price (USD)</label>
                      <input
                        className="ap-form-input"
                        name="price"
                        type="number"
                        min="0"
                        placeholder="e.g. 49"
                        value={course.price}
                        onChange={handleInput}
                      />
                    </div>
                    <div className="ap-form-group">
                      <label className="ap-form-label">Category</label>
                      <input
                        className="ap-form-input"
                        name="category"
                        placeholder="e.g. AI & Robotics"
                        value={course.category}
                        onChange={handleInput}
                      />
                    </div>
                    <div className="ap-form-group">
                      <label className="ap-form-label">Age Range</label>
                      <input
                        className="ap-form-input"
                        name="ageRange"
                        placeholder="e.g. 8–12"
                        value={course.ageRange}
                        onChange={handleInput}
                      />
                    </div>
                    <div className="ap-form-group">
                      <label className="ap-form-label">Thumbnail URL</label>
                      <input
                        className="ap-form-input"
                        name="thumbnail"
                        placeholder="https://..."
                        value={course.thumbnail}
                        onChange={handleInput}
                      />
                    </div>
                    <div className="ap-form-group full-width">
                      <label className="ap-form-label">Details / Description</label>
                      <textarea
                        className="ap-form-textarea"
                        name="details"
                        placeholder="What will kids learn in this course?"
                        value={course.details}
                        onChange={handleInput}
                      />
                    </div>
                  </div>
                  <div className="ap-form-actions">
                    <button type="submit" className="ap-btn ap-btn-primary">
                      🚀 Publish Course
                    </button>
                    <button
                      type="button"
                      className="ap-btn ap-btn-outline"
                      onClick={() => { setCourse(BLANK_COURSE); setPage("dashboard"); }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </>
          )}

          {/* ── EDIT COURSE ───────────────────────────────── */}
          {page === "edit" && (
            <>
              <div className="ap-page-header">
                <h1 className="ap-page-title">Edit Course</h1>
                <p className="ap-page-sub">Update the course details below.</p>
              </div>

              <div className="ap-form-card">
                <form onSubmit={saveEdit}>
                  <div className="ap-form-grid">
                    <div className="ap-form-group">
                      <label className="ap-form-label">Course Name *</label>
                      <input
                        className="ap-form-input"
                        name="name"
                        required
                        value={course.name || ""}
                        onChange={handleInput}
                      />
                    </div>
                    <div className="ap-form-group">
                      <label className="ap-form-label">Duration</label>
                      <input
                        className="ap-form-input"
                        name="duration"
                        value={course.duration || ""}
                        onChange={handleInput}
                      />
                    </div>
                    <div className="ap-form-group">
                      <label className="ap-form-label">Price (USD)</label>
                      <input
                        className="ap-form-input"
                        name="price"
                        type="number"
                        min="0"
                        value={course.price || ""}
                        onChange={handleInput}
                      />
                    </div>
                    <div className="ap-form-group">
                      <label className="ap-form-label">Category</label>
                      <input
                        className="ap-form-input"
                        name="category"
                        value={course.category || ""}
                        onChange={handleInput}
                      />
                    </div>
                    <div className="ap-form-group">
                      <label className="ap-form-label">Age Range</label>
                      <input
                        className="ap-form-input"
                        name="ageRange"
                        value={course.ageRange || ""}
                        onChange={handleInput}
                      />
                    </div>
                    <div className="ap-form-group">
                      <label className="ap-form-label">Thumbnail URL</label>
                      <input
                        className="ap-form-input"
                        name="thumbnail"
                        value={course.thumbnail || ""}
                        onChange={handleInput}
                      />
                    </div>
                    <div className="ap-form-group full-width">
                      <label className="ap-form-label">Details / Description</label>
                      <textarea
                        className="ap-form-textarea"
                        name="details"
                        value={course.details || ""}
                        onChange={handleInput}
                      />
                    </div>
                  </div>
                  <div className="ap-form-actions">
                    <button type="submit" className="ap-btn ap-btn-primary">
                      💾 Save Changes
                    </button>
                    <button
                      type="button"
                      className="ap-btn ap-btn-outline"
                      onClick={() => setPage("courses")}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
