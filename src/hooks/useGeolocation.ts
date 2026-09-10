import { useState, useCallback } from 'react';

/**
 * Hook for geolocation-based location detection.
 * Wraps the browser Geolocation API with error handling and loading state.
 */
export function useGeolocation() {
  const [isDetectingGeo, setIsDetectingGeo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const detectLocation = useCallback(
    (callback: (lat: number, lon: number) => Promise<void>, onError?: (msg: string) => void) => {
      if (!navigator.geolocation) {
        const msg = 'Geolocation is not supported by this browser';
        setError(msg);
        onError?.(msg);
        return;
      }

      setIsDetectingGeo(true);
      setError(null);

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            await callback(position.coords.latitude, position.coords.longitude);
            setIsDetectingGeo(false);
          } catch {
            setIsDetectingGeo(false);
          }
        },
        (err) => {
          const msg = err.message || 'Geolocation denied or unavailable';
          setError(msg);
          setIsDetectingGeo(false);
          onError?.(msg);
        },
        { timeout: 8000, enableHighAccuracy: false },
      );
    },
    [],
  );

  const resetError = useCallback(() => setError(null), []);

  return {
    isDetectingGeo,
    error,
    detectLocation,
    resetError,
  };
}
