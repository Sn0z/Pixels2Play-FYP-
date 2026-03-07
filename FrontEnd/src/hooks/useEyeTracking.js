/**
 * useEyeTracking
 *
 * Encapsulates all webcam + eye-tracking API logic.
 *
 * - Opens the user's camera silently (small hidden video)
 * - Captures a JPEG frame every 1 second via an offscreen canvas
 * - POSTs the frame to POST /api/eye-tracker/check-focus/
 * - Tracks consecutive non-looking seconds
 * - Cleans up camera + intervals on unmount
 *
 * Returns:
 *   isLooking        {boolean}  Latest look result
 *   focusLostSeconds {number}   Consecutive seconds of not looking (0 when looking)
 *   cameraError      {string|null} Set when camera cannot be opened
 *   stopTracking     {function} Call to stop immediately (e.g. on redirect)
 */

import { useEffect, useRef, useState, useCallback } from 'react';

const API_BASE =
    (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api').replace(/\/$/, '');

const CHECK_FOCUS_URL = `${API_BASE}/eye-tracker/check-focus/`;
const CAPTURE_INTERVAL_MS = 1000; // 1 frame per second

export default function useEyeTracking({ enabled = true } = {}) {
    const [isLooking, setIsLooking] = useState(true);
    const [focusLostSeconds, setFocusLostSeconds] = useState(0);
    const [cameraError, setCameraError] = useState(null);

    // Refs that hold non-reactive resources (no re-renders on change)
    const streamRef = useRef(null);  // MediaStream
    const videoRef = useRef(null);  // hidden <video> element
    const canvasRef = useRef(null);  // offscreen <canvas>
    const intervalRef = useRef(null);
    const focusLostRef = useRef(0);     // mutable counter (avoid stale closure)

    // ------------------------------------------------------------------
    // Stop and clean up everything
    // ------------------------------------------------------------------
    const stopTracking = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    }, []);

    // ------------------------------------------------------------------
    // Capture + send one frame
    // ------------------------------------------------------------------
    const captureAndCheck = useCallback(async () => {
        if (!streamRef.current) return; // tracking stopped
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas || video.readyState < 2) return; // not ready yet

        // Draw current video frame to canvas
        const ctx = canvas.getContext('2d');
        canvas.width = video.videoWidth || 320;
        canvas.height = video.videoHeight || 240;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Encode as JPEG data URL
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);

        try {
            const res = await fetch(CHECK_FOCUS_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: dataUrl }),
            });

            if (!streamRef.current) return; // stopped mid-flight

            if (!res.ok) {
                // On API error, treat as not looking (conservative)
                handleNotLooking();
                return;
            }

            const data = await res.json();
            if (!streamRef.current) return; // stopped mid-flight

            if (data.isLooking) {
                handleLooking();
            } else {
                handleNotLooking();
            }
        } catch (_err) {
            // Network error – don't change state, keep current
        }
    }, []);

    function handleLooking() {
        focusLostRef.current = 0;
        setFocusLostSeconds(0);
        setIsLooking(true);
    }

    function handleNotLooking() {
        focusLostRef.current += 1;
        setFocusLostSeconds(focusLostRef.current);
        setIsLooking(false);
    }

    // ------------------------------------------------------------------
    // Main effect: open camera, start interval
    // ------------------------------------------------------------------
    useEffect(() => {
        if (!enabled) return;

        // Local flag — unique to THIS effect invocation.
        // A shared ref (like isMounted) is unsafe: React StrictMode unmounts then
        // remounts, resetting the ref to true before the first getUserMedia resolves,
        // so the stream from the first mount bypasses the guard and stays open with
        // no reference left to stop it. A local variable is closure-bound and safe.
        let cancelled = false;

        // Create hidden video + canvas elements
        const video = document.createElement('video');
        video.setAttribute('playsinline', '');
        video.muted = true;
        video.style.display = 'none';
        document.body.appendChild(video);
        videoRef.current = video;

        const canvas = document.createElement('canvas');
        canvas.style.display = 'none';
        document.body.appendChild(canvas);
        canvasRef.current = canvas;

        // Request camera
        navigator.mediaDevices
            .getUserMedia({ video: { width: 320, height: 240, facingMode: 'user' }, audio: false })
            .then((stream) => {
                // If cleanup already ran for THIS effect, kill the stream immediately
                if (cancelled) {
                    stream.getTracks().forEach((t) => t.stop());
                    return;
                }
                streamRef.current = stream;
                video.srcObject = stream;
                video.play().catch(() => { }); // autoplay may be blocked silently

                // Start capturing every second
                intervalRef.current = setInterval(captureAndCheck, CAPTURE_INTERVAL_MS);
            })
            .catch((err) => {
                if (cancelled) return;
                const msg =
                    err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
                        ? 'Camera permission denied. Eye tracking disabled.'
                        : `Camera error: ${err.message}`;
                setCameraError(msg);
            });

        return () => {
            cancelled = true;   // catches streams that resolve after cleanup runs
            stopTracking();
            // Remove DOM elements created above
            if (videoRef.current && document.body.contains(videoRef.current)) {
                document.body.removeChild(videoRef.current);
            }
            if (canvasRef.current && document.body.contains(canvasRef.current)) {
                document.body.removeChild(canvasRef.current);
            }
        };
    }, [enabled, captureAndCheck, stopTracking]);

    return { isLooking, focusLostSeconds, cameraError, stopTracking };
}
