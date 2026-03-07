import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../Header";
import Footer from "../Footer";
import "./pricing.css";

const plans = [
  {
    id: "starter",
    name: "Starter",
    emoji: "🌱",
    price: { monthly: 299, yearly: 239 },
    description: "Perfect for one child just getting started with coding.",
    colorClass: "plan-starter",
    features: [
      "1 child account",
      "Access to beginner courses",
      "Basic Scratch projects",
      "Weekly progress reports",
      "Email support",
    ],
    notIncluded: ["Advanced courses", "Multiple children", "Live sessions"],
    cta: "Get Started",
  },
  {
    id: "pro",
    name: "Pro",
    emoji: "🚀",
    price: { monthly: 599, yearly: 479 },
    description: "The most popular plan for growing young coders.",
    colorClass: "plan-pro",
    popular: true,
    features: [
      "Up to 2 child accounts",
      "All beginner & intermediate courses",
      "Scratch, Python & Web projects",
      "Detailed progress analytics",
      "Priority email & chat support",
      "Monthly live Q&A sessions",
    ],
    notIncluded: ["Unlimited children"],
    cta: "Start Free Trial",
  },
  {
    id: "family",
    name: "Family",
    emoji: "👨‍👩‍👧‍👦",
    price: { monthly: 999, yearly: 799 },
    description: "Unlimited learning for the whole family.",
    colorClass: "plan-family",
    features: [
      "Up to 5 child accounts",
      "All courses including advanced",
      "Scratch, Python, Web & AI projects",
      "Full progress dashboard for parents",
      "Dedicated account manager",
      "Weekly live coding sessions",
      "Certificate of completion",
    ],
    notIncluded: [],
    cta: "Go Family",
  },
];

export default function Pricing() {
  const [billing, setBilling] = useState("monthly");
  const navigate = useNavigate();

  const getDisplayAmount = (plan) =>
    billing === "yearly" ? plan.price.yearly * 12 : plan.price.monthly;

  const handleChoosePlan = (plan) => {
    navigate(`/checkout?plan=${plan.id}&billing=${billing}&amount=${getDisplayAmount(plan)}`);
  };

  return (
    <>
      <Header />
      <div className="pricing-page">
        <div className="container">
          {/* Hero */}
          <div className="pricing-hero section-header">
            <div className="pricing-tag">💳 Subscription Plans</div>
            <h1>
              Simple,{" "}
              <span className="highlight-text">Transparent</span> Pricing
            </h1>
            <p>
              Give your child the gift of coding. Choose a plan that fits your
              family and start learning today — cancel anytime.
            </p>

            {/* Billing Toggle */}
            <div className="billing-toggle">
              <button
                className={`toggle-btn ${billing === "monthly" ? "active" : ""}`}
                onClick={() => setBilling("monthly")}
              >
                Monthly
              </button>
              <button
                className={`toggle-btn ${billing === "yearly" ? "active" : ""}`}
                onClick={() => setBilling("yearly")}
              >
                Yearly
                <span className="save-badge">Save 20%</span>
              </button>
            </div>
          </div>

          {/* Plans Grid */}
          <div className="plans-grid">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`plan-card ${plan.colorClass} ${plan.popular ? "popular" : ""}`}
              >
                {plan.popular && (
                  <div className="popular-tag">⭐ Most Popular</div>
                )}

                <div className="plan-header">
                  <div className="plan-emoji">{plan.emoji}</div>
                  <h2 className="plan-name">{plan.name}</h2>
                  <p className="plan-description">{plan.description}</p>
                </div>

                <div className="plan-price">
                  <span className="currency">Rs.</span>
                  <span className="amount">{getDisplayAmount(plan).toLocaleString()}</span>
                  <span className="period">/ {billing === "yearly" ? "year" : "month"}</span>
                </div>
                {billing === "yearly" && (
                  <p className="billed-annually">
                    Rs. {plan.price.yearly}/mo — save Rs. {(plan.price.monthly - plan.price.yearly) * 12}/yr
                  </p>
                )}

                <button
                  className={`plan-cta-btn ${plan.popular ? "btn-popular" : ""}`}
                  onClick={() => handleChoosePlan(plan)}
                >
                  {plan.cta} →
                </button>

                <ul className="plan-features">
                  {plan.features.map((f, i) => (
                    <li key={i} className="feature-included">
                      <span className="feature-check">✓</span> {f}
                    </li>
                  ))}
                  {plan.notIncluded.map((f, i) => (
                    <li key={i} className="feature-excluded">
                      <span className="feature-cross">✗</span> {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Guarantee Banner */}
          <div className="guarantee-banner">
            <div className="guarantee-icon">🛡️</div>
            <div>
              <h3>7-Day Money-Back Guarantee</h3>
              <p>
                Not satisfied in the first week? We'll refund you — no questions
                asked.
              </p>
            </div>
          </div>

          {/* FAQ */}
          <div className="pricing-faq section-header">
            <h2>Frequently Asked Questions</h2>
          </div>
          <div className="faq-grid">
            {[
              {
                q: "Can I switch plans later?",
                a: "Yes! You can upgrade or downgrade your plan at any time from your account settings.",
              },
              {
                q: "Is there a free trial?",
                a: "The Pro plan includes a 7-day free trial so your child can explore before you commit.",
              },
              {
                q: "How many children can use one account?",
                a: "Starter supports 1 child, Pro supports 2, and Family supports up to 5 child profiles.",
              },
              {
                q: "What payment methods are accepted?",
                a: "We accept payments via Khalti. More payment options coming soon.",
              },
            ].map(({ q, a }, i) => (
              <div key={i} className="faq-card">
                <h4>{q}</h4>
                <p>{a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
