import { useEffect, useState } from 'react';

/** Wake locks are best effort: Android WebView support differs by OS version. */
export function useScreenWakeLock(enabled) {
  const [status, setStatus] = useState('off');

  useEffect(() => {
    if (!enabled) { setStatus('off'); return undefined; }
    if (!navigator.wakeLock?.request) { setStatus('unsupported'); return undefined; }

    let active = true;
    let sentinel = null;
    let pending = false;
    const request = async () => {
      if (!active || document.visibilityState !== 'visible' || pending || (sentinel && !sentinel.released)) return;
      pending = true;
      try {
        const lock = await navigator.wakeLock.request('screen');
        if (!active) { await lock.release(); return; }
        sentinel = lock;
        setStatus('active');
        lock.addEventListener('release', () => {
          if (active) { sentinel = null; setStatus('released'); }
        });
      } catch {
        if (active) setStatus('unavailable');
      } finally { pending = false; }
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') request();
    };
    document.addEventListener('visibilitychange', onVisibility);
    request();
    return () => {
      active = false;
      document.removeEventListener('visibilitychange', onVisibility);
      if (sentinel && !sentinel.released) sentinel.release().catch(() => {});
    };
  }, [enabled]);

  return status;
}