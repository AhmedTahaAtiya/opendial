import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Globe,
  Shield,
  Code,
  PlaySquare,
  MessageSquare,
  CornerDownLeft,
} from 'lucide-react';
import { DEFAULT_SEARCH_ENGINES } from '../data/initialData';

interface SearchBarProps {
  currentEngineId: string;
  onEngineChange: (engineId: string) => void;
}

const ENGINE_ICONS: Record<string, React.ReactNode> = {
  duckduckgo: <Shield className="w-3.5 h-3.5 text-emerald-400" />,
  google: <Search className="w-3.5 h-3.5 text-amber-400" />,
  bing: <Globe className="w-3.5 h-3.5 text-sky-400" />,
  github: <Code className="w-3.5 h-3.5 text-purple-400" />,
  youtube: <PlaySquare className="w-3.5 h-3.5 text-rose-400" />,
  reddit: <MessageSquare className="w-3.5 h-3.5 text-orange-400" />,
};

export const SearchBar: React.FC<SearchBarProps> = ({ currentEngineId, onEngineChange }) => {
  const [query, setQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeEngine =
    DEFAULT_SEARCH_ENGINES.find((e) => e.id === currentEngineId) || DEFAULT_SEARCH_ENGINES[0];

  // Quick keyboard focus on '/' key or 'Escape' to clear/blur
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== inputRef.current) {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === 'Escape' && document.activeElement === inputRef.current) {
        inputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    let targetEngine = activeEngine;
    let cleanQuery = query.trim();

    // Check for engine prefix shortcuts like !g or !gh
    for (const eng of DEFAULT_SEARCH_ENGINES) {
      if (cleanQuery.startsWith(`${eng.shortcut} `)) {
        targetEngine = eng;
        cleanQuery = cleanQuery.slice(eng.shortcut.length + 1).trim();
        break;
      }
    }

    // Direct URL navigation detection (e.g. github.com, http(s)://..., or localhost:port)
    const isDirectUrl =
      /^(https?:\/\/|[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(\/.*)?$|localhost(:\d+)?(\/.*)?$)/i.test(
        cleanQuery,
      );
    if (isDirectUrl && !cleanQuery.includes(' ') && !cleanQuery.startsWith('!')) {
      const targetUrl = /^https?:\/\//i.test(cleanQuery) ? cleanQuery : `https://${cleanQuery}`;
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    const searchUrl = targetEngine.url.replace('%s', encodeURIComponent(cleanQuery));
    window.open(searchUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="w-full max-w-2xl mx-auto mb-6 px-4" id="opendial-search-container">
      <form onSubmit={handleSearch} className="relative flex flex-col">
        {/* Main Input Box (Fixed Height to prevent vertical jump) */}
        <div
          className={`relative flex items-center h-12 rounded-xl bg-[#121620] border transition-all duration-150 ${
            isFocused
              ? 'border-amber-500/70 ring-2 ring-amber-500/20 shadow-xl shadow-black/40'
              : 'border-[#222a3a] hover:border-[#2e394e]'
          }`}
        >
          {/* Engine Selector Dropdown Button */}
          <div ref={dropdownRef} className="relative shrink-0">
            <button
              type="button"
              id="search-engine-selector-btn"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="ml-2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#18202d] hover:bg-[#202a3c] border border-[#2b374c] text-slate-200 text-xs font-mono font-medium transition-all"
              title={`Switch provider (Current: ${activeEngine.name})`}
            >
              {ENGINE_ICONS[activeEngine.id] || <Search className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline text-[11px] uppercase tracking-wider">
                {activeEngine.name}
              </span>
            </button>

            {isDropdownOpen && (
              <div
                id="search-engines-dropdown"
                className="absolute left-0 top-full mt-2 w-52 bg-[#121620] border border-[#222a3a] rounded-xl shadow-2xl backdrop-blur-md z-50 py-1.5 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
              >
                <div className="px-3 py-1.5 text-[10px] font-mono font-semibold text-slate-400 uppercase tracking-widest border-b border-[#202736]">
                  Search Providers
                </div>
                {DEFAULT_SEARCH_ENGINES.map((engine) => (
                  <button
                    key={engine.id}
                    type="button"
                    onClick={() => {
                      onEngineChange(engine.id);
                      setIsDropdownOpen(false);
                      inputRef.current?.focus();
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left transition-colors ${
                      engine.id === activeEngine.id
                        ? 'bg-amber-500/15 text-amber-300 font-medium'
                        : 'text-slate-300 hover:bg-[#1a202c]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {ENGINE_ICONS[engine.id]}
                      <span>{engine.name}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono bg-[#18202c] px-1.5 py-0.5 rounded border border-[#263142]">
                      {engine.shortcut}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Text Input Field */}
          <input
            ref={inputRef}
            type="text"
            id="opendial-search-input"
            value={query}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${activeEngine.name} or type URL...`}
            className="flex-1 h-full px-3 bg-transparent text-slate-100 placeholder:text-slate-500 text-sm focus:outline-none font-sans min-w-0"
          />

          {/* Right Action Hint / Submit (Zero Layout Shift) */}
          <div className="flex items-center justify-end pr-2 shrink-0 h-full w-20">
            {!query ? (
              <kbd className="hidden sm:inline-flex items-center justify-center w-6 h-6 text-[10px] font-mono text-slate-400 bg-[#18202d] border border-[#283446] rounded-md">
                /
              </kbd>
            ) : (
              <button
                type="submit"
                id="search-submit-btn"
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors shadow-sm"
              >
                <span>Go</span>
                <CornerDownLeft className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Quick-Switch Engine Shortcut Pills (Horizontally scrollable, no wrapping to prevent grid jumping) */}
        <div className="flex items-center justify-center gap-1.5 mt-2 text-[11px] font-mono overflow-x-auto no-scrollbar py-0.5 px-1 max-w-full">
          <span className="text-slate-500 text-[10px] uppercase tracking-wider mr-1 hidden sm:inline shrink-0">
            Switch:
          </span>
          {DEFAULT_SEARCH_ENGINES.map((engine) => {
            const isActive = engine.id === activeEngine.id;
            return (
              <button
                key={engine.id}
                type="button"
                onClick={() => {
                  onEngineChange(engine.id);
                  inputRef.current?.focus();
                }}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-md border transition-all shrink-0 whitespace-nowrap ${
                  isActive
                    ? 'bg-[#1e2738] border-amber-500/40 text-amber-300 font-semibold shadow-sm'
                    : 'bg-[#121620] hover:bg-[#18202d] border-[#202736] text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="opacity-75">{engine.shortcut}</span>
                <span>{engine.name}</span>
              </button>
            );
          })}
        </div>
      </form>
    </div>
  );
};
