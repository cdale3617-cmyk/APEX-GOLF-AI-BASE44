import React from 'react';
import { Button } from '@/components/ui/button';

/** Keeps a crash on any screen visible instead of leaving a blank page. */
export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-5 font-body text-foreground">
        <div className="glass-panel w-full max-w-sm rounded-2xl p-5">
          <h1 className="text-sm font-bold">Apex Golf could not open this screen</h1>
          <p className="mt-2 break-words text-[11px] leading-relaxed text-muted-foreground">
            {String(error?.message || error)}
          </p>
          <Button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 w-full rounded-xl text-xs font-bold"
          >
            Reload the app
          </Button>
        </div>
      </div>
    );
  }
}