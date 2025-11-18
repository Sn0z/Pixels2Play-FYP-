export default function Footer() {
  return (
    <footer className="site-footer-main" id="footer">
      <div className="container footer-top">
        <div className="footer-brand">
          <h3 className="logo-text">Pixles2Play</h3>
          <p>Fun, safe, and engaging AI education for kids ages 8-16.</p>
        </div>

        <div className="footer-links">
          <h4>Explore</h4>
          <ul>
            <li><a href="#hero">Home</a></li>
            <li><a href="#courses">Courses</a></li>
            <li><a href="#projects">Projects</a></li>
            <li><a href="#testimonials">Testimonials</a></li>
          </ul>
        </div>

        <div className="footer-links">
          <h4>Support</h4>
          <ul>
            <li><a href="#">Help Center</a></li>
            <li><a href="#">Parent Guide</a></li>
            <li><a href="#">School Accounts</a></li>
          </ul>
        </div>

        <div className="footer-links">
          <h4>Connect</h4>
          <ul>
            <li><a href="#">Facebook</a></li>
            <li><a href="#">YouTube</a></li>
            <li><a href="#">Instagram</a></li>
          </ul>
        </div>
      </div>

      <div className="container footer-bottom">
        <span className="copyright">
          © {new Date().getFullYear()} Pixles2Play. All rights reserved.
        </span>
      </div>
    </footer>
  );
}