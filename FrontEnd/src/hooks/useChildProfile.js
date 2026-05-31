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
    const [child, setChild] = useState(null); // Keep for backward compatibility (active/first child)
    const [children, setChildren] = useState([]);
    const [childLimit, setChildLimit] = useState(0);
    const [canAddChild, setCanAddChild] = useState(false);
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
            setChildren(data.children || []);
            setChildLimit(data.child_limit || 0);
            setCanAddChild(data.can_add_child || false);
        } catch (err) {
            setError(err.message || "Failed to load profile");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
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

    const updateChild = useCallback(
        async (childId, patch) => {
            // Optimistic update
            const previousChildren = [...children];
            
            setChildren((prev) => 
                prev.map(c => c.id === childId ? { ...c, ...patch } : c)
            );
            
            // Also update the `child` backward compatibility object if it matches
            if (child?.id === childId) {
                setChild(prev => ({ ...prev, ...patch }));
            }

            try {
                const token = await getToken();
                const res = await fetch(`${API_BASE}/profile/linked-child/`, {
                    method: "PATCH",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ child_id: childId, ...patch }),
                });

                if (!res.ok) {
                    const body = await res.json().catch(() => ({}));
                    throw new Error(body.error || `Server error (${res.status})`);
                }
            } catch (err) {
                // Roll back on failure
                setChildren(previousChildren);
                if (child?.id === childId) {
                    const original = previousChildren.find(c => c.id === childId);
                    if (original) setChild(original);
                }
                throw err;
            }
        },
        [children, child]
    );

    return { 
        parent, child, children, childLimit, canAddChild, 
        loading, error, accessDenied, refetch: fetchDashboard, updateChild 
    };
}
