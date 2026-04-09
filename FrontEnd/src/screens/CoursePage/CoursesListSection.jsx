import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import "./CoursesListSection.css";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api").replace(/\/$/, "");
const auth = getAuth();

export default function CoursesListSection() {
  const navigate = useNavigate();

  const [courses, setCourses] = useState([]);
  const [purchasedIds, setPurchasedIds] = useState([]);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      try {
        const coursesRes = await fetch(`${API_BASE}/courses/`);
        const coursesData = await coursesRes.json();
        setCourses(Array.isArray(coursesData) ? coursesData : []);

        if (user) {
          const token = await user.getIdToken();
          const purchasedRes = await fetch(`${API_BASE}/courses/purchased/`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const purchasedData = purchasedRes.ok ? await purchasedRes.json() : { purchased_course_ids: [], is_subscribed: false };
          setPurchasedIds(purchasedData.purchased_course_ids || []);
          setIsSubscribed(purchasedData.is_subscribed || false);
        }
      } catch (e) {
        setError("Failed to load courses.");
        console.error(e);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  const handleViewDetails = (courseId) => {
    navigate(`/coursedetails/${courseId}`);
  };

  const truncate = (str, len) => {
    if (!str) return "";
    return str.length > len ? str.substring(0, len) + "..." : str;
  };

  return (
    <div className="courses-list-container">
      {loading ? (
        <div className="loading-wrapper">
          <div className="spinner" />
          <p>Loading catalog…</p>
        </div>
      ) : error ? (
        <div style={{ textAlign: "center", color: "#ef4444", padding: "40px" }}>⚠️ {error}</div>
      ) : (
        <div className="course-cards-grid">
          {courses.map((course) => {
            const purchased = isSubscribed || purchasedIds.includes(course.id);
            return (
              <div key={course.id} className="premium-white-card">
                {/* Thumbnail Section */}
                <div className="card-thumb-wrapper">
                  <img 
                    src={course.thumbnail || course.course_image || course.image || "https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=600&q=80"} 
                    alt={course.title} 
                    onError={(e) => {
                      e.target.src = "https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=600&q=80";
                    }}
                  />
                  <div className="badge-difficulty">
                    {course.difficulty || "Beginner"}
                  </div>
                  {isSubscribed && (
                    <div className="badge-subscription-active">
                       ✓ Subscription Active
                    </div>
                  )}
                </div>

                {/* Body Section */}
                <div className="card-body">
                  <span className="category-tag">{course.category || "AI & CODING"}</span>
                  <h3 className="course-card-title">{course.title}</h3>
                  
                  <div className="course-meta-row">
                    <div className="meta-item">
                       <span role="img" aria-label="age">👶</span> Ages {course.ageGroup || "8-12"}
                    </div>
                  </div>

                  <p className="course-card-description">
                    {truncate(course.description, 100)}
                  </p>

                  <div style={{ marginTop: 'auto' }}>
                    <button 
                      className="view-details-btn"
                      onClick={() => handleViewDetails(course.id)}
                    >
                      View Details
                    </button>
                  </div>
                </div>

                {/* Footer Section */}
                <div className="card-footer">
                  <span className={`status-label ${purchased ? 'unlocked' : ''}`}>
                    {purchased ? (
                      <>Unlocked ✓</>
                    ) : (
                      course.price ? `${course.currency || "Rs"} ${course.price}` : "Premium"
                    )}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
