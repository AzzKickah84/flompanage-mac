import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    try {
      console.error("Flompanage UI error:", error.message, info.componentStack);
    } catch {}
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100vh",
            background: "var(--bg)",
            color: "var(--text)",
            padding: 32,
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          }}
        >
          <div style={{ textAlign: "center", maxWidth: 500 }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--danger)", marginBottom: 12 }}>
              Er is een fout opgetreden
            </h1>
            <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 20 }}>
              De Flompanage-interface kon niet worden geladen door een onverwachte fout.
              Probeer de app opnieuw op te starten.
            </p>
            <details style={{ fontSize: 12, color: "var(--muted)", marginBottom: 20, textAlign: "left" }}>
              <summary style={{ cursor: "pointer", marginBottom: 8 }}>Technische details</summary>
              <pre
                style={{
                  background: "var(--surface)",
                  padding: 12,
                  borderRadius: 6,
                  overflow: "auto",
                  maxHeight: 200,
                  fontSize: 11,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {this.state.error.message}
              </pre>
            </details>
            <button
              onClick={() => {
                this.setState({ error: null });
                window.location.reload();
              }}
              style={{
                padding: "10px 20px",
                background: "var(--accent)",
                color: "#000",
                border: "none",
                borderRadius: 6,
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Opnieuw proberen
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
