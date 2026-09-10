import React, { useState, useEffect } from 'react';
import { Navigation, Search, Loader2, Check, X } from 'lucide-react';
import { DialItem } from '../../types/opendial';
import { WeatherData, fetchWeatherForCity, fetchWeatherForCoords } from '../../services/weather';

interface WeatherDialCardProps {
  dial: DialItem;
  isProductivityMode: boolean;
  onEdit: (dial: DialItem) => void;
  onRecordClick: (dialId: string) => void;
}

export const WeatherDialCard: React.FC<WeatherDialCardProps> = ({
  dial,
  isProductivityMode,
  onEdit,
  onRecordClick,
}) => {
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [locationInput, setLocationInput] = useState(dial.weatherLocation || '');
  const [isDetectingGeo, setIsDetectingGeo] = useState(false);

  // Weather data fetching
  useEffect(() => {
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
    }
    return () => {
      isMounted = false;
    };
  }, [dial.type, dial.weatherLocation]);

  // Geolocation auto-detect handler
  const handleAutoDetectLocation = (e: React.MouseEvent) => {
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
      (err) => {
        console.warn('Geolocation denied or unavailable:', err);
        setIsDetectingGeo(false);
        setIsEditingLocation(true);
      },
      { timeout: 8000, enableHighAccuracy: false },
    );
  };

  // Manual fallback city input submit handler
  const handleSaveLocation = async (e?: React.FormEvent) => {
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
  };

  // Check if hidden by productivity mode
  if (isProductivityMode && dial.isDistracting) {
    return (
      <div
        id={`dial-card-${dial.id}-distraction`}
        className="relative group rounded-xl border border-dashed border-[#2b364a] bg-[#0e121a]/60 p-4 flex flex-col items-center justify-center text-center opacity-40 hover:opacity-100 transition-all min-h-[120px]"
      >
        <div className="text-xs text-slate-400 font-mono font-medium">Distracting Dial Hidden</div>
        <div className="text-[10px] text-slate-500 font-mono mt-0.5">Focus Mode Active</div>
        <button
          onClick={() => window.open(dial.url, '_blank', 'noopener,noreferrer')}
          className="mt-2 text-[10px] font-mono px-2 py-1 bg-[#18202d] text-slate-300 rounded border border-[#2b374d] hover:bg-[#202b3e]"
        >
          Launch Anyway
        </button>
      </div>
    );
  }

  return (
    <div
      id={`dial-card-${dial.id}`}
      role="button"
      tabIndex={0}
      onClick={() => onRecordClick(dial.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onRecordClick(dial.id);
        }
      }}
      className={`group relative flex flex-col justify-between rounded-xl border border-[#202838] hover:border-amber-500/50 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 focus:outline-none bg-[#121620] hover:bg-[#161c28] shadow-sm hover:shadow-lg transition-all duration-150 cursor-pointer min-h-[136px] p-3.5 pb-3 flex flex-col justify-between h-full bg-gradient-to-br from-[#121a28] to-[#0d121c]`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-mono uppercase tracking-wider text-amber-400/90 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            METEOROLOGICAL TELEMETRY
          </div>

          {/* City Name Rendering & Geolocation / Fallback Input */}
          {isEditingLocation ? (
            <form
              onSubmit={handleSaveLocation}
              onClick={(e) => e.stopPropagation()}
              className="mt-1 flex items-center gap-1"
            >
              <input
                type="text"
                autoFocus
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
                placeholder="Enter city (e.g. London)"
                className="w-full text-xs font-medium px-2 py-0.5 rounded bg-[#18202d] border border-amber-500/50 text-white placeholder:text-slate-500 focus:outline-none"
              />
              <button
                type="submit"
                title="Save city"
                className="p-1 rounded bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors shrink-0"
              >
                <Check className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditingLocation(false);
                }}
                title="Cancel"
                className="p-1 rounded bg-[#1f2838] text-slate-400 hover:text-slate-200 transition-colors shrink-0"
              >
                <X className="w-3 h-3" />
              </button>
            </form>
          ) : weatherData || dial.weatherLocation ? (
            <div className="flex items-center gap-1.5 mt-0.5">
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditingLocation(true);
                }}
                className="font-display text-sm sm:text-base font-bold text-white truncate max-w-[150px] sm:max-w-[190px] cursor-pointer hover:text-amber-300 transition-colors"
                title={`${weatherData?.city || dial.weatherLocation || 'Set Location'} (Click to change)`}
              >
                {weatherData?.city || dial.weatherLocation || 'Set Location'}
              </div>

              {/* Geolocation Auto-Detect Button */}
              <button
                type="button"
                onClick={handleAutoDetectLocation}
                className="p-1 rounded hover:bg-[#1f2838] text-slate-400 hover:text-amber-400 transition-colors shrink-0"
                title="Auto-detect location via Geolocation"
              >
                {isDetectingGeo ? (
                  <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
                ) : (
                  <Navigation className="w-3 h-3" />
                )}
              </button>

              {/* Fallback Search Input Toggle Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditingLocation(true);
                }}
                className="p-1 rounded hover:bg-[#1f2838] text-slate-400 hover:text-amber-400 transition-colors shrink-0"
                title="Search city manually"
              >
                <Search className="w-3 h-3" />
              </button>
            </div>
          ) : null}
        </div>

        <div className="text-3xl filter drop-shadow shrink-0 ml-1">
          {weatherData?.icon || (isDetectingGeo || isLoadingWeather ? '⏳' : '⛅')}
        </div>
      </div>

      {!weatherData && !dial.weatherLocation && !isEditingLocation ? (
        <div className="my-auto flex flex-col items-center justify-center text-center py-2">
          <div className="text-xs font-semibold text-slate-200 mb-0.5">Location Not Configured</div>
          <p className="text-[11px] text-slate-400 mb-2.5 max-w-[200px]">
            Auto-detect your local weather or specify your city.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAutoDetectLocation}
              disabled={isDetectingGeo}
              className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs flex items-center gap-1.5 transition-colors"
            >
              {isDetectingGeo ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Navigation className="w-3 h-3" />
              )}
              <span>{isDetectingGeo ? 'Detecting...' : 'Auto-detect GPS'}</span>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsEditingLocation(true);
              }}
              className="px-2.5 py-1 rounded-lg bg-[#18202d] hover:bg-[#222c3d] border border-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1 transition-colors"
            >
              <Search className="w-3 h-3" />
              <span>Set City</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Stats Section with Non-Overflowing Badges */}
          <div className="my-2 flex flex-wrap items-center justify-between gap-1.5">
            <div className="flex items-baseline gap-1.5 min-w-0">
              <span className="font-display text-2xl sm:text-3xl font-extrabold text-white tracking-tight shrink-0">
                {isLoadingWeather ? '...' : `${weatherData?.temperature ?? '--'}°C`}
              </span>
              <span
                className="text-xs font-medium text-slate-300 truncate max-w-[100px]"
                title={weatherData?.condition || 'Updating...'}
              >
                {weatherData?.condition || (isLoadingWeather ? 'Updating...' : 'Ready')}
              </span>
            </div>
            {weatherData && (
              <div className="flex items-center gap-1 font-mono text-[10px] text-slate-300 shrink-0">
                <span
                  className="px-1.5 py-0.5 rounded bg-[#161c28] border border-[#222a3a] whitespace-nowrap"
                  title="Relative Humidity"
                >
                  💧 {weatherData.humidity}%
                </span>
                <span
                  className="px-1.5 py-0.5 rounded bg-[#161c28] border border-[#222a3a] whitespace-nowrap"
                  title="Wind Speed"
                >
                  💨 {weatherData.windSpeed}km/h
                </span>
              </div>
            )}
          </div>

          {/* 5-day mini forecast bar */}
          <div className="grid grid-cols-5 gap-1 pt-2 border-t border-[#222b3b] text-center mt-auto">
            {weatherData?.forecast?.map((day, idx) => (
              <div key={idx} className="flex flex-col items-center">
                <span className="text-[10px] font-mono text-slate-400">{day.dayName}</span>
                <span className="text-sm my-0.5">{day.icon}</span>
                <span className="text-[11px] font-mono font-bold text-slate-200">
                  {day.tempMax}°
                </span>
              </div>
            )) || (
              <div className="col-span-5 text-center text-[10px] font-mono text-slate-500 py-1">
                {isLoadingWeather ? 'Fetching forecast...' : 'No forecast data'}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
