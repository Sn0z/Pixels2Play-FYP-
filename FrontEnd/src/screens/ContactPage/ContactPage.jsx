import React, { useState } from "react";
import FooterSection from "../Footer";
import NavigationBarSection from "../Header";
import "./ContactPage.css";

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

export default function ContactPage() {
  const [result, setResult] = useState("");

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
    <>
      <NavigationBarSection />

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
                    <img
                      className="contact-icon"
                      src={option.icon}
                      alt={option.title}
                    />
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
                <label htmlFor="name" className="form-label">
                  Your Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="What should we call you?"
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="email" className="form-label">
                  Your Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="So we can reply back to you"
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="message" className="form-label">
                  How can we help?
                </label>
                <textarea
                  id="message"
                  name="message"
                  placeholder="Describe your question or issue here..."
                  className="form-textarea"
                  required
                ></textarea>
              </div>

              {result && <p className="success-text">{result}</p>}

              <button type="submit" className="form-button">
                Send Message
              </button>
            </form>
          </div>
        </div>
      </section>

      <FooterSection />
    </>
  );
}
