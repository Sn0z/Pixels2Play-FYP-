export default function Hero() {
  return (
    <section className="hero-section" id="hero">
      <div className="container hero-container">
        <div className="hero-content">
          <h1>
            Learn AI Through <span className="highlight-text">Play & Discovery</span>
          </h1>

          <p className="hero-subtitle">
            Interactive courses, gamified challenges, and hands-on projects that
            make artificial intelligence exciting and accessible for young minds.
          </p>

          <div className="hero-cta">
            <a href="#" className="btn btn-primary">Start Learning Free</a>
            <a href="#" className="btn btn-secondary">Watch Demo Video</a>
          </div>

          <div className="hero-stats">
            <div className="stat-item">
              <span className="stat-number stat-purple">50,000+</span>
              <span className="stat-label">Young Learners</span>
            </div>
            <div className="stat-item">
              <span className="stat-number stat-blue">200+</span>
              <span className="stat-label">Interactive Lessons</span>
            </div>
            <div className="stat-item">
              <span className="stat-number stat-green">98%</span>
              <span className="stat-label">Parent Satisfaction</span>
            </div>
          </div>
        </div>

        <div className="hero-image-wrapper">
          <img
            src="../public/assets/3272fb483fe937fb446d281c726dbb31c8daf448.png"
            alt="A young girl using a computer"
            className="hero-main-image"
          />

          <div className="hero-icon-card hero-icon-top">
            <img src="../public/assets/17_1547.png" alt="Trophy Icon" />
          </div>

          <div className="hero-icon-card hero-icon-bottom">
            <img src="../public/assets/17_1551.png" alt="Robot Icon" />
          </div>
        </div>
      </div>
    </section>
  );
}
