import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useChildProfile } from "../../hooks/useChildProfile";
import "./ChildSettings.css";

export default function ChildSettings() {
    const { parent, child, loading, error, accessDenied, updateChild } =
        useChildProfile();

    const navigate = useNavigate();

    const [name, setName] = useState("");
    const [photoUrl, setPhotoUrl] = useState("");
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState(null);
    const [saved, setSaved] = useState(false);

    // Initialise fields once the child data arrives
    React.useEffect(() => {
        if (child && !name) {
            setName(child.name || "");
            setPhotoUrl(child.photo_url || "");
        }
    }, [child]);

    /* ── access guard ─────────────────────────────────────────── */
    if (!loading && accessDenied) {
        return (
            <div className="chs-shell chs-center">
                <div className="chs-card">
                    <span style={{ fontSize: "2.5rem" }}>🔒</span>
                    <h2>Access Restricted</h2>
                    <p>Only linked parents can edit the child profile.</p>
                    <Link to="/login" className="chs-btn chs-btn-primary">
                        Log in as a Parent
                    </Link>
                </div>
            </div>
        );
    }

    if (!loading && !child) {
        return (
            <div className="chs-shell chs-center">
                <div className="chs-card">
                    <span style={{ fontSize: "2.5rem" }}>👧</span>
                    <h2>No child linked yet</h2>
                    <p>Link a child account before editing their profile.</p>
                    <Link to="/setup1" className="chs-btn chs-btn-primary">
                        Link a Child Account
                    </Link>
                </div>
            </div>
        );
    }

    /* ── handle image upload → base64 URL ────────────────────── */
    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => setPhotoUrl(reader.result);
        reader.readAsDataURL(file);
    };

    /* ── save ─────────────────────────────────────────────────── */
    const handleSave = async () => {
        if (saving || loading) return;
        setSaving(true);
        setSaveError(null);
        setSaved(false);

        const patch = {};
        if (name.trim() && name.trim() !== child?.name) patch.name = name.trim();
        if (photoUrl && photoUrl !== child?.photo_url) patch.photo_url = photoUrl;

        if (Object.keys(patch).length === 0) {
            setSaving(false);
            return;
        }

        try {
            await updateChild(patch);
            setSaved(true);
            setTimeout(() => navigate("/dashboard"), 1200);
        } catch (err) {
            setSaveError(err.message || "Failed to save changes");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="chs-shell">
            {/* Header */}
            <header className="chs-header">
                <div className="chs-header-inner">
                    <Link to="/dashboard" className="chs-back">
                        ← Back to Dashboard
                    </Link>
                    <span className="chs-header-title">Edit Child Profile</span>
                </div>
            </header>

            <main className="chs-main">
                <div className="chs-form-card">
                    <h1 className="chs-form-title">Child Profile Settings</h1>
                    <p className="chs-form-sub">
                        Update your child's display name and profile photo. Changes will
                        appear on the dashboard immediately.
                    </p>

                    {/* Avatar preview */}
                    <div className="chs-avatar-section">
                        <div className="chs-avatar-preview">
                            {loading ? (
                                <div className="chs-avatar-skel" />
                            ) : photoUrl ? (
                                <img src={photoUrl} alt="Preview" />
                            ) : (
                                <span>{name?.[0]?.toUpperCase() || "C"}</span>
                            )}
                        </div>
                        <label className="chs-btn chs-btn-outline" htmlFor="photo-upload">
                            📷 Change Photo
                        </label>
                        <input
                            id="photo-upload"
                            type="file"
                            accept="image/*"
                            style={{ display: "none" }}
                            onChange={handleFileChange}
                        />
                    </div>

                    {/* Name field */}
                    <div className="chs-field">
                        <label className="chs-label" htmlFor="child-name">
                            Child's Display Name
                        </label>
                        {loading ? (
                            <div className="chs-input-skel" />
                        ) : (
                            <input
                                id="child-name"
                                type="text"
                                className="chs-input"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Enter child's name"
                                disabled={saving}
                            />
                        )}
                    </div>

                    {/* Error / success */}
                    {saveError && <p className="chs-msg chs-msg-error">{saveError}</p>}
                    {saved && (
                        <p className="chs-msg chs-msg-success">
                            ✅ Saved! Redirecting to dashboard…
                        </p>
                    )}

                    {/* Actions */}
                    <div className="chs-actions">
                        <Link to="/dashboard" className="chs-btn chs-btn-outline">
                            Cancel
                        </Link>
                        <button
                            className="chs-btn chs-btn-primary"
                            onClick={handleSave}
                            disabled={saving || loading}
                        >
                            {saving ? "Saving…" : "Save Changes"}
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}
