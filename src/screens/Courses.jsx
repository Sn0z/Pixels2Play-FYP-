export default function Courses() {
  return (
    <section className="courses-section" id="courses">
      <div className="container">
        <div className="section-header">
          <h2>Choose Your Learning Journey</h2>
          <p>Age-appropriate courses designed to grow with your child's skills and interests</p>
        </div>

        <div className="course-cards-grid">
          {/* Elementary */}
          <div className="course-card elementary">
            <div className="course-icon-wrapper">
              <img src="../public/assets/17_1442.png" alt="Elementary Icon" />
            </div>
            <h3>Elementary</h3>
            <span className="course-age">Ages 8-10</span>
            <p className="course-description">
              Introduction to AI concepts through fun games, visual programming blocks, and interactive storytelling.
            </p>
            <ul className="course-features">
              <li>Visual drag-and-drop coding</li>
              <li>AI-powered games & puzzles</li>
              <li>Friendly mascot guidance</li>
              <li>50+ interactive lessons</li>
            </ul>
            <a href="#" className="btn course-btn">Explore Course</a>
          </div>

          {/* Middle */}
          <div className="course-card middle popular">
            <div className="popular-tag">Most Popular</div>
            <div className="course-icon-wrapper">
              <img src="../public/assets/17_1468.png" alt="Middle School Icon" />
            </div>
            <h3>Middle</h3>
            <span className="course-age">Ages 11-13</span>
            <p className="course-description">
              Build real AI projects like chatbots and image classifiers with guided tutorials and creative challenges.
            </p>
            <ul className="course-features">
              <li>Create your own chatbot</li>
              <li>Image recognition projects</li>
              <li>AI art generator tools</li>
              <li>100+ hands-on activities</li>
            </ul>
            <a href="#" className="btn course-btn">Explore Course</a>
          </div>

          {/* Advanced */}
          <div className="course-card advanced">
            <div className="course-icon-wrapper">
              <img src="../public/assets/17_1493.png" alt="Advanced Icon" />
            </div>
            <h3>Advanced</h3>
            <span className="course-age">Ages 14-16</span>
            <p className="course-description">
              Deep dive into machine learning, neural networks, and complex AI systems with real-world applications.
            </p>
            <ul className="course-features">
              <li>Machine learning basics</li>
              <li>Neural network projects</li>
              <li>Real-world AI applications</li>
              <li>150+ advanced challenges</li>
            </ul>
            <a href="#" className="btn course-btn">Explore Course</a>
          </div>
        </div>
      </div>
    </section>
  );
}
