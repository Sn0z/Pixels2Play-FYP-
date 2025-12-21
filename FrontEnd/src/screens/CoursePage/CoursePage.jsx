import React, { useState } from "react";
import CoursesListSection from "./CoursesListSection";
import FooterSection from "../Footer";
import NavigationBarSection from "../Header";
import "./CoursePage.css";

const levelOptions = [
  { id: "beginner", label: "Beginner" },
  { id: "intermediate", label: "Intermediate" },
  { id: "advanced", label: "Advanced" }
];

export default function CoursesPage() {
  const [selectedLevels, setSelectedLevels] = useState([]);

  const handleLevelChange = (id, checked) => {
    if (checked) {
      setSelectedLevels([...selectedLevels, id]);
    } else {
      setSelectedLevels(selectedLevels.filter(level => level !== id));
    }
  };

  const handleClearAll = () => {
    setSelectedLevels([]);
  };

  return (
    <div className="courses-container">
      <NavigationBarSection />
      <main className="courses-main">
        <div className="courses-content">
          <aside className="courses-sidebar">
            <div className="filter-card">
              <div className="filter-header">
                <h2 className="filter-title">Filters</h2>
                <button className="clear-btn" onClick={handleClearAll}>Clear all</button>
              </div>

              <div className="divider"></div>

              <div className="filter-section">
                <h3 className="filter-subtitle">Level</h3>
                <div className="checkbox-list">
                  {levelOptions.map(level => (
                    <label key={level.id} className="checkbox-item">
                      <input
                        type="checkbox"
                        checked={selectedLevels.includes(level.id)}
                        onChange={e => handleLevelChange(level.id, e.target.checked)}
                      />
                      <span>{level.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="divider"></div>
            </div>
          </aside>

          <section className="courses-list">
            <CoursesListSection />
          </section>
        </div>
      </main>
      <FooterSection />
    </div>
  );
}
