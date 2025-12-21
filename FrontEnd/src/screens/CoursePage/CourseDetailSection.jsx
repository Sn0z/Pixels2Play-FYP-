import React, { useEffect, useState } from "react";
import FooterSection from "../Footer";
import NavigationBarSection from "../Header";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged, getAuth } from "firebase/auth";
import "./CourseDetailSection.css";

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
      "http://127.0.0.1:8000/api/payments/course-status/scratch-101/",
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