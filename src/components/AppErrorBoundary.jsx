import { Component } from "react";

function errorLocation(error) {
  const match = String(error?.stack ?? "").match(/(?:at .*?\s+)?\(?((?:[A-Z]:|https?:\/\/)[^():]+):(\d+):(\d+)\)?/);
  return match ? { file: match[1], line: match[2], column: match[3] } : { file: "Unavailable", line: "Unavailable", column: "Unavailable" };
}

export default class AppErrorBoundary extends Component {
  state = { hasError: false, error: null, errorInfo: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    console.error("Grolo render error", error, errorInfo);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    const label = this.props.label ?? "Grolo";
    const message = this.state.error?.message ?? String(this.state.error ?? "Unknown render error");
    const location = errorLocation(this.state.error);
    const componentStack = this.state.errorInfo?.componentStack ?? "No component stack available";
    const component = componentStack.match(/at (\w+)/)?.[1] ?? "Unavailable";
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F5FFF6] p-6 text-center">
        <div className="max-w-xl rounded-lg border border-red-200 bg-white p-6 shadow-sm">
          <h1 className="text-[20px] font-semibold text-[#2C2C2C]">{label} Failed</h1>
          <div className="mt-4 space-y-2 text-left text-[13px]"><p><strong>Error:</strong> <span className="text-red-600">{message}</span></p><p><strong>File:</strong> {location.file}</p><p><strong>Line:</strong> {location.line}{location.column !== "Unavailable" ? `:${location.column}` : ""}</p><p><strong>Component:</strong> {component}</p></div>
          <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap text-left text-[11px] text-[#828282]">{componentStack}</pre>
          <button type="button" onClick={() => window.location.reload()} className="mt-5 rounded-lg bg-[#498467] px-5 py-2.5 text-[14px] font-medium text-white">Reload Grolo</button>
        </div>
      </main>
    );
  }
}
