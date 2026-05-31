import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import "../ContactPage/ContactPage.css"; // Reuse the same CSS for the form body

const contactOptions = [
  {
    icon: "https://c.animaapp.com/mivb9xbveuUpZM/img/ic-outline-email.svg",
    title: "Email Us Directly",
    subtitle: "support@ailearners.com",
    link: "https://mail.google.com/mail/?view=cm&fs=1&to=prarambha124@gmail.com&su=Support%20Request%20-%20AI%20Learners",
  },
  {
    icon: "https://c.animaapp.com/mivb9xbveuUpZM/img/mage-message-question-mark.svg",
    title: "Check our FAQs",
    subtitle: "Find answers to common questions",
  },
];

export default function ChildContactPage() {
  const [result, setResult] = useState("");
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const auth = getAuth();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
      } else {
        navigate("/login");
      }
    });
    return () => unsub();
  }, [auth, navigate]);

  const profileName = user?.displayName || user?.email?.split("@")[0] || "Scholar";

  const handleSignOut = async () => {
    await auth.signOut();
    navigate("/login");
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setResult("Sending...");

    const formData = new FormData(event.target);
    formData.append("access_key", "8bded720-f1e0-491b-a037-7dd738cf53fe");

    try {
      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setResult("Message sent successfully!");
        event.target.reset();
      } else {
        setResult("Something went wrong. Please try again.");
      }
    } catch (error) {
      setResult("Network error. Please try again later.");
    }
  };

  return (
    <div className="ccp-page" style={{ background: "#ffffff", minHeight: "100vh" }}>
      {/* ── Child Navigation Header ── */}
      <div className="main-navigation" style={{ backgroundColor: "#ffffff", boxShadow: "0px 4px 6px -4px #0000001a, 0px 10px 15px -3px #0000001a", display: "flex", height: "80px", width: "100%", position: "sticky", top: "0", zIndex: "100" }}>
        <div className="frame-frame-2" style={{ display: "flex", flex: "1", alignItems: "center", justifyContent: "center", padding: "0 40px", maxWidth: "1390px", margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
          
          <div className="nav-links" style={{ display: "flex", gap: "32px", color: "#9233ea", fontFamily: "'Fredoka', Helvetica", fontSize: "17.8px", fontWeight: "700", flex: "1", justifyContent: "center" }}>
            <div style={{cursor:"pointer"}} onClick={() => navigate("/kidshome")}>Home</div>
            <div style={{cursor:"pointer"}} onClick={() => navigate("/child-courses")}>Courses</div>
            <div style={{cursor:"pointer"}} onClick={() => navigate("/kidshome#games-section")}>Games</div>
            <div style={{ color: "#ec4899" }}>Contact Us</div>
          </div>
          {/* User Info & Sign Out */}
          <div className="child-nav-user" style={{ display: 'flex', alignItems: 'center', gap: '15px', marginLeft: 'auto' }}>
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
        </div>
      </div>

      {/* ── Parent Contact Body Content ── */}
      <section className="contact-section">
        <div className="contact-wrapper">
          <header className="contact-header">
            <h1 className="contact-title">Get in Touch!</h1>
            <p className="contact-subtitle">
              Have a question or need a hand? We're happy to help!
            </p>
          </header>

          <div className="contact-options">
            {contactOptions.map((option, index) => (
              <div
                key={index}
                className={`contact-card ${option.link ? "clickable" : ""}`}
                onClick={() => option.link && window.open(option.link, "_blank")}
              >
                <div className="contact-card-content">
                  <div className="contact-icon-box">
                    <img className="contact-icon" src={option.icon} alt={option.title} />
                  </div>
                  <div className="contact-texts">
                    <h3 className="contact-card-title">{option.title}</h3>
                    <p className="contact-card-subtitle">{option.subtitle}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="contact-form-card">
            <h2 className="contact-form-title">Send us a Message</h2>

            <form className="contact-form" onSubmit={onSubmit}>
              <div className="form-group">
                <label htmlFor="name" className="form-label">Your Name</label>
                <input id="name" name="name" type="text" placeholder="What should we call you?" className="form-input" required />
              </div>

              <div className="form-group">
                <label htmlFor="email" className="form-label">Your Email</label>
                <input id="email" name="email" type="email" placeholder="So we can reply back to you" className="form-input" required />
              </div>

              <div className="form-group">
                <label htmlFor="message" className="form-label">How can we help?</label>
                <textarea id="message" name="message" placeholder="Describe your question or issue here..." className="form-textarea" required></textarea>
              </div>

              {result && <p className="success-text">{result}</p>}

              <button type="submit" className="form-button">Send Message</button>
            </form>
          </div>
        </div>
      </section>

      {/* ── Child Footer ── */}
      <div className="main-footer" style={{ backgroundColor: "#111727", display: "flex", minHeight: "369px", position: "relative", width: "100%", marginTop: "40px", justifyContent: "center" }}>
          <div className="frame" style={{ display: "flex", flexDirection: "column", gap: "32px", marginTop: "48px", width: "100%", maxWidth: "1280px", padding: "0 40px" }}>
            <div className="div" style={{ display: "flex", gap: "32px", width: "1280px" }}>
              <div className="div-2" style={{ display: "flex", flexDirection: "column", gap: "16px", height: "180px", width: "296px" }}>
                <div className="frame-2" style={{ display: "flex", gap: "8px", width: "296px" }}>
                  <div className="div-wrapper" style={{ background: "linear-gradient(135deg, rgba(192, 132, 252, 1) 0%, rgba(244, 114, 182, 1) 100%)", borderRadius: "9999px", display: "flex", height: "48px", width: "48px" }}>
                    <div className="text-wrapper" style={{ alignItems: "center", color: "#ffffff", display: "flex", fontFamily: "'Fredoka', Helvetica", fontSize: "24px", fontWeight: "700", height: "32px", justifyContent: "center", marginLeft: "16.8px", marginTop: "8.0px", textAlign: "center", width: "14.34px" }}>K</div>
                  </div>
                  <div className="text-wrapper-2" style={{ color: "#ffffff", fontFamily: "'Fredoka', Helvetica", fontSize: "24px", fontWeight: "700", height: "32px", marginTop: "8px", whiteSpace: "nowrap", width: "97px" }}>KidLearn</div>
                </div>
                <p className="p" style={{ color: "#9ca2ae", fontFamily: "'Fredoka', Helvetica", fontSize: "17.7px", fontWeight: "400", lineHeight: "28px" }}>Making learning fun for kids everywhere!</p>
              </div>

              {/* Removing verbose links from footer for brevity to match requested body wrapping, but reproducing the basic structure */}
            </div>
            
            <div className="footer-bottom" style={{ borderColor: "#1f2937", borderTopStyle: "solid", borderTopWidth: "0.8px", display: "flex", height: "61px", width: "100%", maxWidth: "1280px", margin: "0 40px" }}>
              <div className="text-wrapper-9" style={{ color: "#9ca2ae", fontFamily: "'Fredoka', Helvetica", fontSize: "18px", fontWeight: "400", lineHeight: "28px", marginTop: "32.8px", textAlign: "center", width: "100%" }}>
                © 2026 KidLearn. All rights reserved.
              </div>
            </div>
          </div>
        </div>

    </div>
  );
}
