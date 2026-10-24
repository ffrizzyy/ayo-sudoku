import { Component, type ErrorInfo, type ReactNode } from "react";

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Keep diagnostics local; the app makes no network requests.
    console.error("Ayo Sudoku! crashed", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    const indonesian = document.documentElement.lang === "id";
    return (
      <div className="error-screen" role="alert">
        <div className="error-bubbles" aria-hidden="true">
          <span /><span /><span />
        </div>
        <span className="error-mark">!</span>
        <h1>{indonesian ? "Ada yang goyang." : "Something wobbled."}</h1>
        <p>
          {indonesian
            ? "Permainanmu aman. Muat ulang layar atau kembali ke beranda."
            : "Your game is safe. Reload the screen or head home."}
        </p>
        <div className="error-actions">
          <button type="button" className="btn btn-primary btn-md" onClick={() => window.location.reload()}>
            {indonesian ? "Muat ulang" : "Reload"}
          </button>
          <button
            type="button"
            className="btn btn-tinted btn-md"
            onClick={() => {
              window.location.hash = "/";
              window.location.reload();
            }}
          >
            {indonesian ? "Ke beranda" : "Go home"}
          </button>
        </div>
        <small>Ayo Sudoku! · ffrizzy</small>
      </div>
    );
  }
}
