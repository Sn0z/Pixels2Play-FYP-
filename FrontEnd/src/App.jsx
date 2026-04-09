import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./screens/Home";
import Login from "./screens/Login/Login";
import SignUp from "./screens/SignUp/SignUp";
import ForgotPassword from "./screens/ForgotPassword/ForgotPassword";
import Setup1 from "./screens/ChildAccountSetup/ChildAccountSetup1";
import Setup2 from "./screens/ChildAccountSetup/ChildAccountSetup2";
import Setup3 from "./screens/ChildAccountSetup/ChildAccountSetup3";
import CoursesPage from "./screens/CoursePage/CoursePage";
import AdminPanel from "./screens/AdminPannel/AdminDasboard";
import CourseDetailSection from "./screens/CoursePage/CourseDetailSection";
import Contact from "./screens/ContactPage/ContactPage";
import KidsChatbot from "./chatbot/Chatbot";
import CheckOut from "./screens/CheckOut/CheckOut";
import WatchDemo from "./screens/WatchDemo";
import AdminModules from "./screens/Admin/AdminModules";
import KidsHome from "./screens/ChildHomePage/ChildHomePage";
import Dashboard from "./screens/Profile/UserProfileDashboardSection";
import ChildSettings from "./screens/Profile/ChildSettings";
import Pricing from "./screens/Pricing/Pricing";
import ParentCoursesPage from "./screens/ParentCoursesPage/ParentCoursesPage";
import ChildCoursesPage from "./screens/ChildCoursesPage/ChildCoursesPage";
import ChildLearnPage from "./screens/ChildLearnPage/ChildLearnPage";
import ChildContactPage from "./screens/ChildContactPage/ChildContactPage";
import WhackAMoleGame from "./screens/WhackAMoleGame/WhackAMoleGame";
import DinoGame from "./screens/DinoGame/DinoGame";
import RoleSwitcher from "./components/RoleSwitcher";
import { AuthProvider } from "./contexts/authContext";
import { ErrorBoundary } from "./components/ErrorBoundary";


function App() {
  return (
    <AuthProvider>
      <ErrorBoundary>
        <Router>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/setup1" element={<Setup1 />} />
            <Route path="/setup2" element={<Setup2 />} />
            <Route path="/setup3" element={<Setup3 />} />
            <Route path="/courses" element={<CoursesPage />} />
            <Route path="/admin" element={<AdminPanel />} />
            <Route path="/coursedetails" element={<CourseDetailSection />} />
            <Route path="/coursedetails/:moduleId" element={<CourseDetailSection />} />
            <Route path="/watch/:moduleId" element={<WatchDemo />} />
            <Route path="/admin/modules" element={<AdminModules />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/chatbot" element={<KidsChatbot />} />
            <Route path="/kidschat" element={<KidsChatbot />} />
            <Route path="/checkout" element={<CheckOut />} />
            <Route path="/kidshome" element={<KidsHome />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/settings" element={<ChildSettings />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/parent-courses" element={<ParentCoursesPage />} />
            <Route path="/child-courses" element={<ChildCoursesPage />} />
            <Route path="/child-contact" element={<ChildContactPage />} />
            <Route path="/child-learn/:courseId" element={<ChildLearnPage />} />
            <Route path="/games/whack-a-mole" element={<WhackAMoleGame />} />
            <Route path="/games/dino" element={<DinoGame />} />
          </Routes>
          <RoleSwitcher />
        </Router>
      </ErrorBoundary>
    </AuthProvider>
  );
}

export default App;
