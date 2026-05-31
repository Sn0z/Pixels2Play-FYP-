import React from "react";
import "./ConfirmModal.css";

const Icons = {
  SignOut: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
  Warning: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  )
};

export default function ConfirmModal({ isOpen, title, message, onConfirm, onCancel, type = "primary" }) {
  if (!isOpen) return null;

  const isWarning = type === "warning" || type === "danger";

  return (
    <div className="custom-modal-overlay" onClick={onCancel}>
      <div className="custom-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className={`custom-modal-icon-wrap ${isWarning ? "warning" : "primary"}`}>
          {isWarning ? <Icons.Warning /> : <Icons.SignOut />}
        </div>
        <h2 className="custom-modal-title">{title}</h2>
        <p className="custom-modal-message">{message}</p>
        <div className="custom-modal-actions">
          <button className="custom-modal-btn btn-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button 
            className={`custom-modal-btn ${isWarning ? "btn-confirm-warning" : "btn-confirm-primary"}`} 
            onClick={onConfirm}
          >
            {isWarning ? "Yes, Confirm" : "Sign Out"}
          </button>
        </div>
      </div>
    </div>
  );
}
