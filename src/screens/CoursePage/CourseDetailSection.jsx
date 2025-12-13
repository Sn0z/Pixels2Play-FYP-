import React from "react";
import FooterSection from "../Footer";
import NavigationBarSection from "../Header";
import "./CourseDetailSection.css";

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

export default function CourseDetailSection() {
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
              <span className="price">$99</span>
              <span className="per-course">/ course</span>
            </div>

            <button className="enroll-btn">Enroll Now</button>

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
