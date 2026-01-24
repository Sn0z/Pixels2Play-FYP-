import React from "react";

/**
 * Prevents a single runtime error from turning the app into a white screen.
 * Shows a small fallback UI and logs the error for debugging.
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Keep this console error: it's the fastest way to diagnose production-like blank screens.
    console.error("UI crashed:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 16, fontFamily: "system-ui, sans-serif" }}>
          <h2 style={{ margin: "0 0 8px" }}>Something went wrong</h2>
          <p style={{ margin: "0 0 12px", color: "#444" }}>
            The app hit an unexpected error. Please refresh the page. If it keeps happening, check the console for details.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid #ccc",
              background: "#fff",
              cursor: "pointer",
            }}
          >
            Reload
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

