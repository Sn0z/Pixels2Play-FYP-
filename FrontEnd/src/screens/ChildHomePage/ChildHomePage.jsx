import { useNavigate } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { useState, useEffect } from "react";
import "./ChildHomePage.css";

const ChildHomePage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const auth = getAuth();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
      }
    });
    return () => unsub();
  }, []);

  const profileName = user?.displayName || user?.email?.split("@")[0] || "Scholar";

  const handleSignOut = async () => {
    await auth.signOut();
    navigate("/login");
  };
  return (
    <div className="kids-home-page" data-model-id="201:812">
      <div className="root">
        {/* Main Navigation */}
        <div className="main-navigation">
          <div className="frame-frame-2">
            <div className="nav-links">
              <div className="text-wrapper-96" style={{cursor:"pointer"}} onClick={() => window.location.href="/kidshome"}>Home</div>
              <div 
                className="text-wrapper-97" 
                style={{cursor:"pointer"}} 
                onClick={() => window.location.href="/child-courses"}
              >
                Courses
              </div>
              <div className="text-wrapper-98" style={{cursor:"pointer"}} onClick={() => {
                const el = document.getElementById("games-section");
                if (el) el.scrollIntoView({ behavior: "smooth" });
                else window.location.href = "/kidshome#games-section";
              }}>
                Games
              </div>
              <div className="text-wrapper-99" style={{cursor:"pointer"}} onClick={() => window.location.href="/child-contact"}>
                Contact Us
              </div>
            </div>
            {/* User Info & Sign Out */}
            {user && (
              <div className="child-nav-user" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <span style={{ color: '#571c86', fontWeight: 'bold', fontSize: '18px' }}>
                  Hi, {profileName}!
                </span>
                <button 
                  onClick={handleSignOut}
                  style={{ 
                    backgroundColor: '#ff4b4b', color: 'white', border: 'none', 
                    padding: '8px 16px', borderRadius: '20px', cursor: 'pointer',
                    fontWeight: 'bold', fontSize: '14px', boxShadow: '0 4px 6px rgba(255, 75, 75, 0.2)'
                  }}
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Hero Section */}
        <div className="hero-container">
          <div className="hero-section-frame">
            <div className="heading">
              <div className="learn-have-fun">Learn &amp; Have Fun!</div>
              <img
                className="text"
                alt="Text"
                src="https://c.animaapp.com/mjz9fyhyo2NftK/img/text.svg"
              />
            </div>

            <p className="text-wrapper-94">
              Discover amazing courses designed just for kids! From coding to art,
              science to music - learn something new every day!
            </p>

            <div className="button-wrapper">
              <button className="button-13" onClick={() => window.location.href="/child-courses"}>
                <div className="text-wrapper-95">Explore Courses</div>
              </button>
            </div>
          </div>

          <img
            className="hero-section-frame-2"
            alt="Hero section frame"
            src="https://c.animaapp.com/mjz9fyhyo2NftK/img/hero-section----frame----frame----hero-illustration----image.svg"
          />
        </div>

        {/* Stats Section */}
        <div className="stats-section">
          <div className="frame-frame">
            <div className="stat-card">
              <div className="text-wrapper-86">500+</div>
              <div className="text-wrapper-87">Courses</div>
            </div>

            <div className="stat-card">
              <div className="text-wrapper-88">10K+</div>
              <div className="text-wrapper-89">Happy Kids</div>
            </div>

            <div className="stat-card">
              <div className="text-wrapper-90">50+</div>
              <div className="text-wrapper-91">Teachers</div>
            </div>

            <div className="stat-card">
              <div className="text-wrapper-92">100%</div>
              <div className="text-wrapper-93">Fun</div>
            </div>
          </div>
        </div>

        {/* Games Section */}
        <div className="games-section" id="games-section">
          <div className="frame-13">
            <div className="section-header-2">
              <div className="text-wrapper-22">Fun Games Arcade!</div>
              <p className="text-wrapper-23">
                Play and learn with our exciting mini-games!
              </p>
            </div>

            <div className="features-grid">
              <div className="game-card">
                <div className="game-icon">
                  <img src="https://cdn-icons-png.flaticon.com/512/7496/7496049.png" alt="Whack-a-Mole" style={{width:'48px',height:'48px',objectFit:'contain'}} />
                </div>
                <div className="text-wrapper-24">Whack-a-Mole Math</div>
                <p className="text-wrapper-25">
                  Solve math equations and whack the right mole!
                </p>
                <button className="play-btn" onClick={() => navigate("/games/whack-a-mole")}>Play Now</button>
              </div>

              <div className="game-card game-card-2">
                <div className="game-icon">
                  <img src="https://cdn-icons-png.flaticon.com/512/5133/5133100.png" alt="Rock Paper Scissors" style={{width:'48px',height:'48px',objectFit:'contain'}} />
                </div>
                <div className="text-wrapper-24">Rock, Paper, Scissors</div>
                <p className="text-wrapper-26">
                  Can you beat the computer?
                </p>
                <button className="play-btn" onClick={() => navigate("/games/rock-paper-scissors")}>Play Now</button>
              </div>

              <div className="game-card game-card-3">
                <div className="game-icon">
                  <img src="https://cdn-icons-png.flaticon.com/512/3077/3077952.png" alt="Jumping Dino" style={{width:'48px',height:'48px',objectFit:'contain'}} />
                </div>
                <div className="text-wrapper-24">Jumping Dino</div>
                <p className="text-wrapper-25">
                  Jump over obstacles and get the high score!
                </p>
                <button className="play-btn" onClick={() => navigate("/games/dino")}>Play Now</button>
              </div>
            </div>
          </div>
        </div>

        {/* Why Choose Us */}
        <div className="why-choose-us">
          <div className="frame-13">
            <div className="section-header-2">
              <div className="text-wrapper-22">Why Kids Love Us!</div>
              <p className="text-wrapper-23">
                We make learning super fun and easy!
              </p>
            </div>

            <div className="features-grid">
              <div className="feature-card">
                <img
                  className="feature-icon"
                  alt="Feature icon"
                  src="https://c.animaapp.com/mjz9fyhyo2NftK/img/feature-icon-1.svg"
                />
                <div className="text-wrapper-24">Expert Teachers</div>
                <p className="text-wrapper-25">
                  Friendly teachers who love working with kids!
                </p>
              </div>

              <div className="feature-card-2">
                <img
                  className="feature-icon"
                  alt="Feature icon"
                  src="https://c.animaapp.com/mjz9fyhyo2NftK/img/feature-icon.svg"
                />
                <div className="text-wrapper-24">Interactive Fun</div>
                <p className="text-wrapper-26">
                  Games, activities, and hands-on projects!
                </p>
              </div>

              <div className="feature-card-3">
                <img
                  className="feature-icon"
                  alt="Feature icon"
                  src="https://c.animaapp.com/mjz9fyhyo2NftK/img/feature-icon-2.svg"
                />
                <div className="text-wrapper-24">Earn Certificates</div>
                <p className="text-wrapper-25">
                  Get cool certificates when you complete courses!
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Testimonials */}
        <div className="testimonials">
          <div className="frame-5">
            <div className="section-header">
              <p className="what-kids-parents">What Kids &amp; Parents Say</p>
              <p className="text-wrapper-14">Hear from our happy learners!</p>
            </div>

            <div className="testimonials-grid">
              <div className="testimonial-card">
                <img
                  className="img"
                  alt="Frame"
                  src="https://c.animaapp.com/mjz9fyhyo2NftK/img/frame.svg"
                />
                <p className="text-wrapper-15">
                  &#34;I love the coding class! I made my own game and showed it to
                  all my friends. It&#39;s so cool!&#34;
                </p>
                <div className="frame-6">
                  <div className="frame-7">
                    <div className="text-wrapper-16">E</div>
                  </div>
                  <div className="frame-8">
                    <div className="text-wrapper-17">Emma, Age 10</div>
                    <div className="text-wrapper-18">Coding Student</div>
                  </div>
                </div>
              </div>

              <div className="testimonial-card">
                <img
                  className="img"
                  alt="Frame"
                  src="https://c.animaapp.com/mjz9fyhyo2NftK/img/frame.svg"
                />
                <p className="text-wrapper-15">
                  &#34;My son absolutely loves the science experiments. He can&#39;t
                  wait for each class! Great platform!&#34;
                </p>
                <div className="frame-6">
                  <div className="frame-9">
                    <div className="text-wrapper-19">S</div>
                  </div>
                  <div className="frame-10">
                    <div className="text-wrapper-17">Sarah (Parent)</div>
                    <div className="text-wrapper-18">Mom of Alex, 9</div>
                  </div>
                </div>
              </div>

              <div className="testimonial-card">
                <img
                  className="img"
                  alt="Frame"
                  src="https://c.animaapp.com/mjz9fyhyo2NftK/img/frame.svg"
                />
                <p className="text-wrapper-15">
                  &#34;The art class is amazing! I learned so many new drawing
                  techniques and made lots of cool artwork!&#34;
                </p>
                <div className="frame-6">
                  <div className="frame-11">
                    <div className="text-wrapper-20">L</div>
                  </div>
                  <div className="frame-12">
                    <div className="text-wrapper-17">Lily, Age 8</div>
                    <div className="text-wrapper-21">Art Student</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="cta-section">
          <div className="frame-3">
            <p className="text-wrapper-10">Ready to Start Your Adventure?</p>
            <p className="text-wrapper-11">
              Join thousands of kids learning and having fun every day!
            </p>
            <div className="frame-4">
              <button className="button">
                <div className="text-wrapper-12">Browse All Courses</div>
              </button>
              <button className="button-2">
                <div className="text-wrapper-13">Try Free Course</div>
              </button>
            </div>
          </div>
        </div>

        {/* Main Footer */}
        <div className="main-footer">
          <div className="frame">
            <div className="div">
              <div className="div-2">
                <div className="frame-2">
                  <div className="div-wrapper">
                    <div className="text-wrapper">K</div>
                  </div>
                  <div className="text-wrapper-2">KidLearn</div>
                </div>
                <p className="p">Making learning fun for kids everywhere!</p>
              </div>

              <div className="div-2">
                <div className="text-wrapper-3">Quick Links</div>
                <div className="list">
                  <div className="text-wrapper-4">Home</div>
                  <div className="text-wrapper-5">All Courses</div>
                  <div className="text-wrapper-6">About Us</div>
                  <div className="text-wrapper-5">Contact</div>
                </div>
              </div>

              <div className="div-2">
                <div className="text-wrapper-3">For Parents</div>
                <div className="list">
                  <div className="text-wrapper-6">How It Works</div>
                  <div className="text-wrapper-5">Safety &amp; Privacy</div>
                  <div className="text-wrapper-7">FAQs</div>
                  <div className="text-wrapper-5">Testimonials</div>
                </div>
              </div>

              <div className="div-2">
                <div className="text-wrapper-8">Get In Touch</div>
                <div className="list-2">
                  <div className="text-wrapper-6">hello@kidlearn.com</div>
                  <div className="text-wrapper-5">1-800-KIDS-FUN</div>
                  <div className="text-wrapper-5">Mon-Fri: 9am - 6pm</div>
                </div>
              </div>
            </div>

            <div className="footer-bottom">
              <p className="text-wrapper-9">
                © 2024 KidLearn. All rights reserved. Made with love for kids!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChildHomePage;