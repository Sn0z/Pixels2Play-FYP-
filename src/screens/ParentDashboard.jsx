export default function ParentDashboard() {
  return (
    <section className="parent-dashboard-section">
      <div className="container parent-dashboard-container">
        <div className="parent-content">
          <span className="tag">FOR PARENTS & EDUCATORS</span>
          <h2>Stay Connected to Your Child's Progress</h2>
          <p>Track milestones, view certificates, and celebrate achievements.</p>

          <ul className="parent-features-list">
            <li>
              <div className="parent-feature-icon icon-blue">
                <img src="../public/assets/17_1286.png" alt="" />
              </div>
              <div className="parent-feature-text">
                <h4>Real-Time Progress Tracking</h4>
                <p>Monitor completed lessons, learning time, and skills mastered.</p>
              </div>
            </li>

            <li>
              <div className="parent-feature-icon icon-green">
                <img src="../public/assets/17_1295.png" alt="" />
              </div>
              <div className="parent-feature-text">
                <h4>Downloadable Certificates</h4>
                <p>Celebrate course completions and milestones.</p>
              </div>
            </li>

            <li>
              <div className="parent-feature-icon icon-purple">
                <img src="../public/assets/17_1305.png" alt="" />
              </div>
              <div className="parent-feature-text">
                <h4>Healthy Screen Time Controls</h4>
                <p>Break reminders and balanced learning habits.</p>
              </div>
            </li>

            <li>
              <div className="parent-feature-icon icon-yellow">
                <img src="../public/assets/17_1314.png" alt="" />
              </div>
              <div className="parent-feature-text">
                <h4>Teacher Bulk Licensing</h4>
                <p>Classroom tools and school integration.</p>
              </div>
            </li>
          </ul>
        </div>

        <div className="parent-image-wrapper">
          <img src="../public/assets/e5d23674024f22ae00741d09a90c3cf6009e96f8.png" alt="Children using tablet" className="parent-main-image" />

          <div className="progress-card">
            <div className="progress-card-header">
              <div className="progress-avatar">
                <img src="../public/assets/00c5f913714acb5b0000edf8ed8494bb4bee0436.png" alt="avatar" />
              </div>
              <div>
                <h4>Sarah's Progress</h4>
                <span>Level 12 - Middle Course</span>
              </div>
            </div>

            <div className="progress-bar-info">
              <span>Lessons Completed</span>
              <span className="progress-ratio">47/100</span>
            </div>

            <div className="progress-bar-container">
              <div className="progress-bar-fill"></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
