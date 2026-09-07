import React from "react";

// Nothing was catching render errors, so any exception anywhere blanked the
// whole app to a white screen with no way back and nothing in the UI to say
// what happened. This catches it, shows the message, and offers the two things
// that actually recover: reload, or go home.
//
// Class component on purpose -- componentDidCatch has no hook equivalent.

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Kept in the console rather than sent anywhere: there is no error
    // reporting service wired up, and pretending otherwise would be worse
    // than a stack trace someone can actually read.
    console.error("[orbit] render error", error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <main className="min-h-dvh grid place-items-center px-6 py-12 bg-bg text-ink">
        <div className="w-full max-w-[460px] text-center">
          <h1 className="text-2xl font-bold tracking-tight">Something broke on this page</h1>
          <p className="text-md text-ink-2 leading-relaxed mt-3">
            The rest of Orbit is probably fine. Reloading usually clears it.
          </p>

          <pre className="mt-5 p-3 rounded-xl bg-bg-sunken border border-line text-left
            text-xs font-mono text-ink-2 overflow-x-auto">
            {String(this.state.error?.message || this.state.error)}
          </pre>

          <div className="flex items-center justify-center gap-2 mt-6">
            <button
              onClick={() => window.location.reload()}
              className="h-10 px-5 rounded-full bg-solid text-solid-ink text-base font-semibold
                hover:opacity-90 active:scale-[0.98] transition-all"
            >
              Reload
            </button>
            <a
              href="/"
              className="h-10 px-5 rounded-full border border-line text-ink text-base font-semibold
                grid place-items-center hover:bg-bg-sunken transition-colors"
            >
              Go home
            </a>
          </div>
        </div>
      </main>
    );
  }
}
