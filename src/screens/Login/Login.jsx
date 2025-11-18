import { EyeIcon, LockIcon, UserIcon } from "lucide-react";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { doSignInWithEmailAndPassword, doSignInWithGoogle, doPasswordReset } from '../../FireBase/auth'
import { useAuth } from '../../contexts/authContext'
import { Navigate } from "react-router-dom";
import "./Login.css";

import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../FireBase/firebase";

const Login = () => {
    const navigate = useNavigate();
    const { userLoggedIn } = useAuth()
    const [identifier, setIdentifier] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false);
    const [isSigningIn, setIsSigningIn] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')
    const [showReset, setShowReset] = useState(false)
    const [resetEmail, setResetEmail] = useState('')
    const [resetMessage, setResetMessage] = useState('')

    const resolveEmail = async () => {
        const isEmail = identifier.includes("@");
        if (isEmail) return identifier;

        const q = query(
            collection(db, "users"),
            where("username", "==", identifier)
        );
        const snap = await getDocs(q);

        if (!snap.empty) {
            return snap.docs[0].data().email;
        } else {
            throw new Error("Username not found");
        }
    }

    const onSubmit = async (e) => {
        e.preventDefault();
        if (!isSigningIn) {
            setIsSigningIn(true);
            setErrorMessage("");

            try {
                const emailToUse = await resolveEmail();
                await doSignInWithEmailAndPassword(emailToUse, password);
                navigate("/")
            } catch (err) {
                setErrorMessage(err.message);
                setIsSigningIn(false);
            }
        }
    };

    const onGoogleSignIn = (e) => {
        e.preventDefault();
        if (!isSigningIn) {
            setIsSigningIn(true);
            doSignInWithGoogle().catch(() => {
                setIsSigningIn(false);
            });
        }
    };

    const handlePasswordReset = async () => {
        setResetMessage("");

        if (!resetEmail || !resetEmail.includes("@")) {
            return setResetMessage("Please enter a valid email.");
        }
        try {
            await doPasswordReset(resetEmail);
            setResetMessage("✅ Password reset email sent!");
        } catch (err) {
            setResetMessage("❌ Failed: " + err.message);
        }
    }

    return (
        <div>
            {userLoggedIn && (<Navigate to={'/'} replace={true} />)}
            {/* Password Reset Popup */}
            {showReset && (
                <div className="reset-overlay">
                    <div className="reset-modal">
                        <h2>Reset Password</h2>
                        <p>Enter your email and we’ll send a reset link.</p>
                        <input
                            type="email"
                            placeholder="Your email"
                            value={resetEmail}
                            onChange={(e) => setResetEmail(e.target.value)}
                            className="reset-input"
                        />
                        <button onClick={handlePasswordReset} className="reset-send-btn">
                            Send Reset Email
                        </button>
                        {resetMessage && <p className="reset-message">{resetMessage}</p>}

                        <button onClick={() => setShowReset(false)} className="reset-close-btn">
                            Close
                        </button>
                    </div>
                </div>
            )}

            <main className="login-page">
                <div className="login-background">
                    <img
                        className="login-bg-image"
                        alt="Child riding pencil rocket"
                        src="https://c.animaapp.com/mhqukxxjAGK3sq/img/vector.png"
                    />
                </div>

                <div className="login-card">
                    <div className="login-header">
                        <h1>Let&#39;s Learn AI!</h1>
                        <p>Welcome back, future innovator!</p>
                    </div>

                    <form className="login-form" onSubmit={onSubmit}>

                        {/* Email OR Username */}
                        <div className="login-field">
                            <label>Email</label>
                            <div className="login-input-wrapper">
                                <UserIcon className="login-input-icon" />
                                <input
                                    type="text"
                                    placeholder="Your email"
                                    required
                                    className="login-input"
                                    value={identifier}
                                    onChange={(e) => setIdentifier(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="login-field">
                            <label>Password</label>
                            <div className="login-input-wrapper">
                                <LockIcon className="login-input-icon" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    required
                                    placeholder="Your secret password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="login-input"
                                />
                                <button
                                    type="button"
                                    className="login-eye-button"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? (
                                        <img src="../../../public/assets/eye-open.png" alt="visible" className="eye-icon" />
                                    ) : (
                                        <img src="../../../public/assets/eye-closed.png" alt="hidden" className="eye-icon" />
                                    )}
                                </button>
                            </div>
                        </div>

                        {errorMessage && <span className='text-red-600 font-bold'>{errorMessage}</span>}

                        {/* Forgot Password Button */}
                        <div className="login-forgot">
                            <button type="button" onClick={() => setShowReset(true)}>
                                Forgot Password?
                            </button>
                        </div>

                        <button type="submit" disabled={isSigningIn} className="login-submit">
                            {isSigningIn ? 'Signing In...' : 'Log In'}
                        </button>

                        {/* OR Divider */}
                        <div className="signup-or">
                            <div className="signup-divider" />
                            <span>OR</span>
                            <div className="signup-divider" />
                        </div>

                        {/* Google */}
                        <button
                            type="button"
                            disabled={isSigningIn}
                            onClick={onGoogleSignIn}
                            className="signup-google"
                        >
                            <img
                                className="signup-google-icon"
                                alt="Google"
                                src="https://c.animaapp.com/mhqwa664vo7WOg/img/frame.svg"
                            />
                            {isSigningIn ? 'Signing In...' : 'Continue with Google'}
                        </button>

                        <p className="login-footer">
                            <span>New here? </span>
                            <a href="/signup" className="login-link">
                                Create an Account
                            </a>
                        </p>
                    </form>
                </div>
            </main>
        </div>
    );
};

export default Login;
