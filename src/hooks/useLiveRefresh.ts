import { useState, useEffect, useCallback } from 'react';

/**
 * Hook for managing auto-refresh intervals for live dials.
 * Triggers an iframe reload by incrementing a refresh key at the configured interval.
 */
export function useLiveRefresh(refreshIntervalSeconds?: number) {
  const [refreshKey, setRefreshKey] = useState(0);

  // Auto-refresh interval
  useEffect(() => {
    if (!refreshIntervalSeconds || refreshIntervalSeconds <= 0) return;

    const timer = setInterval(() => {
      setRefreshKey((k) => k + 1);
    }, refreshIntervalSeconds * 1000);

    return () => clearInterval(timer);
  }, [refreshIntervalSeconds]);

  // Manual refresh trigger
  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return { refreshKey, refresh };
}
