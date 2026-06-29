'use client';

import { Component } from 'react';

export default class StudioErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Surface to console — replace with error reporting if desired
    console.error('[StudioErrorBoundary] Caught:', error, info.componentStack);
  }

  handleReload() {
    this.setState({ hasError: false, error: null });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-full w-full bg-[#050505] flex items-center justify-center text-white">
          <div className="flex flex-col items-center gap-4 max-w-sm text-center p-8">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <div>
              <p className="font-semibold text-white/90 mb-1">Studio failed to load</p>
              <p className="text-xs text-white/40 font-mono break-all">
                {this.state.error?.message || 'Unknown error'}
              </p>
            </div>
            <button
              onClick={() => this.handleReload()}
              className="px-4 py-2 rounded-md bg-white/5 border border-white/10 text-sm text-white/80 hover:bg-white/10 transition-colors"
            >
              Reload studio
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
