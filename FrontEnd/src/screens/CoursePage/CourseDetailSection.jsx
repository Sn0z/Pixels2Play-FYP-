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

export default function CourseDetailSection() {
  const navigate = useNavigate();

  const [purchased, setPurchased] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
  console.log("Current user:", auth.currentUser);
  const unsubscribe = onAuthStateChanged(auth, async (user) => {
    if (!user) {
      setLoading(false);
      return;
    }

    const token = await user.getIdToken();

    const res = await fetch(
      `${API_BASE}/payments/course-status/scratch-101/`, // Use shared API base for consistency.
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await res.json();
    setPurchased(data.purchased);
    setLoading(false);
  });

  return () => unsubscribe();
}, []);

// Module preview state: fetch first published module and show WatchAndQuiz inline
const { moduleId: paramModuleId } = useParams();
  const [modules, setModules] = useState([]);
  const [module, setModule] = useState(null);
  const [moduleLoading, setModuleLoading] = useState(true);

  useEffect(() => {
    async function loadModules() {
      try {
        const res = await fetch(`${API_BASE}/courses/modules/`); // Use shared API base for consistency.
        if (!res.ok) return setModuleLoading(false);
        const data = await res.json();
        if (Array.isArray(data) && data.length) {
          setModules(data);
          // If route param provided, fetch that module or pick from list
          if (paramModuleId) {
            const found = data.find((m) => String(m.id) === String(paramModuleId));
            if (found) setModule(found);
            else {
              // fetch by id fallback
              const r = await fetch(`${API_BASE}/courses/modules/${paramModuleId}/`); // Use shared API base for consistency.
              if (r.ok) setModule(await r.json());
            }
          } else {
            setModule(data[0]);
          }
        }
      } catch (err) {
        console.error('Failed to load modules', err);
      } finally {
        setModuleLoading(false);
      }
    }
    loadModules();
  }, [paramModuleId]);

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

const courseDetails = [
  {
    icon: "https://c.animaapp.com/miv5b7ziJolmTE/img/frame----image-4.svg",
    text: "Ages: 8-12 Years Old",
  },
  {
    icon: "https://c.animaapp.com/miv5b7ziJolmTE/img/frame----image.svg",
    text: "Duration: 6 Weeks",
  },
  {
    icon: "https://c.animaapp.com/miv5b7ziJolmTE/img/frame----image-1.svg",
    text: "Format: Live Online Classes",
  },
  {
    icon: "https://c.animaapp.com/miv5b7ziJolmTE/img/frame----image-3.svg",
    text: "Certificate of Completion",
  },
];

return (
    <>
      <NavigationBarSection />

      <section className="course-detail-container">
        <div className="course-detail-main">
          <span className="course-badge">Coding</span>

          <h1 className="course-title">Creative Coding with Scratch</h1>

          <p className="course-description">
            Go from a coding beginner to a game-designing pro by creating
            awesome animations, stories, and games.
          </p>

          <div className="course-image-card">
            <img
              className="course-main-image"
              alt="Creative Coding with Scratch course"
              src="https://c.animaapp.com/miv5b7ziJolmTE/img/rectangle.png"
            />

            <div className="course-info-content">
              <h2 className="course-subtitle">About this course</h2>

              <p className="course-info-text">
                This course is the perfect introduction to the world of coding
                for young minds. Using Scratch, a visual programming language
                developed by MIT, students will learn the fundamentals of
                programming logic through hands-on creativity. They’ll build
                interactive stories, animations, and video games — becoming not
                just consumers of technology but creators!
              </p>
            </div>
          </div>

          {/* Inline module preview and WatchAndQuiz */}
          {!moduleLoading && module && (
            <div style={{ marginTop: 24 }}>
              <h3 style={{ marginBottom: 8 }}>Module Preview: {module.title}</h3>
              <WatchAndQuiz videoId={getVideoId(module)} moduleId={module.id} />
            </div>
          )}

        </div>

        <aside className="course-sidebar">
          <div className="sidebar-card">
            <div className="sidebar-price">
              <span className="price">Rs 99</span>
              <span className="per-course">/ course</span>
            </div>

            <button
              className={`enroll-btn ${purchased ? "disabled" : ""}`}
              disabled={loading || purchased}
              onClick={() => {
                if (!purchased) navigate("/checkout");
              }}
            >
              {loading ? "Checking..." : purchased ? "Purchased" : "Enroll Now"}
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