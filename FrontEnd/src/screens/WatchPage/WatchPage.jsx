/**
 * WatchPage.jsx
 *
 * Course Video Watch Page with Eye Tracking Enforcement.
 *
 * Route: /watch/:moduleId
 *
 * Features:
 *  - Fetches module from GET /api/courses/modules/:moduleId/
 *  - Embeds YouTube video via IFrame API
 *  - Eye-tracking via useEyeTracking hook (polls every 1 second)
 *  - Pauses video immediately when user looks away
 *  - Shows focus-lost overlay + countdown (0–60 s)
 *  - Redirects to /coursedetails/:moduleId after 60 consecutive look-away seconds
 *  - Resumes video and resets counter when user looks back
 *  - Handles camera permission denial gracefully
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './WatchPage.css';
import useEyeTracking from '../../hooks/useEyeTracking';
import { auth } from '../../FireBase/firebase';

const API_BASE =
    (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api').replace(/\/$/, '');

const MAX_FOCUS_LOST_SECONDS = 60;

// ─────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────

/** Extract a YouTube video ID from any common URL format, or return the raw value. */
function extractYouTubeId(url) {
    if (!url) return null;
    // Already a bare ID (no slashes/dots)
    if (/^[A-Za-z0-9_-]{11}$/.test(url)) return url;

    try {
        const u = new URL(url);
        // youtu.be/ID
        if (u.hostname === 'youtu.be') return u.pathname.slice(1);
        // youtube.com/watch?v=ID
        const v = u.searchParams.get('v');
        if (v) return v;
        // youtube.com/embed/ID
        const parts = u.pathname.split('/');
        const idx = parts.indexOf('embed');
        if (idx !== -1 && parts[idx + 1]) return parts[idx + 1];
    } catch {
        // Not a valid URL — return as-is and let players deal with it
    }
    return url;
}

// ─────────────────────────────────────────────────────────────────────
// WatchPage component
// ─────────────────────────────────────────────────────────────────────

export default function WatchPage() {
    const { moduleId } = useParams();
    const navigate = useNavigate();

    // Module data
    const [module, setModule] = useState(null);
    const [moduleError, setModuleError] = useState(null);
    const [loading, setLoading] = useState(true);

    // YouTube player
    const ytContainerRef = useRef(null);
    const playerInstanceRef = useRef(null);
    const [playerReady, setPlayerReady] = useState(false);

    // Eye-tracking hook
    const { isLooking, focusLostSeconds, cameraError, stopTracking } = useEyeTracking({ enabled: true });

    // Show/hide overlay
    const [overlayVisible, setOverlayVisible] = useState(false);

    // Redirect flag (avoid double redirects)
    const redirectedRef = useRef(false);

    // ── Stop camera on ANY unmount (back button, browser nav, redirect) ──
    useEffect(() => {
        return () => {
            stopTracking();
        };
    }, [stopTracking]);

    // ── Fetch module ──────────────────────────────────────────────────
    // NOTE: The URL param is named `moduleId` but actually holds the COURSE ID
    // (the route is /watch/:moduleId where moduleId = Firestore course doc ID).
    // We fetch all modules for that course and use the first one.
    const fetchModule = useCallback(async () => {
        setLoading(true);
        setModuleError(null);
        try {
            let headers = {};
            try {
                const user = auth.currentUser;
                if (user) {
                    const token = await user.getIdToken();
                    headers['Authorization'] = `Bearer ${token}`;
                }
            } catch {
                // No auth – endpoint is AllowAny
            }

            // Fetch all modules for this course from the Firestore subcollection
            const res = await fetch(`${API_BASE}/courses/${moduleId}/modules/`, { headers });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.error || `HTTP ${res.status}`);
            }
            const data = await res.json();
            // data is an array of modules; use the first one
            if (!Array.isArray(data) || data.length === 0) {
                throw new Error('No modules found for this course');
            }
            setModule(data[0]);
        } catch (err) {
            setModuleError(err.message || 'Failed to load module');
        } finally {
            setLoading(false);
        }
    }, [moduleId]);

    useEffect(() => { fetchModule(); }, [fetchModule]);

    // ── Load YouTube IFrame API ───────────────────────────────────────
    useEffect(() => {
        if (window.YT && window.YT.Player) return;
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        document.body.appendChild(tag);
    }, []);

    // ── Create YouTube player once module + API are ready ────────────
    useEffect(() => {
        if (!module) return;

        const videoId = extractYouTubeId(module.video_url);
        if (!videoId) return;

        let mounted = true;

        function createPlayer() {
            if (!mounted || !ytContainerRef.current) return;
            if (playerInstanceRef.current) return; // already created

            playerInstanceRef.current = new window.YT.Player(ytContainerRef.current, {
                height: '100%',
                width: '100%',
                videoId,
                playerVars: {
                    controls: 1,
                    rel: 0,
                    modestbranding: 1,
                    playsinline: 1,
                },
                events: {
                    onReady: () => {
                        setPlayerReady(true);
                    },
                },
            });
        }

        // Poll until YT API is available
        const id = setInterval(() => {
            if (!window.YT || !window.YT.Player) return;
            createPlayer();
            clearInterval(id);
        }, 300);

        return () => {
            mounted = false;
            clearInterval(id);
            if (playerInstanceRef.current && playerInstanceRef.current.destroy) {
                try { playerInstanceRef.current.destroy(); } catch { /* ignore */ }
                playerInstanceRef.current = null;
                setPlayerReady(false);
            }
        };
    }, [module]);

    // ── Helper: stop camera then navigate ────────────────────────────
    const goBack = useCallback(() => {
        stopTracking();
        try {
            const player = playerInstanceRef.current;
            if (player && player.stopVideo) player.stopVideo();
        } catch { /* ignore */ }
        navigate(`/coursedetails/${moduleId}`);
    }, [stopTracking, navigate, moduleId]);

    // ── Eye-tracking enforcement ──────────────────────────────────────
    useEffect(() => {
        const player = playerInstanceRef.current;

        if (isLooking) {
            // User looked back → hide overlay and resume
            setOverlayVisible(false);
            if (playerReady && player) {
                try { player.playVideo(); } catch { /* ignore */ }
            }
        } else {
            // Not looking → pause and show overlay
            setOverlayVisible(true);
            if (playerReady && player) {
                try { player.pauseVideo(); } catch { /* ignore */ }
            }

            // 60-second hard limit → stop camera + redirect
            // NOTE: fires regardless of playerReady so an unloaded player
            // does not silently prevent the redirect.
            if (focusLostSeconds >= MAX_FOCUS_LOST_SECONDS && !redirectedRef.current) {
                redirectedRef.current = true;
                goBack();
            }
        }
    }, [isLooking, focusLostSeconds, goBack, playerReady]);

    // ─────────────────────────────────────────────────────────────────
    // Render helpers
    // ─────────────────────────────────────────────────────────────────

    const timerPercent = Math.min(
        (focusLostSeconds / MAX_FOCUS_LOST_SECONDS) * 100,
        100
    );

    if (loading) {
        return (
            <div className="wp-page">
                <div className="wp-loading">
                    <div className="wp-spinner" />
                    <span>Loading course…</span>
                </div>
            </div>
        );
    }

    if (moduleError) {
        return (
            <div className="wp-page">
                <div className="wp-error">
                    <span className="wp-error-msg">⚠️ {moduleError}</span>
                    <button className="wp-retry-btn" onClick={fetchModule}>Retry</button>
                    <button className="wp-back-btn" onClick={goBack}>
                        ← Back to course
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="wp-page">

            {/* ── Header ── */}
            <div className="wp-header">
                <button
                    className="wp-back-btn"
                    onClick={goBack}
                >
                    ← Back
                </button>
                <h1 className="wp-title">{module?.title || 'Course Video'}</h1>
            </div>

            {/* ── Video + Overlay ── */}
            <div className="wp-video-wrapper">
                {/* YouTube player target */}
                <div id="wp-yt-player" ref={ytContainerRef} />

                {/* Focus warning overlay */}
                {overlayVisible && (
                    <div className="wp-overlay" role="alertdialog" aria-live="assertive">
                        <span className="wp-overlay-icon">👁️</span>
                        <p className="wp-overlay-title">Please focus on the video</p>
                        <p className="wp-overlay-subtitle">
                            The video is paused because you looked away.<br />
                            Look back at the screen to continue.
                        </p>

                        {/* Timer bar */}
                        <div className="wp-timer-bar-container">
                            <span className="wp-timer-label">Focus lost:</span>
                            <div className="wp-timer-track">
                                <div
                                    className="wp-timer-fill"
                                    style={{ width: `${timerPercent}%` }}
                                />
                            </div>
                            <span className="wp-timer-seconds">
                                {focusLostSeconds}s / {MAX_FOCUS_LOST_SECONDS}s
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Subtle status bar ── */}
            <div className={`wp-status-bar ${isLooking ? 'looking' : 'not-looking'}`}>
                <span className="wp-status-dot" />
                {isLooking
                    ? '✓ Eye tracking active — you\'re focused'
                    : `⚠ Focus lost: ${focusLostSeconds}s / ${MAX_FOCUS_LOST_SECONDS}s — look at the screen to resume`}
            </div>

            {/* ── Camera error notice ── */}
            {cameraError && (
                <div className="wp-cam-error" role="alert">
                    <span>📷</span>
                    <span>{cameraError} Eye tracking is disabled for this session.</span>
                </div>
            )}

            {/* ── Course info ── */}
            {module && (
                <div className="wp-course-info">
                    <h2 className="wp-course-title">{module.title}</h2>
                    {module.description && (
                        <p className="wp-course-desc">{module.description}</p>
                    )}
                </div>
            )}
        </div>
    );
}
