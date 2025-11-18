export default function Projects() {
  return (
    <section className="projects-section" id="projects">
      <div className="container">
        <div className="section-header">
          <h2>Amazing Projects Kids Create</h2>
          <p>Explore incredible AI projects built by students like you</p>
        </div>

        <div className="projects-grid">
          <div className="project-card">
            <img src="../public/assets/7f69f0127d0b9d59c6d25e9ef4362e70908d3b09.png" alt="Chatbot Project" className="project-image" />
            <div className="project-content">
              <span className="project-category category-purple">CHATBOT PROJECT</span>
              <h3>My Personal Assistant</h3>
              <p>Build a chatbot that answers questions using natural language processing.</p>
              <div className="project-footer">
                <span className="project-age">Ages 11-13</span>
                <a href="#" className="project-link">View Project →</a>
              </div>
            </div>
          </div>

          <div className="project-card">
            <img src="../public/assets/32c7c95c4d9c56418d7a816b51542e303a266808.png" alt="Drawing Game" className="project-image" />
            <div className="project-content">
              <span className="project-category category-blue">IMAGE RECOGNITION</span>
              <h3>Guess the Drawing Game</h3>
              <p>Create a game that uses AI to guess hand-drawn images.</p>
              <div className="project-footer">
                <span className="project-age">Ages 8-10</span>
                <a href="#" className="project-link">View Project →</a>
              </div>
            </div>
          </div>

          <div className="project-card">
            <img src="../public/assets/8e49e1a3bd294e8ce2c60d40a452cbb1aa5867dd.png" alt="AI Art" className="project-image" />
            <div className="project-content">
              <span className="project-category category-pink">AI ART GENERATOR</span>
              <h3>Creative Art Studio</h3>
              <p>Teach AI your art style and watch it create new masterpieces.</p>
              <div className="project-footer">
                <span className="project-age">Ages 11-16</span>
                <a href="#" className="project-link">View Project →</a>
              </div>
            </div>
          </div>
        </div>

        <div className="projects-cta">
          <a href="#" className="btn btn-primary">Browse All Projects</a>
        </div>
      </div>
    </section>
  );
}
