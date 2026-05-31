import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getAuth } from "firebase/auth";
import FooterSection from "../Footer";
import NavigationBarSection from "../Header";
import "./checkout.css";

const PLAN_DETAILS = {
  starter: {
    name: "Starter Plan",
    emoji: "🌱",
    description: "1 child • Beginner courses • Basic Scratch projects",
    colorClass: "badge-starter",
  },
  pro: {
    name: "Pro Plan",
    emoji: "🚀",
    description: "Up to 2 children • All beginner & intermediate courses",
    colorClass: "badge-pro",
  },
  family: {
    name: "Family Plan",
    emoji: "👨‍👩‍👧‍👦",
    description: "Up to 5 children • All courses including advanced",
    colorClass: "badge-family",
  },
};

export default function Checkout() {
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();

  const planId = searchParams.get("plan") || "pro";
  const billing = searchParams.get("billing") || "monthly";
  const amount = Number(searchParams.get("amount")) || 599;

  const plan = PLAN_DETAILS[planId] || PLAN_DETAILS.pro;
  const amountInPaisa = amount * 100;

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

      const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";
      const res = await fetch(`${API_BASE}/payments/initiate/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          plan_id: planId,
          billing_cycle: billing,
          amount: amountInPaisa,
        }),
      });

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
            <a href="/pricing" className="back-link">
              ← Back to Pricing
            </a>
            <h1>Complete Your Subscription</h1>
            <p>You're one step away from unlocking all the fun!</p>
          </div>

          <div className="layout">
            <div>
              {/* Subscription Summary */}
              <section className="card">
                <h2> Subscription Summary</h2>

                <div className="order">
                  <div className="plan-icon-circle">{plan.emoji}</div>

                  <div className="order-info">
                    <span className={`badge ${plan.colorClass}`}>
                      {billing === "yearly" ? "Annual" : "Monthly"} Subscription
                    </span>
                    <h3>{plan.name}</h3>
                    <p>{plan.description}</p>

                    <div className="price-box">
                      <div>
                        <span>Plan</span>
                        <span>{plan.name}</span>
                      </div>
                      <div>
                        <span>Billing Cycle</span>
                        <span style={{ textTransform: "capitalize" }}>{billing}</span>
                      </div>
                      <div>
                        <span>Subtotal</span>
                        <span>Rs. {amount}.00</span>
                      </div>
                      <div>
                        <span>Tax</span>
                        <span>Rs. 0.00</span>
                      </div>
                      <div className="total">
                        <span>Total</span>
                        <span>Rs. {amount}.00</span>
                      </div>
                    </div>
                  </div>

                  <div className="price">Rs. {amount}</div>
                </div>
              </section>

              {/* Payment Method */}
              <section className="card">
                <h2>Payment Method</h2>

                <div className="payment">
                  <strong>Pay with Khalti</strong>
                  <span className="khalti">KHALTI</span>
                </div>

                <button
                  className="pay-btn"
                  onClick={handleKhaltiPayment}
                  disabled={loading}
                >
                  {loading
                    ? "Redirecting..."
                    : `Subscribe for Rs. ${amount}.00 / ${billing === "yearly" ? "year" : "month"} →`}
                </button>

                <p className="terms">
                  By subscribing, you agree to our Terms &amp; Privacy Policy.
                  You can cancel anytime.
                </p>
              </section>
            </div>

            <aside className="right">
              <div className="info-card">
                <h3>✅ Satisfaction Guarantee</h3>
                <p>
                  7-day money-back guarantee if your child doesn't love the
                  first week — no questions asked.
                </p>
              </div>

              <div className="info-card subscription-perks">
                <h3>Subscription Benefits</h3>
                <ul className="perks-list">
                  <li>✓ Cancel anytime, no lock-in</li>
                  <li>✓ Instant access after payment</li>
                  <li>✓ Auto-renews each {billing === "yearly" ? "year" : "month"}</li>
                  <li>✓ Upgrade or downgrade at any time</li>
                </ul>
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
