/**
 * CourseDetailSection.jsx
 *
 * Fetches a single course from the Django Firestore proxy:
 *   GET /api/courses/firestore-courses/<courseId>/
 *
 * No Firestore client SDK. No WatchAndQuiz embed.
 * Video lives only at /watch/:moduleId
 */

import React, { useEffect, useState } from "react";
import FooterSection from "../Footer";
import NavigationBarSection from "../Header";
import { useNavigate, useParams } from "react-router-dom";
import { onAuthStateChanged, getAuth } from "firebase/auth";
import "./CourseDetailSection.css";

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api").replace(/\/$/, "");

const auth = getAuth();

// ── Field helpers (Firestore schema: name, details, thumbnail) ─────────────
function getTitle(c) { return c?.name || c?.title || "Untitled"; }
function getDesc(c) { return c?.details || c?.long_description || c?.description || ""; }
function getShortDesc(c) { return c?.short_description || c?.details || ""; }
function getImage(c) { return c?.thumbnail || c?.course_image || "https://c.animaapp.com/miv5b7ziJolmTE/img/rectangle.png"; }
function getAgeRange(c) {
  if (c?.ageRange) return c.ageRange;
  if (c?.age_min && c?.age_max) return `${c.age_min}–${c.age_max}`;
  return "8–15";
}
function getDuration(c) { return c?.duration || c?.duration_weeks || "?"; }
function getPrice(c) {
  const price = c?.price || "0";
  const currency = c?.currency || "Rs";
  return `${currency} ${price}`;
}

export default function CourseDetailSection() {
  const navigate = useNavigate();
  const { moduleId: courseId } = useParams();

  // ── Auth + payment state ───────────────────────────────────────────────
  // Payment bypass: always true — re-enable payment check when ready
  const [purchased, setPurchased] = useState(true);
  const [payLoading, setPayLoading] = useState(false);

  // Payment verification via pidx (Khalti callback)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pidx = params.get("pidx");
    if (!pidx) return;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      setPayLoading(true);
      try {
        const token = await user.getIdToken();
        const res = await fetch(`${API_BASE}/payments/verify/`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ pidx }),
        });
        const data = await res.json();
        if (data.success) {
          setPurchased(true);
          // Clean up the pidx query param, then go straight to the course modules
          window.history.replaceState({}, document.title, window.location.pathname);
          navigate(`/watch/${courseId}`);
        } else {
          alert("Payment verification failed: " + (data.status || "Unknown error"));
        }
      } catch (err) {
        console.error("Verification error:", err);
      } finally {
        setPayLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // ── Course data from Django Firestore proxy ────────────────────────────
  const [courseData, setCourseData] = useState(null);
  const [courseLoading, setCourseLoading] = useState(true);
  const [courseError, setCourseError] = useState(null);

  useEffect(() => {
    if (!courseId) { setCourseLoading(false); return; }
    let cancelled = false;

    async function loadCourse() {
      setCourseLoading(true);
      setCourseError(null);
      try {
        const res = await fetch(`${API_BASE}/courses/${courseId}/`);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `HTTP ${res.status}`);
        }
        const data = await res.json();
        if (!cancelled) setCourseData(data);
      } catch (err) {
        if (!cancelled) setCourseError(err.message || "Failed to load course");
      } finally {
        if (!cancelled) setCourseLoading(false);
      }
    }

    loadCourse();
    return () => { cancelled = true; };
  }, [courseId]);

  // ── Enroll / pay ───────────────────────────────────────────────────────
  const handleEnroll = async () => {
    if (!courseData) return;
    const user = auth.currentUser;
    if (!user) { alert("Please sign in to enroll."); return; }
    try {
      setPayLoading(true);
      const token = await user.getIdToken();
      const amount = parseFloat(courseData.price) || 0;
      const res = await fetch(`${API_BASE}/payments/initiate/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          course_id: courseId,
          amount: amount * 100,  // convert to paisa
          product_name: getTitle(courseData),
        }),
      });
      const data = await res.json();
      if (data.payment_url) {
        window.location.href = data.payment_url;
      } else {
        alert("Payment initiation failed: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      alert("Error initiating payment: " + err.message);
    } finally {
      setPayLoading(false);
    }
  };

  // ── Sidebar details array ─────────────────────────────────────────────
  const courseDetails = courseData ? [
    {
      icon: courseData.icon_age || "https://c.animaapp.com/miv5b7ziJolmTE/img/frame----image-4.svg",
      text: `Ages: ${getAgeRange(courseData)} Years Old`,
    },
    {
      icon: courseData.icon_duration || "https://c.animaapp.com/miv5b7ziJolmTE/img/frame----image.svg",
      text: `Duration: ${getDuration(courseData)} Weeks`,
    },
    {
      icon: courseData.icon_format || "https://c.animaapp.com/miv5b7ziJolmTE/img/frame----image-1.svg",
      text: `Format: ${courseData.format_type || "Live Online Classes"}`,
    },
    {
      icon: courseData.icon_certificate || "https://c.animaapp.com/miv5b7ziJolmTE/img/frame----image-3.svg",
      text: "Certificate of Completion",
    },
  ] : [];

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <>
      <NavigationBarSection />

      <section className="course-detail-container">
        <div className="course-detail-main">
          {courseLoading ? (
            <div>Loading course…</div>
          ) : courseError ? (
            <div style={{ color: "#e53e3e" }}>
              ⚠️ {courseError}
              <br />
              <button className="details-btn" style={{ marginTop: 12 }} onClick={() => navigate("/courses")}>
                ← Back to Courses
              </button>
            </div>
          ) : courseData ? (
            <>
              <span className="course-badge">{courseData.category}</span>
              <h1 className="course-title">{getTitle(courseData)}</h1>
              <p className="course-description">{getShortDesc(courseData)}</p>

              <div className="course-image-card">
                <img
                  className="course-main-image"
                  alt={getTitle(courseData)}
                  src={getImage(courseData)}
                />
                <div className="course-info-content">
                  <h2 className="course-subtitle">About this course</h2>
                  <p className="course-info-text">{getDesc(courseData)}</p>
                </div>
              </div>
            </>
          ) : (
            <div>Course not found.</div>
          )}
        </div>

        {/* ── Sidebar ── */}
        <aside className="course-sidebar">
          <div className="sidebar-card">
            {/* Enroll / Start Learning */}
            <button
              className={`enroll-btn ${purchased ? "start-learning-btn" : ""}`}
              disabled={payLoading}
              onClick={() => {
                if (purchased) {
                  navigate(`/watch/${courseId}`);
                } else {
                  handleEnroll();
                }
              }}
            >
              {payLoading ? "Please wait…" : purchased ? "Start Learning" : "Enroll Now"}
            </button>

            {/* Course detail icons */}
            <div className="sidebar-details">
              {courseDetails.map((detail, index) => (
                <div key={index} className="sidebar-detail-item">
                  <img className="detail-icon" alt="" src={detail.icon} />
                  <span className="detail-text">{detail.text}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </section>

      <FooterSection />
    </>
  );
}