import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../FireBase/firebase";
import { collection, getDocs } from "firebase/firestore";
import "./CoursesListSection.css";

const paginationItems = [
  { type: "button", label: "Previous", active: false },
  { type: "page", label: "1", active: true },
  { type: "page", label: "2", active: false },
  { type: "page", label: "3", active: false },
  { type: "ellipsis", label: "...", active: false },
  { type: "page", label: "28", active: false },
  { type: "button", label: "Next", active: false },
];

export default function CoursesListSection() {
  const navigate = useNavigate();
  const [sortValue, setSortValue] = useState("");
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch from Firestore
  useEffect(() => {
    async function fetchCourses() {
      try {
        const querySnapshot = await getDocs(collection(db, "courses"));
        const fetchedCourses = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setCourses(fetchedCourses);
      } catch (err) {
        console.error("Error fetching courses from Firestore:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchCourses();
  }, []);

  return (
    <section className="courses-list-section">
      <header className="courses-header">
        <div className="header-left">
          <h2 className="courses-title">All Courses</h2>
          <p className="courses-subtitle">
            {loading ? "Loading..." : `Showing ${courses.length} courses`}
          </p>
        </div>

        <div className="sort-box">
          <span className="sort-label">Sort by:</span>
          <select
            className="sort-select"
            value={sortValue}
            onChange={(e) => setSortValue(e.target.value)}
          >
            <option value="">Select</option>
            <option value="newest">Newest</option>
            <option value="popular">Most Popular</option>
            <option value="rating">Highest Rated</option>
          </select>
        </div>
      </header>

      <div className="courses-grid">
        {loading ? (
          <p>Loading courses...</p>
        ) : courses.length === 0 ? (
          <p>No courses found.</p>
        ) : (
          courses.map((course, index) => (
            <div
              key={course.id}
              className="course-card"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="course-image">
                <img
                  src={
                    course.thumbnail ||
                    "https://c.animaapp.com/miujjzjc7Bh8SC/img/rectangle-5.png"
                  }
                  alt={course.name}
                />
              </div>

              <div className="course-content">
                <p className="course-category">{course.category || "General"}</p>
                <h3 className="course-title">{course.name}</h3>
                <p className="course-instructor">by Pixels2Play</p>

                <div className="course-rating">
                  <span className="rating-number">5.0</span>
                  <img
                    className="rating-stars"
                    alt="Rating stars"
                    src="https://c.animaapp.com/miujjzjc7Bh8SC/img/frame.svg"
                  />
                  <span className="rating-reviews">(25)</span>
                </div>

                <div className="course-price-snippet" style={{ marginTop: '8px', fontWeight: 'bold' }}>
                  {course.price ? `$${course.price}` : 'Free'}
                </div>

                <button
                  onClick={() => navigate(`/coursedetails/${course.id}`)}
                  className="details-btn"
                  style={{ marginTop: '12px' }}
                >
                  View Details
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <nav className="pagination">
        {paginationItems.map((item, index) => {
          if (item.type === "ellipsis") {
            return (
              <span key={index} className="pagination-ellipsis">
                {item.label}
              </span>
            );
          }

          return (
            <button
              key={index}
              className={
                item.active ? "pagination-btn active" : "pagination-btn"
              }
            >
              {item.label}
            </button>
          );
        })}
      </nav>
    </section>
  );
}
