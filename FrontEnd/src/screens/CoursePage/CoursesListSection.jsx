import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./CoursesListSection.css";

const coursesData = [
  {
    id: 1,
    category: "WEB DEVELOPMENT",
    title: "Advanced JavaScript & ESNext",
    instructor: "by Jane Doe",
    rating: "4.8",
    reviews: "(1,250)",
    image: "https://c.animaapp.com/miujjzjc7Bh8SC/img/rectangle-5.png",
  },
  {
    id: 2,
    category: "WEB DEVELOPMENT",
    title: "Advanced JavaScript & ESNext",
    instructor: "by Jane Doe",
    rating: "4.8",
    reviews: "(1,250)",
    image: "https://c.animaapp.com/miujjzjc7Bh8SC/img/rectangle-5.png",
  },
  {
    id: 3,
    category: "WEB DEVELOPMENT",
    title: "Advanced JavaScript & ESNext",
    instructor: "by Jane Doe",
    rating: "4.8",
    reviews: "(1,250)",
    image: "https://c.animaapp.com/miujjzjc7Bh8SC/img/rectangle-5.png",
  },
  {
    id: 4,
    category: "WEB DEVELOPMENT",
    title: "Advanced JavaScript & ESNext",
    instructor: "by Jane Doe",
    rating: "4.8",
    reviews: "(1,250)",
    image: "https://c.animaapp.com/miujjzjc7Bh8SC/img/rectangle-5.png",
  },
  {
    id: 5,
    category: "WEB DEVELOPMENT",
    title: "Advanced JavaScript & ESNext",
    instructor: "by Jane Doe",
    rating: "4.8",
    reviews: "(1,250)",
    image: "https://c.animaapp.com/miujjzjc7Bh8SC/img/rectangle-5.png",
  },
  {
    id: 6,
    category: "WEB DEVELOPMENT",
    title: "Advanced JavaScript & ESNext",
    instructor: "by Jane Doe",
    rating: "4.8",
    reviews: "(1,250)",
    image: "https://c.animaapp.com/miujjzjc7Bh8SC/img/rectangle-5.png",
  },
];

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

  return (
    <section className="courses-list-section">
      <header className="courses-header">
        <div className="header-left">
          <h2 className="courses-title">All Courses</h2>
          <p className="courses-subtitle">Showing 833 courses</p>
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
        {coursesData.map((course, index) => (
          <div
            key={course.id}
            className="course-card"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="course-image">
              <img src={course.image} alt={course.title} />
            </div>

            <div className="course-content">
              <p className="course-category">{course.category}</p>
              <h3 className="course-title">{course.title}</h3>
              <p className="course-instructor">{course.instructor}</p>

              <div className="course-rating">
                <span className="rating-number">{course.rating}</span>
                <img
                  className="rating-stars"
                  alt="Rating stars"
                  src="https://c.animaapp.com/miujjzjc7Bh8SC/img/frame.svg"
                />
                <span className="rating-reviews">{course.reviews}</span>
              </div>

              <button
                onClick={() => navigate("/coursedetails")}
                className="details-btn"
              >
                View Details
              </button>
            </div>
          </div>
        ))}
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
                item.active
                  ? "pagination-btn active"
                  : "pagination-btn"
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
