import React, { useState, useEffect, useCallback } from "react";
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
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth } from "../../FireBase/firebase";
import "./AdminPanel.css";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api").replace(/\/$/, "");

const BLANK_COURSE = {
  name: "", duration: "", details: "", price: "", category: "", ageRange: "", thumbnail: "",
};

/* ── SVG Icons (no emoji) ───────────────────────────────────── */
const Icon = {
  Dashboard: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
    </svg>
  ),
  Courses: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
    </svg>
  ),
  Add: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
    </svg>
  ),
  Modules: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
    </svg>
  ),
  Users: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  Payments: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>
    </svg>
  ),
  Analytics: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
    </svg>
  ),
  SignOut: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
  Edit: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  ),
  Delete: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
    </svg>
  ),
  Search: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  ),
  Refresh: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
    </svg>
  ),
  Check: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  X: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  Shield: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
  Alert: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  ),
};

/* ── Confirm Modal ──────────────────────────────────────────── */
function ConfirmModal({ title, message, onConfirm, onCancel, type = "danger" }) {
  const isDelete = type === "danger";
  return (
    <div className="ap-modal-backdrop">
      <div className="ap-modal">
        <div className={`ap-modal-icon ${isDelete ? "danger" : "primary"}`}>
          {isDelete ? <Icon.Delete /> : <Icon.SignOut />}
        </div>
        <h3 className="ap-modal-title">{title}</h3>
        <p className="ap-modal-msg">{message}</p>
        <div className="ap-modal-actions">
          <button className="ap-btn ap-btn-outline" onClick={onCancel}>Cancel</button>
          <button className={`ap-btn ${isDelete ? "ap-btn-danger-solid" : "ap-btn-primary"}`} onClick={onConfirm}>
            {isDelete ? "Delete" : "Sign Out"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Toast Notification ─────────────────────────────────────── */
function Toast({ alert }) {
  if (!alert) return null;
  return (
    <div className={`ap-toast ap-toast-${alert.type}`}>
      <span className="ap-toast-icon">
        {alert.type === "success" ? <Icon.Check /> : <Icon.Alert />}
      </span>
      {alert.msg}
    </div>
  );
}

/* ── Stat Card ─────────────────────────────────────────────── */
function StatCard({ label, value, sub, accent, icon }) {
  return (
    <div className={`ap-stat-card ap-stat-card--${accent}`}>
      <div className={`ap-stat-icon ap-stat-icon--${accent}`}>{icon}</div>
      <div className="ap-stat-body">
        <div className="ap-stat-value">{value ?? "—"}</div>
        <div className="ap-stat-label">{label}</div>
        {sub && <div className="ap-stat-sub">{sub}</div>}
      </div>
    </div>
  );
}

/* ── Role Badge ─────────────────────────────────────────────── */
function RoleBadge({ role }) {
  const map = {
    PARENT: "role-parent", CHILD: "role-child",
    ADMIN: "role-admin", UNASSIGNED: "role-unassigned",
    admin: "role-admin",
  };
  return <span className={`ap-role-badge ${map[role] || "role-unassigned"}`}>{role || "UNASSIGNED"}</span>;
}

/* ═══════════════════════════════════════════════════════════ */
export default function AdminPanel() {
  const navigate = useNavigate();
  const { userProfile, currentUser, profileLoading } = useAuth();
  const [page, setPage] = useState("dashboard");

  /* Courses */
  const [courses, setCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [editId, setEditId] = useState(null);
  const [course, setCourse] = useState(BLANK_COURSE);
  const [courseSearch, setCourseSearch] = useState("");

  /* Users */
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("ALL");

  /* Payments */
  const [payments, setPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);

  /* Analytics */
  const [analytics, setAnalytics] = useState(null);
  const [completionRates, setCompletionRates] = useState([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  /* Modules count */
  const [moduleCount, setModuleCount] = useState(null);

  /* UI state */
  const [alert, setAlert] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);

  /* ── Helpers ────────────────────────────────────────────── */
  const showAlert = (type, msg) => {
    setAlert({ type, msg });
    setTimeout(() => setAlert(null), 3500);
  };

  /* ── Data loaders ───────────────────────────────────────── */
  const loadCourses = useCallback(async () => {
    setCoursesLoading(true);
    try {
      const snap = await getDocs(collection(db, "courses"));
      setCourses(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch {
      showAlert("error", "Failed to load courses.");
    }
    setCoursesLoading(false);
  }, []);

  const loadModuleCount = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/courses/modules/`);
      if (res.ok) {
        const data = await res.json();
        setModuleCount(Array.isArray(data) ? data.length : null);
      }
    } catch { /* silent */ }
  }, []);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const snap = await getDocs(query(collection(db, "users"), orderBy("created_at", "desc"), limit(200)));
      setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch {
      showAlert("error", "Failed to load users.");
    }
    setUsersLoading(false);
  }, []);

  const loadPayments = useCallback(async () => {
    setPaymentsLoading(true);
    try {
      const snap = await getDocs(query(collection(db, "payments"), orderBy("created_at", "desc"), limit(100)));
      setPayments(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch {
      showAlert("error", "Failed to load payments.");
    }
    setPaymentsLoading(false);
  }, []);

  const loadAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const headers = { Authorization: `Bearer ${token}` };
      const [engRes, crRes] = await Promise.all([
        fetch(`${API_BASE}/analytics/engagement/`, { headers }),
        fetch(`${API_BASE}/analytics/completion-rates/`, { headers }),
      ]);
      if (engRes.ok) setAnalytics(await engRes.json());
      if (crRes.ok) setCompletionRates(await crRes.json());
    } catch {
      showAlert("error", "Failed to load analytics.");
    }
    setAnalyticsLoading(false);
  }, []);

  useEffect(() => {
    loadCourses();
    loadModuleCount();
  }, [loadCourses, loadModuleCount]);

  useEffect(() => {
    if (page === "users" && users.length === 0) loadUsers();
    if (page === "payments" && payments.length === 0) loadPayments();
    if (page === "analytics" && !analytics) loadAnalytics();
  }, [page]);

  /* ── Auth guard ─────────────────────────────────────────── */
  if (profileLoading) {
    return (
      <div className="ap-denied-screen">
        <div className="ap-denied-card">
          <div className="ap-spinner" />
          <p style={{ color: "#63748a", fontSize: "0.9rem", marginTop: "0.5rem" }}>Verifying access…</p>
        </div>
      </div>
    );
  }

  if (userProfile && userProfile.role?.toLowerCase() !== "admin") {
    return (
      <div className="ap-denied-screen">
        <div className="ap-denied-card">
          <div className="ap-denied-icon-wrap"><Icon.Shield /></div>
          <h2>Access Denied</h2>
          <p>You do not have permission to view this page.</p>
          <button className="ap-btn ap-btn-primary" onClick={() => navigate("/")}>Go Home</button>
        </div>
      </div>
    );
  }

  /* ── Course CRUD ────────────────────────────────────────── */
  const handleInput = (e) => setCourse({ ...course, [e.target.name]: e.target.value });

  const saveCourse = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, "courses"), course);
      showAlert("success", "Course published successfully.");
      setCourse(BLANK_COURSE);
      setPage("courses");
      loadCourses();
    } catch {
      showAlert("error", "Failed to add course.");
    }
  };

  const deleteCourse = (id, name) => {
    setConfirmModal({
      title: "Delete Course",
      message: `Are you sure you want to delete "${name}"? This action cannot be undone.`,
      onConfirm: async () => {
        setConfirmModal(null);
        try {
          await deleteDoc(doc(db, "courses", id));
          showAlert("success", "Course deleted.");
          loadCourses();
        } catch {
          showAlert("error", "Failed to delete course.");
        }
      },
      onCancel: () => setConfirmModal(null),
    });
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
      showAlert("success", "Course updated.");
      setPage("courses");
      loadCourses();
    } catch {
      showAlert("error", "Failed to update course.");
    }
  };

  /* ── Sign out ───────────────────────────────────────────── */
  const handleSignOut = () => {
    setConfirmModal({
      title: "Sign Out",
      message: "Are you sure you want to sign out of the Admin Console?",
      type: "primary",
      onConfirm: async () => {
        setConfirmModal(null);
        await signOut(auth);
        navigate("/login");
      },
      onCancel: () => setConfirmModal(null),
    });
  };

  /* ── Derived stats ──────────────────────────────────────── */
  const cats = courses ? [...new Set(courses.map((c) => c?.category).filter(Boolean))] : [];
  const totalRevenue = courses ? courses.reduce((s, c) => s + (parseFloat(c?.price) || 0), 0) : 0;
  const filteredCourses = courses ? courses.filter((c) =>
    !courseSearch || (c?.name || "").toLowerCase().includes(courseSearch.toLowerCase()) ||
    (c?.category || "").toLowerCase().includes(courseSearch.toLowerCase())
  ) : [];

  const filteredUsers = users ? users.filter((u) => {
    const matchRole = userRoleFilter === "ALL" || (u?.role || "UNASSIGNED") === userRoleFilter;
    const matchSearch = !userSearch ||
      (u?.name || u?.username || "").toLowerCase().includes(userSearch.toLowerCase()) ||
      (u?.email || "").toLowerCase().includes(userSearch.toLowerCase());
    return matchRole && matchSearch;
  }) : [];

  const completedPayments = payments ? payments.filter((p) => p?.status === "COMPLETED") : [];
  const totalPaymentsValue = completedPayments.reduce((s, p) => s + (p?.amount || 0) / 100, 0); // paisa → Rs

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: <Icon.Dashboard /> },
    { id: "courses", label: "All Courses", icon: <Icon.Courses /> },
    { id: "add", label: "Add Course", icon: <Icon.Add /> },
    { id: "modules", label: "Manage Modules", icon: <Icon.Modules />, onClick: () => navigate("/admin/modules") },
    { id: "users", label: "Users", icon: <Icon.Users /> },
    { id: "payments", label: "Payments", icon: <Icon.Payments /> },
    { id: "analytics", label: "Analytics", icon: <Icon.Analytics /> },
  ];

  const pageTitle = {
    dashboard: "Dashboard", courses: "All Courses", add: "Add New Course",
    edit: "Edit Course", users: "User Management", payments: "Payments",
    analytics: "Analytics",
  }[page] || "";

  /* ═══════════════════════════════════════════════════════ */
  return (
    <div className="ap-shell">
      {confirmModal && <ConfirmModal {...confirmModal} />}
      <Toast alert={alert} />

      {/* ── Sidebar ──────────────────────────────────────── */}
      <aside className="ap-sidebar">
        <div className="ap-sidebar-brand">
          <img src="/Logo.png" alt="Pixels2Play" style={{ height: '36px', width: 'auto', objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
          <div>
            <div className="ap-brand-title">Pixels2Play</div>
            <div className="ap-brand-sub">Admin Console</div>
          </div>
        </div>

        <nav className="ap-nav">
          <div className="ap-nav-section-label">Main</div>
          {navItems.slice(0, 4).map((item) => (
            <button
              key={item.id}
              className={`ap-nav-item ${page === item.id ? "active" : ""}`}
              onClick={item.onClick || (() => setPage(item.id))}
            >
              <span className="ap-nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
          <div className="ap-nav-section-label" style={{ marginTop: "1rem" }}>Management</div>
          {navItems.slice(4).map((item) => (
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
          <div className="ap-sidebar-user">
            <div className="ap-sidebar-user-avatar">
              {(currentUser?.email || "A")[0].toUpperCase()}
            </div>
            <div className="ap-sidebar-user-info">
              <div className="ap-sidebar-user-email">{currentUser?.email || "Admin"}</div>
              <div className="ap-sidebar-user-role">Administrator</div>
            </div>
          </div>
          <button className="ap-sign-out-btn" onClick={handleSignOut}>
            <span className="ap-nav-icon"><Icon.SignOut /></span>
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main ─────────────────────────────────────────── */}
      <div className="ap-main">
        <header className="ap-topbar">
          <div className="ap-topbar-left">
            <span className="ap-topbar-title">{pageTitle}</span>
            {page === "courses" && (
              <span className="ap-topbar-count">{courses.length} total</span>
            )}
            {page === "users" && (
              <span className="ap-topbar-count">{users.length} total</span>
            )}
          </div>
          <div className="ap-topbar-right">
            <span className="ap-admin-badge">
              <span style={{ width: 12, height: 12 }}><Icon.Shield /></span>
              Admin
            </span>
          </div>
        </header>

        <main className="ap-content">

          {/* ── DASHBOARD ─────────────────────────────────── */}
          {page === "dashboard" && (
            <>
              <div className="ap-page-header">
                <h1 className="ap-page-title">Welcome back</h1>
                <p className="ap-page-sub">Here is what is happening on Pixels2Play today.</p>
              </div>

              <div className="ap-stats-grid">
                <StatCard label="Total Courses" value={courses.length} accent="purple" icon={<Icon.Courses />} />
                <StatCard label="Categories" value={cats.length} accent="blue" icon={<Icon.Modules />} />
                <StatCard label="Total Users" value={users.length || null} sub={users.length ? `${users.filter(u => u.role === "CHILD").length} children` : "Load users page"} accent="green" icon={<Icon.Users />} />
                <StatCard label="Video Modules" value={moduleCount} accent="amber" icon={<Icon.Analytics />} />
              </div>

              <div className="ap-dashboard-grid">
                {/* Quick Actions */}
                <div className="ap-panel">
                  <div className="ap-panel-header">
                    <span className="ap-panel-title">Quick Actions</span>
                  </div>
                  <div className="ap-actions-grid">
                    <button className="ap-action-card" onClick={() => setPage("courses")}>
                      <div className="ap-action-icon-wrap purple"><Icon.Courses /></div>
                      <div className="ap-action-label">View All Courses</div>
                      <div className="ap-action-desc">Browse, edit, or remove courses</div>
                    </button>
                    <button className="ap-action-card" onClick={() => setPage("add")}>
                      <div className="ap-action-icon-wrap blue"><Icon.Add /></div>
                      <div className="ap-action-label">Add New Course</div>
                      <div className="ap-action-desc">Publish a brand-new course</div>
                    </button>
                    <button className="ap-action-card" onClick={() => navigate("/admin/modules")}>
                      <div className="ap-action-icon-wrap green"><Icon.Modules /></div>
                      <div className="ap-action-label">Manage Modules</div>
                      <div className="ap-action-desc">Add or edit video modules</div>
                    </button>
                    <button className="ap-action-card" onClick={() => setPage("users")}>
                      <div className="ap-action-icon-wrap amber"><Icon.Users /></div>
                      <div className="ap-action-label">View Users</div>
                      <div className="ap-action-desc">Browse all registered users</div>
                    </button>
                    <button className="ap-action-card" onClick={() => setPage("payments")}>
                      <div className="ap-action-icon-wrap red"><Icon.Payments /></div>
                      <div className="ap-action-label">Payments</div>
                      <div className="ap-action-desc">Review subscription payments</div>
                    </button>
                    <button className="ap-action-card" onClick={() => setPage("analytics")}>
                      <div className="ap-action-icon-wrap teal"><Icon.Analytics /></div>
                      <div className="ap-action-label">Analytics</div>
                      <div className="ap-action-desc">Engagement and completion stats</div>
                    </button>
                  </div>
                </div>

                {/* Recent Courses */}
                <div className="ap-panel">
                  <div className="ap-panel-header">
                    <span className="ap-panel-title">Recent Courses</span>
                    <button className="ap-btn ap-btn-ghost ap-btn-sm" onClick={() => setPage("courses")}>View All</button>
                  </div>
                  {coursesLoading ? (
                    <div className="ap-inline-loader"><div className="ap-spinner-sm" /></div>
                  ) : courses.length === 0 ? (
                    <div className="ap-empty-inline">No courses yet. Add your first course.</div>
                  ) : (
                    <table className="ap-table">
                      <thead>
                        <tr>
                          <th>Name</th><th>Category</th><th>Price</th><th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {courses.slice(0, 5).map((c) => (
                          <tr key={c.id}>
                            <td className="ap-table-name">{c.name || "Untitled"}</td>
                            <td>{c.category ? <span className="ap-course-tag">{c.category}</span> : "—"}</td>
                            <td className="ap-table-price">{c.price ? `Rs. ${c.price}` : "Free"}</td>
                            <td>
                              <button className="ap-btn ap-btn-ghost ap-btn-sm" onClick={() => loadSingleCourse(c.id)}>Edit</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </>
          )}

          {/* ── ALL COURSES ───────────────────────────────── */}
          {page === "courses" && (
            <>
              <div className="ap-toolbar">
                <div className="ap-search-wrap">
                  <span className="ap-search-icon"><Icon.Search /></span>
                  <input
                    className="ap-search-input"
                    placeholder="Search courses by name or category…"
                    value={courseSearch}
                    onChange={(e) => setCourseSearch(e.target.value)}
                  />
                </div>
                <button className="ap-btn ap-btn-primary" onClick={() => setPage("add")}>
                  <span style={{ width: 16, height: 16 }}><Icon.Add /></span>
                  Add Course
                </button>
              </div>

              {coursesLoading ? (
                <div className="ap-loading-center"><div className="ap-spinner" /></div>
              ) : filteredCourses.length === 0 ? (
                <div className="ap-empty">
                  <div className="ap-empty-icon-wrap"><Icon.Courses /></div>
                  <h3>{courseSearch ? "No results found" : "No courses yet"}</h3>
                  <p>{courseSearch ? "Try a different search term." : "Add your first course to get started."}</p>
                </div>
              ) : (
                <div className="ap-courses-grid">
                  {filteredCourses.map((c) => (
                    <div key={c.id} className="ap-course-card">
                      {c.thumbnail ? (
                        <img src={c.thumbnail} alt={c.name} className="ap-course-thumb"
                          onError={(e) => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }} />
                      ) : null}
                      <div className="ap-course-thumb ap-course-thumb-placeholder" style={{ display: c.thumbnail ? "none" : "flex" }}>
                        <Icon.Courses />
                      </div>
                      <div className="ap-course-body">
                        <div className="ap-course-name" title={c.name}>{c.name || "Untitled Course"}</div>
                        <div className="ap-course-meta">
                          {c.category && <span className="ap-course-tag">{c.category}</span>}
                          {c.ageRange && <span className="ap-course-tag blue">Ages {c.ageRange}</span>}
                          {c.duration && <span className="ap-course-tag green">{c.duration}</span>}
                        </div>
                        <div className="ap-course-price">{c.price ? `Rs. ${c.price}` : "Free"}</div>
                        <div className="ap-course-actions">
                          <button className="ap-btn ap-btn-outline ap-btn-sm" onClick={() => loadSingleCourse(c.id)}>
                            <span style={{ width: 13, height: 13 }}><Icon.Edit /></span> Edit
                          </button>
                          <button className="ap-btn ap-btn-danger ap-btn-sm" onClick={() => deleteCourse(c.id, c.name)}>
                            <span style={{ width: 13, height: 13 }}><Icon.Delete /></span> Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── ADD / EDIT COURSE ─────────────────────────── */}
          {(page === "add" || page === "edit") && (
            <>
              <div className="ap-page-header">
                <h1 className="ap-page-title">{page === "add" ? "Add New Course" : "Edit Course"}</h1>
                <p className="ap-page-sub">{page === "add" ? "Fill in the details below to publish a new course." : "Update the course information below."}</p>
              </div>

              <div className="ap-form-card">
                <form onSubmit={page === "add" ? saveCourse : saveEdit}>
                  <div className="ap-form-grid">
                    {[
                      { name: "name", label: "Course Name", required: true, placeholder: "e.g. Intro to Python" },
                      { name: "duration", label: "Duration", placeholder: "e.g. 6 weeks" },
                      { name: "price", label: "Price (Rs.)", type: "number", min: "0", placeholder: "e.g. 999" },
                      { name: "category", label: "Category", placeholder: "e.g. Coding, AI, Robotics" },
                      { name: "ageRange", label: "Age Range", placeholder: "e.g. 8–12" },
                      { name: "thumbnail", label: "Thumbnail URL", placeholder: "https://…" },
                    ].map(({ name, label, required, ...rest }) => (
                      <div className="ap-form-group" key={name}>
                        <label className="ap-form-label">{label}{required && " *"}</label>
                        <input
                          className="ap-form-input"
                          name={name}
                          required={required}
                          value={course[name] || ""}
                          onChange={handleInput}
                          {...rest}
                        />
                      </div>
                    ))}
                    <div className="ap-form-group full-width">
                      <label className="ap-form-label">Description</label>
                      <textarea
                        className="ap-form-textarea"
                        name="details"
                        placeholder="What will kids learn in this course?"
                        value={course.details || ""}
                        onChange={handleInput}
                      />
                    </div>
                  </div>
                  <div className="ap-form-actions">
                    <button type="submit" className="ap-btn ap-btn-primary">
                      {page === "add" ? "Publish Course" : "Save Changes"}
                    </button>
                    <button type="button" className="ap-btn ap-btn-outline"
                      onClick={() => { setCourse(BLANK_COURSE); setPage(page === "add" ? "dashboard" : "courses"); }}>
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </>
          )}

          {/* ── USERS ─────────────────────────────────────── */}
          {page === "users" && (
            <>
              <div className="ap-toolbar">
                <div className="ap-search-wrap">
                  <span className="ap-search-icon"><Icon.Search /></span>
                  <input
                    className="ap-search-input"
                    placeholder="Search by name or email…"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                  />
                </div>
                <div className="ap-filter-group">
                  {["ALL", "PARENT", "CHILD", "ADMIN", "UNASSIGNED"].map((r) => (
                    <button
                      key={r}
                      className={`ap-filter-pill ${userRoleFilter === r ? "active" : ""}`}
                      onClick={() => setUserRoleFilter(r)}
                    >{r}</button>
                  ))}
                </div>
                <button className="ap-btn ap-btn-outline ap-btn-sm" onClick={loadUsers}>
                  <span style={{ width: 14, height: 14 }}><Icon.Refresh /></span> Refresh
                </button>
              </div>

              {usersLoading ? (
                <div className="ap-loading-center"><div className="ap-spinner" /></div>
              ) : (
                <div className="ap-panel">
                  <table className="ap-table ap-table-full">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Auth</th>
                        <th>Joined</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.length === 0 ? (
                        <tr><td colSpan={5} className="ap-table-empty">No users found.</td></tr>
                      ) : filteredUsers.map((u) => {
                        const joined = u.created_at?.toDate
                          ? u.created_at.toDate().toLocaleDateString()
                          : u.created_at
                          ? new Date(u.created_at).toLocaleDateString()
                          : "—";
                        return (
                          <tr key={u.id}>
                            <td>
                              <div className="ap-user-cell">
                                <div className="ap-user-avatar">{(u.name || u.username || u.email || "?")[0].toUpperCase()}</div>
                                <span className="ap-table-name">{u.name || u.username || "—"}</span>
                              </div>
                            </td>
                            <td className="ap-table-email">{u.email || u.id}</td>
                            <td><RoleBadge role={u.role} /></td>
                            <td><span className="ap-auth-chip">{u.auth_provider || "email"}</span></td>
                            <td className="ap-table-muted">{joined}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {filteredUsers.length > 0 && (
                    <div className="ap-table-footer">
                      Showing {filteredUsers.length} of {users.length} users
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* ── PAYMENTS ──────────────────────────────────── */}
          {page === "payments" && (
            <>
              <div className="ap-stats-grid" style={{ marginBottom: "1.5rem" }}>
                <StatCard label="Total Payments" value={payments.length} accent="blue" icon={<Icon.Payments />} />
                <StatCard label="Completed" value={completedPayments.length} sub={`Rs. ${totalPaymentsValue.toFixed(0)} revenue`} accent="green" icon={<Icon.Check />} />
                <StatCard label="Pending" value={payments.filter(p => p.status === "PENDING").length} accent="amber" icon={<Icon.Alert />} />
                <StatCard label="Failed" value={payments.filter(p => p.status === "FAILED").length} accent="red" icon={<Icon.X />} />
              </div>

              <div className="ap-panel">
                <div className="ap-panel-header">
                  <span className="ap-panel-title">Payment Records</span>
                  <button className="ap-btn ap-btn-outline ap-btn-sm" onClick={loadPayments}>
                    <span style={{ width: 14, height: 14 }}><Icon.Refresh /></span> Refresh
                  </button>
                </div>
                {paymentsLoading ? (
                  <div className="ap-inline-loader"><div className="ap-spinner-sm" /></div>
                ) : (
                  <table className="ap-table ap-table-full">
                    <thead>
                      <tr>
                        <th>Payment ID</th>
                        <th>Plan / Course</th>
                        <th>Amount</th>
                        <th>Provider</th>
                        <th>Status</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.length === 0 ? (
                        <tr><td colSpan={6} className="ap-table-empty">No payments found.</td></tr>
                      ) : payments.map((p) => {
                        const date = p.created_at?.toDate
                          ? p.created_at.toDate().toLocaleDateString()
                          : "—";
                        const statusClass = p.status === "COMPLETED" ? "status-completed"
                          : p.status === "PENDING" ? "status-pending" : "status-failed";
                        return (
                          <tr key={p.id}>
                            <td className="ap-table-mono">{(p.payment_id || p.id || "").slice(0, 12)}…</td>
                            <td>{p.plan_id || p.course_id || "—"}</td>
                            <td className="ap-table-price">Rs. {((p.amount || 0) / 100).toFixed(0)}</td>
                            <td>{p.provider || "KHALTI"}</td>
                            <td><span className={`ap-status-badge ${statusClass}`}>{p.status}</span></td>
                            <td className="ap-table-muted">{date}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}

          {/* ── ANALYTICS ─────────────────────────────────── */}
          {page === "analytics" && (
            <>
              <div className="ap-toolbar" style={{ marginBottom: "1.5rem" }}>
                <button className="ap-btn ap-btn-outline ap-btn-sm" onClick={loadAnalytics}>
                  <span style={{ width: 14, height: 14 }}><Icon.Refresh /></span> Refresh Data
                </button>
              </div>

              {analyticsLoading ? (
                <div className="ap-loading-center"><div className="ap-spinner" /></div>
              ) : (
                <>
                  {analytics && (
                    <div className="ap-stats-grid" style={{ marginBottom: "1.5rem" }}>
                      <StatCard label="Total Child Users" value={analytics.total_users} accent="purple" icon={<Icon.Users />} />
                      <StatCard label="Active (7 days)" value={analytics.active_users} accent="green" icon={<Icon.Check />} />
                      <StatCard label="Game Attempts" value={analytics.total_game_attempts} accent="blue" icon={<Icon.Analytics />} />
                      <StatCard label="Course Completions" value={analytics.total_course_completions} accent="amber" icon={<Icon.Courses />} />
                    </div>
                  )}

                  <div className="ap-panel">
                    <div className="ap-panel-header">
                      <span className="ap-panel-title">Game Completion Rates</span>
                    </div>
                    {completionRates.length === 0 ? (
                      <div className="ap-empty-inline">No game data available yet.</div>
                    ) : (
                      <table className="ap-table ap-table-full">
                        <thead>
                          <tr>
                            <th>Game</th>
                            <th>Attempts</th>
                            <th>Completions</th>
                            <th>Completion Rate</th>
                          </tr>
                        </thead>
                        <tbody>
                          {completionRates.map((cr, i) => {
                            const pct = Math.round((cr.completion_rate || 0) * 100);
                            return (
                              <tr key={i}>
                                <td className="ap-table-name">{cr.game_id || "—"}</td>
                                <td>{cr.total_attempts}</td>
                                <td>{cr.total_completions}</td>
                                <td>
                                  <div className="ap-progress-cell">
                                    <div className="ap-progress-bar-mini">
                                      <div className="ap-progress-fill-mini" style={{ width: `${pct}%` }} />
                                    </div>
                                    <span className="ap-progress-pct">{pct}%</span>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </>
              )}
            </>
          )}

        </main>
      </div>
    </div>
  );
}
