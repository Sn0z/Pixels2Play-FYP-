export default function Testimonials() {
  return (
    <section className="testimonials-section" id="testimonials">
      <div className="container">
        <div className="section-header">
          <h2>What Parents & Kids Say</h2>
          <p>Real stories from families learning AI together</p>
        </div>

        <div className="testimonials-grid">
          <div className="testimonial-card">
            <div className="testimonial-author">
              <img src="../public/assets/ba8fcd76241e9e81fd5aa0b21b4a084e0b39c1c6.png" alt="Jennifer" />
              <div>
                <h4>Jennifer M.</h4>
                <span>Parent of 11-year-old</span>
              </div>
            </div>
            <p>"My daughter went from zero coding knowledge to building a chatbot in 3 weeks!"</p>
          </div>

          <div className="testimonial-card">
            <div className="testimonial-author">
              <img src="../public/assets/0a97b3492647450960bd15f897755c044a06dce4.png" alt="David" />
              <div>
                <h4>David R.</h4>
                <span>Middle School Teacher</span>
              </div>
            </div>
            <p>"The classroom tools are fantastic. Students are more engaged than ever."</p>
          </div>

          <div className="testimonial-card">
            <div className="testimonial-author">
              <img src="../public/assets/525671cb46e96fdf62791b2a00715c0062fceaf9.png" alt="Alex" />
              <div>
                <h4>Alex, Age 13</h4>
                <span>Student</span>
              </div>
            </div>
            <p>"I love earning badges and showing my projects to friends!"</p>
          </div>
        </div>
      </div>
    </section>
  );
}
