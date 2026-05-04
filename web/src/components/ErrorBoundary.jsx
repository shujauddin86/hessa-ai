import React from "react";

/**
 * Top-level error boundary. Renders a quiet, on-brand fallback so a runtime
 * error in any screen never blanks the cinematic shell.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    if (typeof console !== "undefined") {
      // eslint-disable-next-line no-console
      console.error("[Hessa] UI error boundary caught:", error, info);
    }
  }

  handleReload = () => {
    this.setState({ hasError: false });
    if (typeof window !== "undefined") window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: 24,
          textAlign: "center",
          color: "#fff",
          background: "#000",
          fontFamily: "DM Sans, sans-serif",
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "Playfair Display, serif",
              fontSize: 22,
              letterSpacing: 4,
              marginBottom: 10,
            }}
          >
            HESSA
          </div>
          <div style={{ color: "rgba(255,255,255,0.62)", fontSize: 13 }}>
            Something interrupted the moment.
          </div>
          <button
            onClick={this.handleReload}
            style={{
              marginTop: 20,
              padding: "10px 18px",
              borderRadius: 12,
              background: "#fff",
              color: "#000",
              border: 0,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
}
