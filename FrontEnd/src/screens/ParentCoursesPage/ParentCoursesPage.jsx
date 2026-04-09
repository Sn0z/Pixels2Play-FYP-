import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import NavigationBarSection from "../Header";
import FooterSection from "../Footer";
import "./ParentCoursesPage.css";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api").replace(/\/$/, "");

const auth = getAuth();

export default function ParentCoursesPage() {
  const navigate = useNavigate();

  const [courses, setCourses] = useState([]);
  const [purchasedIds, setPurchasedIds] = useState([]);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [purchasing, setPurchasing] = useState(null); // courseId being purchased
  const [successMsg, setSuccessMsg] = useState("");

  const SUBSCRIPTION_IDS = ["starter", "pro", "family"];

  // Fetch courses + purchased list when auth resolves
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const token = await user.getIdToken();

        const [coursesRes, purchasedRes] = await Promise.all([
          fetch(`${API_BASE}/courses/`),
          fetch(`${API_BASE}/courses/purchased/`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        const coursesData = coursesRes.ok ? await coursesRes.json() : [];
        const purchasedData = purchasedRes.ok ? await purchasedRes.json() : { purchased_course_ids: [], is_subscribed: false };

        setCourses(Array.isArray(coursesData) ? coursesData : []);
        setPurchasedIds(purchasedData.purchased_course_ids || []);
        setIsSubscribed(purchasedData.is_subscribed || false);
      } catch (e) {
        setError("Failed to load courses. Please try again.");
        console.error(e);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  const handleBuy = async (courseId) => {
    // If it's a course buy click, but we want subscriptions, redirect to pricing
    navigate("/pricing");
  };

  const getTitle = (c) => c.title || c.name || "Untitled Course";
  const getDesc = (c) => c.description || c.details || "";
  const getPrice = (c) =>
    c.price ? `${c.currency || "Rs"} ${c.price}` : "Free";

  return (
    <div className="pcp-page">
      <NavigationBarSection />

      <main className="pcp-main">
        {/* Hero Banner */}
        <div className="pcp-hero">
          <div className="pcp-hero-content">
            <span className="pcp-hero-badge">👨‍👩‍👧 Parent Portal</span>
            <h1 className="pcp-hero-title">Browse Courses</h1>
            <p className="pcp-hero-sub">
              {isSubscribed 
                ? "✨ Your subscription is active! Your child has full access to the entire catalog."
                : "Unlock our full AI-powered learning catalog with a single subscription."}
            </p>
            {!isSubscribed && !loading && (
              <button className="pcp-hero-cta" onClick={() => navigate("/pricing")}>
                View Subscription Plans →
              </button>
            )}
          </div>
          <div className="pcp-hero-decoration" />
        </div>

        <div className="pcp-container">
          {/* Status messages */}
          {successMsg && <div className="pcp-alert pcp-alert-success">{successMsg}</div>}
          {error && <div className="pcp-alert pcp-alert-error">⚠️ {error}</div>}

          {loading ? (
            <div className="pcp-loading">
              <div className="pcp-spinner" />
              <p>Loading catalog…</p>
            </div>
          ) : courses.length === 0 ? (
            <p className="pcp-empty">No courses available at the moment.</p>
          ) : (
            <div className="pcp-grid">
              {courses.map((course) => {
                const isPurchased = isSubscribed || purchasedIds.includes(course.id);
                const isBuying = purchasing === course.id;
                return (
                  <div key={course.id} className={`pcp-card ${isPurchased ? "pcp-card-owned" : ""}`}>
                    {/* Thumbnail */}
                    <div className="pcp-card-thumb">
                      <img
                        src={course.thumbnail || course.course_image || course.image || "https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=600&q=80"}
                        alt={getTitle(course)}
                        loading="lazy"
                        onError={(e) => {
                          e.target.src = "https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=600&q=80";
                        }}
                      />
                      <span className="pcp-difficulty-tag">
                        {course.difficulty || "Beginner"}
                      </span>
                      {isPurchased && (
                        <div className="pcp-purchased-badge">✓ {isSubscribed ? "Subscription Active" : "Purchased"}</div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="pcp-card-body">
                      {course.category && (
                        <span className="pcp-category">{course.category}</span>
                      )}
                      <h2 className="pcp-course-title">{getTitle(course)}</h2>
                      {course.ageGroup && (
                        <p className="pcp-age-group">👦 Ages {course.ageGroup}</p>
                      )}
                      <p className="pcp-description">{getDesc(course)}</p>

                      <div className="pcp-card-footer">
                        <span className="pcp-price">{isSubscribed ? "Included" : getPrice(course)}</span>
                        {isPurchased ? (
                          <button className="pcp-btn pcp-btn-purchased" disabled>
                            Unlocked ✓
                          </button>
                        ) : (
                          <button
                            className="pcp-btn pcp-btn-buy"
                            onClick={() => handleBuy(course.id)}
                            disabled={isBuying}
                          >
                            Get Access
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>


      <FooterSection />
    </div>
  );
}
