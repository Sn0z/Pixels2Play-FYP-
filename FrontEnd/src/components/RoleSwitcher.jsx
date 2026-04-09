import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/authContext";
import "./RoleSwitcher.css";
import KidsChatbot from "../chatbot/Chatbot";

// Professional SVGs instead of lucide-react to avoid transformation errors
const Icons = {
  SwapIcon: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m16 3 4 4-4 4"/><path d="M20 7H4"/><path d="m8 21-4-4 4-4"/><path d="M4 17h16"/></svg>
  ),
  UserIcon: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
  ),
  RocketIcon: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4.5c1.19-1.19 2-2.31 2-2.31s1.12.81 2.31 2c1.47 1.45 4.5 2 4.5 2z"/></svg>
  )
};

export default function RoleSwitcher() {
  const { userProfile, userLoggedIn, profileLoading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const currentPath = location.pathname;
  const isKidMode = currentPath.startsWith("/kidshome") || currentPath.startsWith("/child");

  // Determine visibility
  // USER REQUIREMENT: Only visible on / and /kidshome
  const allowedPaths = ["/", "/kidshome"];

  const showRoleSwitcher = allowedPaths.includes(currentPath) && 
    userLoggedIn && 
    (userProfile?.role === "PARENT" || userProfile?.role === "admin");
  const showChatbot = currentPath === "/kidshome";

  if (!showRoleSwitcher && !showChatbot) {
    return null;
  }

  const toggleMenu = () => setIsOpen(!isOpen);

  const handleRoleSwitch = (path) => {
    navigate(path);
    setIsOpen(false);
  };

  return (
    <div className="role-switcher-container">
      {showRoleSwitcher && isOpen && (
        <div className="role-switcher-menu">
          <div 
            className={`role-option ${!isKidMode ? "active" : ""}`}
            onClick={() => handleRoleSwitch("/")}
          >
            <span className="role-option-icon"><Icons.UserIcon /></span>
            <span>Parent Dashboard</span>
          </div>
          <div 
            className={`role-option ${isKidMode ? "active" : ""}`}
            onClick={() => handleRoleSwitch("/kidshome")}
          >
            <span className="role-option-icon"><Icons.RocketIcon /></span>
            <span>Kid's Adventure</span>
          </div>
        </div>
      )}
      
      {showRoleSwitcher && (
        <div className={`role-switcher-bubble ${isOpen ? "open" : ""}`} onClick={toggleMenu}>
          <span className="role-switcher-label">Switch Mode</span>
          <Icons.SwapIcon />
        </div>
      )}

      {showChatbot && (
        <>
          <button
            className="chatbot-float-btn"
            onClick={() => setChatOpen((o) => !o)}
            title="Ask Pixel - AI Study Buddy"
            style={{ position: 'static' }}
          >
            {chatOpen ? "✕" : "🤖"}
            <span className="float-tooltip">Ask Pixel!</span>
          </button>
          
          {chatOpen && (
            <div className="chatbot-float-panel" style={{ bottom: '110px' }}>
              <KidsChatbot floating={true} onClose={() => setChatOpen(false)} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

