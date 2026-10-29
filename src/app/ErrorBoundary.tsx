import { Component, type ErrorInfo, type ReactNode } from "react";
import { CREDITS } from "../config/credits";
import { FALLBACK_COPY } from "../i18n/copy";

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
    const copy = document.documentElement.lang === "id" ? FALLBACK_COPY.id : FALLBACK_COPY.en;
    return (
      <div className="error-screen" role="alert">
        <div className="error-bubbles" aria-hidden="true">
          <span /><span /><span />
        </div>
        <span className="error-mark">!</span>
        <h1>{copy.title}</h1>
        <p>{copy.body}</p>
        <div className="error-actions">
          <button type="button" className="btn btn-primary btn-md" onClick={() => window.location.reload()}>
            {copy.reload}
          </button>
          <button
            type="button"
            className="btn btn-tinted btn-md"
            onClick={() => {
              window.location.hash = "/";
              window.location.reload();
            }}
          >
            {copy.home}
          </button>
        </div>
        <small>
          {CREDITS.appName} · {CREDITS.author}
        </small>
      </div>
    );
  }
}
