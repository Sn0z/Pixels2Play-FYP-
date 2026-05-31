import React from 'react';
import './DemoVideoModal.css';

export default function DemoVideoModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="demo-video-overlay" onClick={onClose}>
      <div className="demo-video-modal" onClick={(e) => e.stopPropagation()}>
        <button className="demo-video-close" onClick={onClose}>✕</button>
        
        <div className="demo-video-container">
          <video
            src="/Demo.mp4"
            className="demo-video-iframe"
            controls
            autoPlay
            playsInline
            title="Demo Video"
          >
            Your browser does not support the video tag.
          </video>
        </div>
      </div>
    </div>
  );
}
