import React, { useState } from "react";
import { getAuth } from "firebase/auth";
import FooterSection from "../Footer";
import NavigationBarSection from "../Header";
import "./checkout.css";

export default function Checkout() {
  const [loading, setLoading] = useState(false);

  const handleKhaltiPayment = async () => {
    try {
      setLoading(true);

      const auth = getAuth();
      const user = auth.currentUser;

      if (!user) {
        alert("Please login to continue");
        return;
      }

      const token = await user.getIdToken();

      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api';
      const res = await fetch(
        `${API_BASE}/payments/initiate/`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            course_id: "scratch-101",
            amount: 9900, // paisa (Rs. 99)
          }),
        }
      );

      // 🔐 Prevent JSON parse crash
      if (!res.ok) {
        const text = await res.text();
        console.error("API error:", text);
        alert("Payment initiation failed");
        return;
      }

      const data = await res.json();

      if (!data.payment_url) {
        alert("Invalid response from server");
        return;
      }

      // 🔥 Redirect to Khalti
      window.location.href = data.payment_url;

    } catch (err) {
      console.error(err);
      alert("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <NavigationBarSection />

      <div className="app">
        <main className="container">
          <div className="page-header">
            <a href="/coursedetails" className="back-link">
              ← Back to Course Details
            </a>
            <h1>Checkout</h1>
            <p>Complete your purchase to start learning.</p>
          </div>

          <div className="layout">
            <div>
              <section className="card">
                <h2>🛒 Order Summary</h2>

                <div className="order">
                  <img
                    src="https://c.animaapp.com/miv5b7ziJolmTE/img/rectangle.png"
                    alt="Course"
                  />

                  <div className="order-info">
                    <span className="badge">Coding</span>
                    <h3>Creative Coding with Scratch</h3>
                    <p>Ages: 8–12 • 6 Weeks</p>

                    <div className="price-box">
                      <div><span>Subtotal</span><span>Rs. 99.00</span></div>
                      <div><span>Tax</span><span>Rs. 0.00</span></div>
                      <div className="total"><span>Total</span><span>Rs. 99.00</span></div>
                    </div>
                  </div>

                  <div className="price">Rs. 99</div>
                </div>
              </section>

              <section className="card">
                <h2>💳 Payment Method</h2>

                <div className="payment">
                  <strong>Pay with Khalti</strong>
                  <span className="khalti">KHALTI</span>
                </div>

                <button
                  className="pay-btn"
                  onClick={handleKhaltiPayment}
                  disabled={loading}
                >
                  {loading ? "Redirecting..." : "Pay Rs. 99.00 with KHALTI →"}
                </button>

                <p className="terms">
                  By clicking pay, you agree to our Terms & Privacy Policy.
                </p>
              </section>
            </div>

            <aside className="right">
              <div className="info-card">
                <h3>✅ Satisfaction Guarantee</h3>
                <p>
                  7-day money-back guarantee if your child doesn’t love the first
                  week.
                </p>
              </div>

              <div className="help-card">
                <h3>Need Help?</h3>
                <p>Our support team is here to help.</p>
                <a href="/contact">Chat with Support</a>
              </div>
            </aside>
          </div>
        </main>
      </div>

      <FooterSection />
    </>
  );
}
