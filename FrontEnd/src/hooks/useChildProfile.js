/**
 * useChildProfile – shared hook for parent dashboard & settings.
 *
 * Fetches GET /api/profile/parent-dashboard/ and exposes:
 *   parent   – { name, photo_url }
 *   child    – { name, photo_url, level, progress[], badges[] } | null
 *   loading  – boolean
 *   error    – string | null
 *   accessDenied – true when the logged-in user is not a parent
 *   refetch  – re-fetch from the server
 *   updateChild(patch) – PATCH /api/profile/linked-child/ + optimistic local update
 */

import { useState, useEffect, useCallback } from "react";
import { auth } from "../FireBase/firebase";

const API_BASE = (
    import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api"
).replace(/\/$/, "");

async function getToken() {
    const user = auth.currentUser;
    if (!user) throw new Error("Not authenticated");
    return user.getIdToken();
}

export function useChildProfile() {
    const [parent, setParent] = useState(null);
    const [child, setChild] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [accessDenied, setAccessDenied] = useState(false);

    const fetchDashboard = useCallback(async () => {
        setLoading(true);
        setError(null);
        setAccessDenied(false);
        try {
            const token = await getToken();
            const res = await fetch(`${API_BASE}/profile/parent-dashboard/`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (res.status === 403) {
                setAccessDenied(true);
                return;
            }

            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.error || `Server error (${res.status})`);
            }

            const data = await res.json();
            setParent(data.parent || null);
            setChild(data.child || null);
        } catch (err) {
            setError(err.message || "Failed to load profile");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        // Wait for Firebase auth to resolve before fetching
        const unsubscribe = auth.onAuthStateChanged((user) => {
            if (user) {
                fetchDashboard();
            } else {
                setLoading(false);
                setAccessDenied(true);
            }
        });
        return unsubscribe;
    }, [fetchDashboard]);

    /**
     * updateChild({ name?, photo_url? })
     * Optimistically patches local state, then syncs to server.
     * Rolls back on error.
     */
    const updateChild = useCallback(
        async (patch) => {
            // Optimistic update
            const previous = child;
            setChild((prev) => (prev ? { ...prev, ...patch } : prev));

            try {
                const token = await getToken();
                const res = await fetch(`${API_BASE}/profile/linked-child/`, {
                    method: "PATCH",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(patch),
                });

                if (!res.ok) {
                    const body = await res.json().catch(() => ({}));
                    throw new Error(body.error || `Server error (${res.status})`);
                }
            } catch (err) {
                // Roll back on failure
                setChild(previous);
                throw err; // Let calling component handle UI error
            }
        },
        [child]
    );

    return { parent, child, loading, error, accessDenied, refetch: fetchDashboard, updateChild };
}
