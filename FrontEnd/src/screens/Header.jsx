import { useEffect, useState } from "react";
import { useAuth } from "../contexts/authContext";
import { doSignOut } from "../FireBase/auth";
import { db } from "../FireBase/firebase";
import { doc, getDoc } from "firebase/firestore";
import ConfirmModal from "../components/ConfirmModal";

export default function Header() {
  const { currentUser, userLoggedIn } = useAuth();
  const [username, setUsername] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  useEffect(() => {
    async function fetchUsername() {
      if (currentUser?.uid) {
        try {
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          if (userDoc.exists()) {
            setUsername(userDoc.data().username || "");
          }
        } catch {
          // Silently fall back to displayName / email if Firestore read is denied
        }
      }
    }
    fetchUsername();
  }, [currentUser]);

  const profileName =
    username ||
    currentUser?.displayName ||
    currentUser?.email?.split("@")[0] ||
    "User";

  return (
    <>
      <header className="site-header">
        <div className="header-container">
          <a href="/" className="logo">
            <img src="/Logo.png" alt="Pixels2Play" className="logo-icon" style={{ height: '36px', width: 'auto', objectFit: 'contain' }} />
            <span className="logo-text">Pixels2Play</span>
          </a>

          <nav className="main-nav">
            <ul className="nav-links">
              <li><a href="/">Home</a></li>
              <li><a href="/courses">Courses</a></li>
              <li><a href="#projects">Projects</a></li>
              <li><a href="/contact">Contact Us</a></li>
              <li><a href="/pricing">Pricing</a></li>
            </ul>
          </nav>

          <div className="nav-actions">
            {!userLoggedIn ? (
              <>
                <a href="/login" className="nav-login">Login</a>
                <a href="/signup" className="btn btn-primary btn-small">Sign up</a>
              </>
            ) : (
              <div
                className="user-profile username-only"
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                <span className="username">{profileName}</span>

                {dropdownOpen && (
                  <div className="dropdown-menu">
                    <a href="/dashboard">Dashboard</a>
                    <a href="/settings">Settings</a>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowSignOutConfirm(true);
                      }}
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <button className="mobile-nav-toggle" aria-label="Toggle navigation">
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </header>

      <ConfirmModal
        isOpen={showSignOutConfirm}
        title="Sign Out"
        message="Are you sure you want to sign out of your account?"
        onConfirm={() => {
          setShowSignOutConfirm(false);
          doSignOut();
        }}
        onCancel={() => setShowSignOutConfirm(false)}
      />
    </>
  );
}
