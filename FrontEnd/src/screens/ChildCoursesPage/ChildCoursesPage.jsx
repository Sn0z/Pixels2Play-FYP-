import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import "./ChildCoursesPage.css";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api").replace(/\/$/, "");
const auth = getAuth();

export default function ChildCoursesPage() {
  const navigate = useNavigate();

  const [courses, setCourses] = useState([]);         // All courses fetched
  const [purchasedIds, setPurchasedIds] = useState([]); // IDs child can access
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [progressMap, setProgressMap] = useState({}); // courseId -> progress obj
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        navigate("/login");
        return;
      }
      setUser(firebaseUser);

      try {
        const token = await firebaseUser.getIdToken();

        const [coursesRes, childCoursesRes] = await Promise.all([
          fetch(`${API_BASE}/courses/`),
          fetch(`${API_BASE}/courses/child-courses/`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        const allCourses = coursesRes.ok ? await coursesRes.json() : [];
        const childData = childCoursesRes.ok
          ? await childCoursesRes.json()
          : { purchased_course_ids: [], is_subscribed: false };

        const pIds = childData.purchased_course_ids || [];
        setCourses(Array.isArray(allCourses) ? allCourses : []);
        setPurchasedIds(pIds);
        setIsSubscribed(childData.is_subscribed || false);

        // Fetch progress for each purchased course
        const progressEntries = await Promise.all(
          pIds.map(async (cid) => {
            try {
              const pRes = await fetch(`${API_BASE}/courses/child-progress/${cid}/`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              const pData = pRes.ok ? await pRes.json() : { completed_lessons: [], quiz_score: null };
              return [cid, pData];
            } catch {
              return [cid, { completed_lessons: [], quiz_score: null }];
            }
          })
        );
        setProgressMap(Object.fromEntries(progressEntries));
      } catch (e) {
        console.error("Child courses load error:", e);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, [navigate]);

  // Filter to only purchased courses
  const purchasedCourses = isSubscribed ? courses : courses.filter((c) => purchasedIds.includes(c.id));

  const getProgress = (courseId, totalLessons) => {
    const p = progressMap[courseId];
    if (!p || totalLessons === 0) return 0;
    const completed = (p.completed_lessons || []).length;
    return Math.round((completed / totalLessons) * 100);
  };

  const countLessons = (course) => {
    let total = 0;
    (course.modules || []).forEach((m) => {
      total += m.lessons ? m.lessons.length : (m.lesson_count || 0);
    });
    return total;
  };

  const getTitle = (c) => c.title || c.name || "Untitled Course";
  const getThumb = (c) =>
    c.thumbnail ||
    "https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=600&q=80";

  const profileName = user?.displayName || user?.email?.split("@")[0] || "Scholar";

  const handleSignOut = async () => {
    await auth.signOut();
    navigate("/login");
  };

  return (
    <div className="ccp-page">
      {/* Navigation matching ChildHomePage */}
      <div className="main-navigation">
        <div className="frame-frame-2" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '0 20px', boxSizing: 'border-box' }}>
          <div className="nav-links">
            <div 
              className="text-wrapper-96" 
              style={{cursor:"pointer"}} 
              onClick={() => navigate("/kidshome")}
            >
              Home
            </div>
            <div 
              className="text-wrapper-97" 
            >
              Courses
            </div>
            <div className="text-wrapper-98" style={{cursor:"pointer"}} onClick={() => navigate("/kidshome#games-section")}>
              Games
            </div>
            <div className="text-wrapper-99" style={{cursor:"pointer"}} onClick={() => navigate("/child-contact")}>
              Contact Us
            </div>
          </div>
          {/* User Info & Sign Out */}
          <div className="child-nav-user" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <span style={{ color: '#571c86', fontWeight: 'bold', fontSize: '18px' }}>
              Hi, {profileName}!
            </span>
            <button 
              onClick={handleSignOut}
              style={{ 
                backgroundColor: '#ff4b4b', color: 'white', border: 'none', 
                padding: '8px 16px', borderRadius: '20px', cursor: 'pointer',
                fontWeight: 'bold', fontSize: '14px', boxShadow: '0 4px 6px rgba(255, 75, 75, 0.2)'
              }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <main className="ccp-main">
        {/* Banner */}
        <div className="ccp-banner">
          <div className="ccp-banner-stars">✨ ⭐ 🌟 ✨</div>
          <h1 className="ccp-banner-title">
            {isSubscribed ? "✨ Full Learning Unlock! ✨" : "My Learning Adventure! 🚀"}
          </h1>
          <p className="ccp-banner-sub">
            {isSubscribed 
              ? "You have access to ALL courses! Which one will you master today? 🌈"
              : "Pick a course below and keep learning. You're doing great! 🎉"}
          </p>
        </div>

        <div className="ccp-container">
          {loading ? (
            <div className="ccp-loading">
              <div className="ccp-bubbles">
                <div className="ccp-bubble" />
                <div className="ccp-bubble" />
                <div className="ccp-bubble" />
              </div>
              <p>Loading your courses…</p>
            </div>
          ) : purchasedCourses.length === 0 ? (
            <div className="ccp-empty-state">
              <div className="ccp-empty-icon">📦</div>
              <h2 style={{ color: "#571c86" }}>No Courses Yet!</h2>
              <p style={{ color: "#4a5462" }}>Ask your parent to buy a course so you can start learning! 😊</p>
            </div>
          ) : (
            <div className="ccp-grid">
              {purchasedCourses.map((course, idx) => {
                const totalLessons = countLessons(course);
                const pct = getProgress(course.id, totalLessons || 1);
                const hasStarted = pct > 0;

                return (
                  <div
                    key={course.id}
                    className="ccp-card"
                    style={{ animationDelay: `${idx * 80}ms` }}
                    onClick={() => navigate(`/child-learn/${course.id}`)}
                  >
                    {/* Thumbnail */}
                    <div className="ccp-thumb">
                      <img src={getThumb(course)} alt={getTitle(course)} />
                      <div className="ccp-thumb-overlay">
                        <span className="ccp-play-icon">▶</span>
                      </div>
                      {pct === 100 && (
                        <div className="ccp-completed-seal">
                          <span>🏆</span> Complete!
                        </div>
                      )}
                    </div>

                    {/* Body */}
                    <div className="ccp-card-body">
                      {course.category && (
                        <span className="ccp-tag">{course.category}</span>
                      )}
                      <h2 className="ccp-course-name">{getTitle(course)}</h2>

                      {/* Progress bar */}
                      <div className="ccp-progress-wrap">
                        <div className="ccp-progress-bar">
                          <div
                            className="ccp-progress-fill"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="ccp-progress-label">{pct}% complete</span>
                      </div>

                      <div className="ccp-meta">
                        {totalLessons > 0 && (
                          <span>📖 {totalLessons} lesson{totalLessons !== 1 ? "s" : ""}</span>
                        )}
                        {progressMap[course.id]?.quiz_score != null && (
                          <span>
                            🏅 Quiz: {Math.round(progressMap[course.id].quiz_score * 100)}%
                          </span>
                        )}
                      </div>

                      <button className={`ccp-start-btn ${hasStarted ? "ccp-continue-btn" : ""}`}>
                        {pct === 100
                          ? "🏆 Review Course"
                          : hasStarted
                          ? "▶ Continue Learning"
                          : "🚀 Start Course"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
