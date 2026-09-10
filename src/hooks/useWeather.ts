import React, { useState, useEffect, useCallback } from 'react';
import { WeatherData, fetchWeatherForCity, fetchWeatherForCoords } from '../services/weather';
import { DialItem } from '../types/opendial';

/**
 * Hook for weather data fetching and location management.
 * Encapsulates weather API calls, geolocation auto-detection,
 * and manual city selection.
 */
export function useWeather(dial: DialItem, onEdit?: (dial: DialItem) => void) {
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [locationInput, setLocationInput] = useState(dial.weatherLocation || '');
  const [isDetectingGeo, setIsDetectingGeo] = useState(false);

  // Fetch weather data when the dial is a weather type
  useEffect(() => {
    if (dial.type !== 'weather') return;

    let isMounted = true;
    if (dial.weatherLocation && dial.weatherLocation.trim()) {
      setIsLoadingWeather(true);
      fetchWeatherForCity(dial.weatherLocation.trim())
        .then((data) => {
          if (isMounted) {
            setWeatherData(data);
            setIsLoadingWeather(false);
            setLocationInput(data.city || dial.weatherLocation || '');
          }
        })
        .catch(() => {
          if (isMounted) setIsLoadingWeather(false);
        });
    } else {
      // Auto-detect via Geolocation API if available
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        setIsDetectingGeo(true);
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            try {
              const { latitude, longitude } = position.coords;
              const data = await fetchWeatherForCoords(latitude, longitude);
              if (isMounted) {
                setWeatherData(data);
                setIsDetectingGeo(false);
                setLocationInput(data.city);
                if (data.city && onEdit) {
                  onEdit({ ...dial, weatherLocation: data.city });
                }
              }
            } catch {
              if (isMounted) {
                setIsDetectingGeo(false);
              }
            }
          },
          () => {
            if (isMounted) {
              setIsDetectingGeo(false);
            }
          },
          { timeout: 7000, enableHighAccuracy: false },
        );
      }
      return () => {
        isMounted = false;
      };
    }
    return () => {
      isMounted = false;
    };
  }, [dial, dial.type, dial.weatherLocation, onEdit]);

  // Geolocation auto-detect handler
  const handleAutoDetectLocation = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!navigator.geolocation) {
        setIsEditingLocation(true);
        return;
      }
      setIsDetectingGeo(true);
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            const data = await fetchWeatherForCoords(latitude, longitude);
            setWeatherData(data);
            setIsDetectingGeo(false);
            setIsEditingLocation(false);
            setLocationInput(data.city);
            if (data.city && onEdit) {
              onEdit({ ...dial, weatherLocation: data.city });
            }
          } catch {
            setIsDetectingGeo(false);
            setIsEditingLocation(true);
          }
        },
        () => {
          setIsDetectingGeo(false);
          setIsEditingLocation(true);
        },
        { timeout: 8000, enableHighAccuracy: false },
      );
    },
    [dial, onEdit],
  );

  // Manual fallback city input submit handler
  const handleSaveLocation = useCallback(
    async (e?: React.FormEvent) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      const cleanCity = locationInput.trim();
      if (!cleanCity) {
        setIsEditingLocation(false);
        return;
      }
      setIsLoadingWeather(true);
      setIsEditingLocation(false);
      try {
        const data = await fetchWeatherForCity(cleanCity);
        setWeatherData(data);
        setIsLoadingWeather(false);
        setLocationInput(data.city);
        if (onEdit) {
          onEdit({ ...dial, weatherLocation: data.city });
        }
      } catch {
        setIsLoadingWeather(false);
      }
    },
    [dial, locationInput, onEdit],
  );

  return {
    weatherData,
    isLoadingWeather,
    isEditingLocation,
    setIsEditingLocation,
    locationInput,
    setLocationInput,
    isDetectingGeo,
    handleAutoDetectLocation,
    handleSaveLocation,
  };
}
