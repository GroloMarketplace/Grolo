import { Component } from "react";

export default class AppErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F5FFF6] p-6 text-center">
        <div className="max-w-sm rounded-lg border border-[#CFF7D3] bg-white p-6 shadow-sm">
          <h1 className="text-[20px] font-semibold text-[#2C2C2C]">Grolo is having trouble loading</h1>
          <p className="mt-2 text-[14px] leading-[140%] text-[#828282]">Please try again. Your profile and marketplace data are safe.</p>
          <button type="button" onClick={() => window.location.reload()} className="mt-5 rounded-lg bg-[#498467] px-5 py-2.5 text-[14px] font-medium text-white">Reload Grolo</button>
        </div>
      </main>
    );
  }
}
