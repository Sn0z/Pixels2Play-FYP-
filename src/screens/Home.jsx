import "../App.css";

import Header from "../screens/Header";
import Hero from "../screens/Hero";
import Courses from "../screens/Courses";
import Features from "../screens/Features";
import Projects from "../screens/Projects";
import ParentDashboard from "../screens/ParentDashboard";
import AdditionalFeatures from "../screens/AdditionalFeatures";
import Testimonials from "../screens/Testimonials";
import CTA from "../screens/CTA";
import Footer from "../screens/Footer";

export default function App() {
  return (
    <>
        <Header />
        <Hero />
        <Courses />
        <Features />
        <Projects />
        <ParentDashboard />
        <AdditionalFeatures />
        <Testimonials />
        <CTA />
        <Footer />
    </>
  );
}
