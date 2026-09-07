import React, { useState, useEffect, useRef } from 'react';
import {
  ExternalLink,
  MoreVertical,
  Layers,
  Zap,
  Folder,
  RefreshCw,
  Edit2,
  Trash2,
  Maximize2,
  Minimize2,
  Navigation,
  MapPin,
  Search,
  Check,
  X,
  Loader2,
} from 'lucide-react';
import { DialItem, FirefoxContainer } from '../types/opendial';
import { fetchWeatherForCity, fetchWeatherForCoords, WeatherData } from '../services/weather';

interface DialCardProps {
  dial: DialItem;
  index?: number;
  showHotkeys?: boolean;
  viewDensity?: 'station' | 'compact' | 'editorial';
  isProductivityMode: boolean;
  onOpenFolder?: (folderId: string) => void;
  onEdit: (dial: DialItem) => void;
  onDelete: (dialId: string) => void;
  onToggleSpan: (dialId: string) => void;
  onRecordClick: (dialId: string) => void;
}

const CONTAINER_COLORS: Record<FirefoxContainer, { name: string; bg: string; border: string }> = {
  none: { name: '', bg: '', border: '' },
  personal: { name: 'Personal', bg: 'bg-cyan-500', border: 'border-cyan-400/50' },
  work: { name: 'Work', bg: 'bg-amber-500', border: 'border-amber-400/50' },
  banking: { name: 'Banking', bg: 'bg-emerald-500', border: 'border-emerald-400/50' },
  shopping: { name: 'Shopping', bg: 'bg-rose-500', border: 'border-rose-400/50' },
};

export const DialCard: React.FC<DialCardProps> = ({
  dial,
  index,
  showHotkeys = true,
  viewDensity = 'station',
  isProductivityMode,
  onOpenFolder,
  onEdit,
  onDelete,
  onToggleSpan,
  onRecordClick,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close context menu on outside click or Escape
  useEffect(() => {
    if (!showMenu) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [showMenu]);

  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);
  const [isMultiOpen, setIsMultiOpen] = useState(false);
  const [iframeRefreshKey, setIframeRefreshKey] = useState(0);

  // Weather customization & geolocation state
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [locationInput, setLocationInput] = useState(dial.weatherLocation || '');
  const [isDetectingGeo, setIsDetectingGeo] = useState(false);

  // Weather data fetching
  useEffect(() => {
    if (dial.type === 'weather') {
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
            { timeout: 7000, enableHighAccuracy: false }
          );
        }
      }
      return () => {
        isMounted = false;
      };
    }
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
      { timeout: 8000, enableHighAccuracy: false }
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

  // Live dial auto-refresh interval
  useEffect(() => {
    if (dial.type === 'live' && dial.liveRefreshInterval && dial.liveRefreshInterval > 0) {
      const timer = setInterval(() => {
        setIframeRefreshKey((k) => k + 1);
      }, dial.liveRefreshInterval * 1000);
      return () => clearInterval(timer);
    }
  }, [dial.type, dial.liveRefreshInterval]);

  const handleDialClick = (e: React.MouseEvent | React.KeyboardEvent) => {
    // If clicking menu buttons or inner interactive elements, prevent navigating
    if ((e.target as HTMLElement).closest('.dial-actions-menu, button, a, input, textarea, select')) {
      return;
    }

    onRecordClick(dial.id);

    if (dial.type === 'folder' && dial.folderId && onOpenFolder) {
      onOpenFolder(dial.folderId);
      return;
    }

    if (dial.type === 'multipage') {
      setIsMultiOpen(!isMultiOpen);
      return;
    }

    // Standard navigation
    if (dial.url && dial.type !== 'live') {
      window.open(dial.url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleOpenAllMultiLinks = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (dial.multiLinks && dial.multiLinks.length > 0) {
      dial.multiLinks.forEach((link) => {
        window.open(link.url, '_blank', 'noopener,noreferrer');
      });
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

  // Determine ColSpan & RowSpan CSS classes
  const colSpanClass =
    dial.colSpan === 3
      ? 'col-span-1 sm:col-span-2 lg:col-span-3'
      : dial.colSpan === 2
      ? 'col-span-1 sm:col-span-2'
      : 'col-span-1';

  const rowSpanClass = dial.rowSpan === 2 ? 'row-span-2' : 'row-span-1';

  // Domain name extractor
  let domain = '';
  try {
    domain = new URL(dial.url).hostname.replace(/^www\./, '');
  } catch {
    domain = dial.url;
  }

  const containerInfo = dial.container ? CONTAINER_COLORS[dial.container] : null;
  const isNumbered = showHotkeys && index !== undefined && index < 9;

  // Render Action Menu Dropdown
  const renderActionMenu = () => {
    return (
      <div
        ref={menuRef}
        className={`dial-actions-menu absolute top-2 right-2 z-50 flex items-center gap-1 transition-opacity ${
          showMenu ? 'opacity-100 pointer-events-auto' : 'opacity-0 group-hover:opacity-100'
        }`}
      >
        {dial.type === 'folder' && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onDelete(dial.id);
            }}
            className="p-1 rounded-md bg-[#0c1018]/90 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-[#232c3d] hover:border-rose-500/40 shadow-sm cursor-pointer transition-colors"
            title="Delete Folder"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}

        <div className="relative">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setShowMenu(!showMenu);
            }}
            className="p-1 rounded-md bg-[#0c1018]/90 hover:bg-[#1a2232] text-slate-400 hover:text-slate-100 border border-[#232c3d] shadow-sm cursor-pointer"
            title={dial.type === 'folder' ? 'Folder Options' : 'Dial Options'}
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </button>

          {showMenu && (
            <div
              className="absolute right-0 top-full mt-1 w-48 bg-[#121620] border border-[#2e3b52] rounded-xl shadow-2xl backdrop-blur-md py-1 z-50 text-xs text-slate-200 divide-y divide-[#1e2738]"
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              {dial.type === 'folder' ? (
                <div className="py-0.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setShowMenu(false);
                      if (dial.folderId && onOpenFolder) {
                        onOpenFolder(dial.folderId);
                      }
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-[#1a2130] text-left cursor-pointer transition-colors"
                  >
                    <Folder className="w-3.5 h-3.5 text-amber-400" />
                    <span className="font-medium text-slate-100">Open Drawer</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setShowMenu(false);
                      onDelete(dial.id);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-rose-500/15 text-rose-400 text-left cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="font-medium">Delete Folder</span>
                  </button>
                </div>
              ) : (
                <>
                  <div className="py-0.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setShowMenu(false);
                        onEdit(dial);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-[#1a2130] text-left cursor-pointer transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-amber-400" />
                      <span className="font-medium text-slate-100">Edit Dial</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setShowMenu(false);
                        onToggleSpan(dial.id);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-[#1a2130] text-left cursor-pointer transition-colors"
                    >
                      {dial.colSpan === 2 ? (
                        <>
                          <Minimize2 className="w-3.5 h-3.5 text-sky-400" />
                          <span className="font-medium text-slate-100">Shrink Size (1x1)</span>
                        </>
                      ) : (
                        <>
                          <Maximize2 className="w-3.5 h-3.5 text-sky-400" />
                          <span className="font-medium text-slate-100">Expand Size (2x1)</span>
                        </>
                      )}
                    </button>

                    {dial.type === 'live' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          setShowMenu(false);
                          setIframeRefreshKey((k) => k + 1);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-[#1a2130] text-left cursor-pointer transition-colors"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="font-medium text-slate-100">Refresh Live Monitor</span>
                      </button>
                    )}
                  </div>

                  <div className="py-0.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setShowMenu(false);
                        onDelete(dial.id);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-rose-500/15 text-rose-400 text-left cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="font-medium">Remove Dial</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Compact view layout
  if (viewDensity === 'compact' && dial.type === 'standard') {
    return (
      <div
        id={`dial-card-${dial.id}`}
        role="button"
        tabIndex={0}
        onClick={handleDialClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleDialClick(e);
          }
        }}
        className={`group relative flex items-center justify-between px-3 py-2 rounded-lg border border-[#202838] hover:border-amber-500/50 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 focus:outline-none bg-[#121620] hover:bg-[#161c28] transition-all cursor-pointer shadow-sm ${
          showMenu ? 'overflow-visible z-40' : 'overflow-hidden z-0'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {isNumbered && (
            <span className="font-mono text-[10px] text-amber-400/80 font-bold w-4">
              [{index + 1}]
            </span>
          )}
          {dial.customThumbnail ? (
            <img
              src={dial.customThumbnail}
              alt={dial.title}
              className="w-5 h-5 rounded object-cover border border-[#2b3548]"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-5 h-5 rounded bg-[#1a2232] border border-[#28354a] flex items-center justify-center font-mono text-[9px] font-bold text-amber-400">
              {dial.title.slice(0, 1).toUpperCase()}
            </div>
          )}
          <span className="font-medium text-xs text-slate-100 truncate group-hover:text-amber-300 transition-colors">
            {dial.title}
          </span>
          <span className="hidden sm:inline font-mono text-[10px] text-slate-400 truncate">
            {domain}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {containerInfo?.name && (
            <span
              className={`w-1.5 h-1.5 rounded-full ${containerInfo.bg}`}
              title={`Container: ${containerInfo.name}`}
            />
          )}
          {renderActionMenu()}
          <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-amber-400 transition-colors opacity-0 group-hover:opacity-100" />
        </div>
      </div>
    );
  }

  // Standard and editorial view layout
  return (
    <div
      id={`dial-card-${dial.id}`}
      role="button"
      tabIndex={0}
      onClick={handleDialClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleDialClick(e);
        }
      }}
      className={`group relative flex flex-col justify-between rounded-xl border border-[#202838] hover:border-amber-500/50 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 focus:outline-none bg-[#121620] hover:bg-[#161c28] shadow-sm hover:shadow-lg transition-all duration-150 cursor-pointer ${
        showMenu ? 'overflow-visible z-40' : 'overflow-hidden z-0'
      } ${colSpanClass} ${rowSpanClass} ${
        dial.rowSpan === 2 ? 'min-h-[280px]' : viewDensity === 'editorial' ? 'min-h-[155px]' : 'min-h-[136px]'
      }`}
      style={{
        background: dial.bgColor || undefined,
        color: dial.textColor || undefined,
      }}
    >
      {/* Top Banner / Firefox Container precision rule */}
      {containerInfo && containerInfo.name && (
        <div
          className={`absolute top-0 left-0 right-0 h-0.5 ${containerInfo.bg}`}
          title={`Firefox Container: ${containerInfo.name}`}
        />
      )}

      {/* Floating Action Menu Button */}
      {renderActionMenu()}

      {/* 1. WEATHER DIAL */}
      {dial.type === 'weather' ? (
        <div className="p-3.5 pb-3 flex flex-col justify-between h-full bg-gradient-to-br from-[#121a28] to-[#0d121c]">
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
                    <span className="text-[11px] font-mono font-bold text-slate-200">{day.tempMax}°</span>
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
      ) : dial.type === 'live' ? (
        /* 2. LIVE DIAL (Interactive Iframe with scaling, crop, and hidden scrollbars) */
        <div className="relative w-full h-full flex flex-col bg-[#0b0e14]">
          <div className="p-2 px-3 flex items-center justify-between border-b border-[#202838] bg-[#0e121a] z-10">
            <div className="flex items-center gap-2 truncate">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-mono text-xs font-semibold text-slate-200 truncate">{dial.title}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIframeRefreshKey((k) => k + 1);
                }}
                className="p-1 text-slate-400 hover:text-slate-200 transition-colors"
                title="Refresh Live Dial"
              >
                <RefreshCw className="w-3 h-3" />
              </button>
              <a
                href={dial.liveUrl || dial.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="p-1 text-slate-400 hover:text-amber-400 transition-colors"
                title="Open in new tab"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          <div className="relative flex-1 overflow-hidden bg-black live-dial-iframe-container">
            <iframe
              key={iframeRefreshKey}
              src={dial.liveUrl || dial.url}
              title={dial.title}
              scrolling="no"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              loading="lazy"
              className="w-full h-full border-0 pointer-events-auto overflow-hidden no-scrollbar"
              style={{
                transform: `scale(${(dial.liveZoom || 100) / 100})`,
                transformOrigin: 'top left',
                marginTop: `-${dial.liveCropTop || 0}px`,
                width: `${100 * (100 / (dial.liveZoom || 100))}%`,
                height: `${100 * (100 / (dial.liveZoom || 100))}%`,
                overflow: 'hidden',
              }}
            />
          </div>
        </div>
      ) : dial.type === 'multipage' ? (
        /* 3. MULTI-PAGE DIAL */
        <div className="p-3.5 pb-3 flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#18202d] border border-[#2b374c] flex items-center justify-center text-amber-400">
                  <Layers className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-display text-sm font-bold text-slate-100 truncate">{dial.title}</div>
                  <div className="font-mono text-[10px] text-slate-400">
                    {dial.multiLinks?.length || 0} target links
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleOpenAllMultiLinks}
                className="dial-actions-menu text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-[#18202d] hover:bg-[#202b3e] border border-[#2b374c] text-amber-400 transition-colors"
                title="Launch all links in tabs"
              >
                OPEN ALL
              </button>
            </div>

            {/* Sub links list */}
            <div className="mt-2 space-y-1">
              {dial.multiLinks?.slice(0, 3).map((sub) => (
                <a
                  key={sub.id}
                  href={sub.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center justify-between px-2 py-1 rounded bg-[#161c28] hover:bg-[#1e2738] hover:text-amber-300 text-slate-300 text-xs transition-colors"
                >
                  <span className="truncate">{sub.title}</span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>
              ))}
            </div>
          </div>

          {dial.tags && dial.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-auto pt-2 border-t border-[#1a2130]">
              {dial.tags.map((t) => (
                <span
                  key={t}
                  className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-[#161c28] text-slate-400 border border-[#222a3a]"
                >
                  #{t}
                </span>
              ))}
            </div>
          )}
        </div>
      ) : dial.type === 'folder' ? (
        /* 4. FOLDER DIAL */
        <div className="p-4 flex flex-col items-center justify-center text-center h-full group-hover:scale-[1.01] transition-transform">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-2 shadow-inner">
            <Folder className="w-5 h-5" />
          </div>
          <div className="font-display text-sm font-bold text-slate-100 truncate w-full px-2">
            {dial.title}
          </div>
          <div className="font-mono text-[10px] text-slate-400 mt-0.5">OPEN DRAWER</div>
        </div>
      ) : (
        /* 5. STANDARD SPEED DIAL */
        <div className="p-3.5 pb-3 flex flex-col justify-between h-full">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              {dial.customThumbnail ? (
                <img
                  src={dial.customThumbnail}
                  alt={dial.title}
                  className="w-8 h-8 rounded-lg object-cover border border-[#283446] shadow-sm flex-shrink-0"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-[#18202d] border border-[#283446] flex items-center justify-center font-display font-bold text-xs text-amber-400 shadow-sm flex-shrink-0">
                  {dial.title.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 overflow-hidden">
                <div className="font-display text-sm font-semibold text-slate-100 truncate group-hover:text-amber-300 transition-colors">
                  {dial.title}
                </div>
                <div className="font-mono text-[11px] text-slate-400 truncate">{domain}</div>
              </div>
            </div>

            {/* Hotkey accelerator indicator [1]..[9] */}
            {isNumbered && (
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#18202d] border border-[#283446] text-amber-400/90 font-bold group-hover:border-amber-400 group-hover:text-amber-300 transition-colors flex-shrink-0">
                [{index + 1}]
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-1.5 pt-2 mt-auto border-t border-[#1a2130]">
            {/* Tags & Container pill (flex-wrap & generous padding-bottom) */}
            <div className="flex flex-wrap items-center gap-1 min-w-0 flex-1">
              {containerInfo?.name && (
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#18202d] text-slate-300 border border-[#283446] flex items-center gap-1 shrink-0">
                  <span className={`w-1 h-1 rounded-full ${containerInfo.bg}`} />
                  {containerInfo.name}
                </span>
              )}
              {dial.tags && dial.tags.length > 0 && dial.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#161c28] text-slate-400 border border-[#202736] hover:text-slate-200 transition-colors shrink-0"
                >
                  #{tag}
                </span>
              ))}
            </div>

            {/* Indicators */}
            <div className="flex items-center gap-1.5 text-slate-400 shrink-0 ml-auto">
              {dial.automatedAction?.enabled && (
                <span
                  title="Automated Action attached (auto-fill or click)"
                  className="text-amber-400"
                >
                  <Zap className="w-3 h-3" />
                </span>
              )}
              <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-amber-400" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
