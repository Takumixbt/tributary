/*
 * Last line of defence around the routed page.
 *
 * It sits inside the shell, so a page that throws leaves the status strip, the top
 * bar, the graph and the live tape running: the product keeps a pulse while it
 * admits what broke. React Router's own fallback is an unstyled grey box, and this
 * page has no room for a grey box.
 */

import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  message: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { message: null };

  static getDerivedStateFromError(error: unknown): State {
    return { message: error instanceof Error ? error.message : String(error) };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Tributary page error", error, info.componentStack);
  }

  render() {
    if (this.state.message === null) return this.props.children;

    return (
      <section className="notfound">
        <span className="spec">Fault</span>
        <h1 className="h2">This view stopped</h1>
        <p className="lead notfound-lead">
          The page threw and was taken down to keep the stream alive. The tape and the graph are
          still running.
        </p>
        <p className="footer-line">{this.state.message}</p>
        <div className="notfound-actions">
          <button className="btn btn-primary" type="button" onClick={() => window.location.reload()}>
            Reload
          </button>
          <a className="btn" href="/">
            Back to overview
          </a>
        </div>
      </section>
    );
  }
}

export default ErrorBoundary;
