import React, { useEffect, useState } from "react";
import FooterSection from "../Footer";
import NavigationBarSection from "../Header";
import { useNavigate, useParams } from "react-router-dom";
import { onAuthStateChanged, getAuth } from "firebase/auth";
import WatchAndQuiz from "../WatchAndQuiz/WatchAndQuiz";
import "./CourseDetailSection.css";

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api").replace(/\/$/, ""); // Use Django API directly.

const auth = getAuth();

async function safeJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export default function CourseDetailSection() {
  const navigate = useNavigate();

  // 🚨 TEMPORARY: Payment bypassed - always set to true to allow course access
  // TODO: Re-enable payment by changing 'true' back to 'false' below
  const [purchased, setPurchased] = useState(true); // Was: false
  const [loading, setLoading] = useState(false); // Was: true (no need to check when bypassed)

  // Payment Verification Logic
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pidx = params.get("pidx");

    if (pidx) {
      async function verify() {
        setLoading(true);
        try {
          const auth = getAuth();
          const user = auth.currentUser;
          if (!user) return;

          const token = await user.getIdToken();
          const res = await fetch(`${API_BASE}/payments/verify/`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ pidx }),
          });

          const data = await res.json();
          if (data.success) {
            setPurchased(true);
            alert("Payment successful! You can now access the course.");
            // Determine behavior: scroll to content or stay put
            // Remove query params to prevent re-verification
            window.history.replaceState({}, document.title, window.location.pathname);
          } else {
            alert("Payment verification failed: " + (data.status || "Unknown error"));
          }
        } catch (err) {
          console.error("Verification error:", err);
          alert("Error verifying payment. Please contact support.");
        } finally {
          setLoading(false);
        }
      }

      // Wait for auth to be ready
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        if (user) verify();
      });
      return () => unsubscribe();
    }
  }, []);

  // 🚨 TEMPORARY: Payment check disabled
  // TODO: Uncomment this useEffect to re-enable payment verification
  /*
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (!user) {
          setPurchased(false);
          return;
        }

        const token = await user.getIdToken();
        const res = await fetch(`${API_BASE}/payments/course-status/scratch-101/`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await safeJson(res);
        setPurchased(!!data?.purchased);
      } catch (err) {
        console.error("Failed to check purchase status:", err);
        setPurchased(false);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);
  */

  // Fetch course/module data dynamically from Firestore
  const { moduleId: paramModuleId } = useParams();
  const [courseData, setCourseData] = useState(null);
  const [modules, setModules] = useState([]); // Keep modules for the list if needed
  const [module, setModule] = useState(null);
  const [moduleLoading, setModuleLoading] = useState(true);

  useEffect(() => {
    async function loadCourseFromFirestore() {
      if (!paramModuleId) {
        setModuleLoading(false);
        return;
      }

      try {
        // 1. Fetch the specific course document from Firestore
        const { doc, getDoc } = await import("firebase/firestore");
        const { db } = await import("../../FireBase/firebase");

        const docRef = doc(db, "courses", paramModuleId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          const firestoreCourse = {
            id: docSnap.id,
            title: data.name, // Map name -> title
            description: data.details, // Map details -> description
            price: data.price,
            category: data.category,
            age_min: data.ageRange ? data.ageRange.split('-')[0] : '8',
            age_max: data.ageRange ? data.ageRange.split('-')[1] : '12',
            duration_weeks: data.duration,
            course_image: data.thumbnail,
            // Add defaults for missing fields
            format_type: "Live Online Classes",
            currency: "USD", // Firestore example showed USD
            icon_age: "https://c.animaapp.com/miv5b7ziJolmTE/img/frame----image-4.svg",
            icon_duration: "https://c.animaapp.com/miv5b7ziJolmTE/img/frame----image.svg",
            icon_format: "https://c.animaapp.com/miv5b7ziJolmTE/img/frame----image-1.svg",
            icon_certificate: "https://c.animaapp.com/miv5b7ziJolmTE/img/frame----image-3.svg",
            // Video placeholder (Firestore courses might not have video_url set yet)
            video_host: 'youtube',
            video_url: 'dQw4w9WgXcQ'
          };

          setCourseData(firestoreCourse);
          setModule(firestoreCourse); // Use course as current module for now
        } else {
          console.log("No such course!");
        }
      } catch (err) {
        console.error("Failed to load course from Firestore", err);
      } finally {
        setModuleLoading(false);
      }
    }
    loadCourseFromFirestore();
  }, [paramModuleId]);

  const handleEnroll = async () => {
    if (!courseData) return;
    const user = auth.currentUser;
    if (!user) {
      alert("Please sign in to enroll.");
      return;
    }
    try {
      setLoading(true);
      const token = await user.getIdToken();
      // Note: Payment backend might expect numeric amount. Firestore price is usually string
      const amount = parseFloat(courseData.price) || 0;

      const res = await fetch(`${API_BASE}/payments/initiate/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          amount: amount,
          product_name: courseData.title
        }),
      });
      const data = await res.json();
      if (data.payment_url) {
        window.location.href = data.payment_url;
      } else {
        alert('Payment initiation failed: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      alert('Error initiating payment: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  function getVideoId(mod) {
    if (!mod) return '';
    if (mod.video_host === 'youtube') {
      const u = mod.video_url || '';
      const m = u.match(/[?&]v=([^&]+)/);
      if (m) return m[1];
      const s = u.match(/youtu\.be\/([^?&]+)/);
      if (s) return s[1];
      return u;
    }
    return mod.video_url;
  }

  // Build course details array dynamically from courseData
  const courseDetails = courseData ? [
    {
      icon: courseData.icon_age,
      text: `Ages: ${courseData.age_min}-${courseData.age_max} Years Old`,
    },
    {
      icon: courseData.icon_duration,
      text: `Duration: ${courseData.duration_weeks} Weeks`,
    },
    {
      icon: courseData.icon_format,
      text: `Format: ${courseData.format_type}`,
    },
    {
      icon: courseData.icon_certificate,
      text: "Certificate of Completion",
    },
  ] : [];

  return (
    <>
      <NavigationBarSection />

      <section className="course-detail-container">
        <div className="course-detail-main">
          {moduleLoading ? (
            <div>Loading course...</div>
          ) : courseData ? (
            <>
              <span className="course-badge">{courseData.category}</span>

              <h1 className="course-title">{courseData.title}</h1>

              <p className="course-description">
                {courseData.short_description || courseData.description}
              </p>

              <div className="course-image-card">
                <img
                  className="course-main-image"
                  alt={`${courseData.title} course`}
                  src={courseData.course_image || "https://c.animaapp.com/miv5b7ziJolmTE/img/rectangle.png"}
                />

                <div className="course-info-content">
                  <h2 className="course-subtitle">About this course</h2>

                  <p className="course-info-text">
                    {courseData.long_description || courseData.description}
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div>Course not found</div>
          )}

          {/* Inline module preview and WatchAndQuiz */}
          {!moduleLoading && module && (
            <div id="module-preview" style={{ marginTop: 24 }}>
              <h3 style={{ marginBottom: 8 }}>Module Preview: {module.title}</h3>
              <WatchAndQuiz videoId={getVideoId(module)} moduleId={module.id} />
            </div>
          )}

        </div>

        <aside className="course-sidebar">
          <div className="sidebar-card">
            <div className="sidebar-price">
              <span className="price">
                {courseData ? `${courseData.currency} ${courseData.price}` : 'Rs 99'}
              </span>
              <span className="per-course">/ course</span>
            </div>

            <button
              className={`enroll-btn ${purchased ? "start-learning-btn" : ""}`}
              disabled={loading}
              onClick={() => {
                if (purchased) {
                  // Scroll to module preview or specific section
                  const element = document.getElementById("module-preview");
                  if (element) element.scrollIntoView({ behavior: "smooth" });
                } else {
                  navigate("/checkout");
                }
              }}
            >
              {loading ? "Checking..." : purchased ? "Start Learning" : "Enroll Now"}
            </button>

            {/* Module selector */}
            <div style={{ marginTop: 16 }}>
              <h4 style={{ margin: '8px 0' }}>Modules</h4>
              <ul role="list" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {modules.map((m) => (
                  <li key={m.id} role="listitem">
                    <button
                      className={`details-btn`}
                      style={{ width: '100%', textAlign: 'left', marginBottom: 6 }}
                      aria-pressed={module && module.id === m.id}
                      aria-selected={module && module.id === m.id}
                      onClick={() => navigate(`/coursedetails/${m.id}`)}
                    >
                      {m.title}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

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