import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./screens/Home";
import Login from "./screens/Login/Login";
import SignUp from "./screens/SignUp/SignUp";
import Setup1 from "./screens/ChildAccountSetup/ChildAccountSetup1";
import Setup2 from "./screens/ChildAccountSetup/ChildAccountSetup2";
import Setup3 from "./screens/ChildAccountSetup/ChildAccountSetup3";
import Courses from "./screens/CoursePage/CoursePage";
import AdminPanel from "./screens/AdminPannel/AdminDasboard";
import CourseDetailSection from "./screens/CoursePage/CourseDetailSection";
import Contact from "./screens/ContactPage/ContactPage";
import ChatBot from "./chatbot/Chatbot";
import CheckOut from "./screens/CheckOut/CheckOut";
import WatchDemo from "./screens/WatchDemo";
import AdminModules from "./screens/Admin/AdminModules";
import { AuthProvider } from "./contexts/authContext";


function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/setup1" element={<Setup1 />} />
          <Route path="/setup2" element={<Setup2 />} />
          <Route path="/setup3" element={<Setup3 />} />
          <Route path="/courses" element={<Courses />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/coursedetails" element={<CourseDetailSection />} />
          <Route path="/coursedetails/:moduleId" element={<CourseDetailSection />} />
          <Route path="/watch/:moduleId" element={<WatchDemo />} />
          <Route path="/admin/modules" element={<AdminModules />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/chatbot" element={<ChatBot />} />
          <Route path="/checkout" element={<CheckOut />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
