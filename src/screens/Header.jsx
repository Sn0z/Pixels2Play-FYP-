import { useEffect, useState } from "react";
import { useAuth } from "../contexts/authContext";
import { doSignOut } from "../FireBase/auth";
import { db } from "../FireBase/firebase";
import { doc, getDoc } from "firebase/firestore";

export default function Header() {
  const { currentUser, userLoggedIn } = useAuth();
  const [username, setUsername] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    async function fetchUsername() {
      if (currentUser?.uid) {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          setUsername(userDoc.data().username || "");
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
    <header className="site-header">
      <div className="header-container">
        <a href="#" className="logo">
          <img src="../public/assets/17_1165.png" className="logo-icon" />
          <span className="logo-text">Pixles2Play</span>
        </a>

        <nav className="main-nav">
          <ul className="nav-links">
            <li><a href="#hero">Home</a></li>
            <li><a href="#courses">Courses</a></li>
            <li><a href="#projects">Projects</a></li>
            <li><a href="#footer">Contact Us</a></li>
            <li><a href="#pricing">Pricing</a></li>
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
                  <button onClick={doSignOut}>Logout</button>
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
  );
}
