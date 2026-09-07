import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Globe,
  Layers,
  CloudSun,
  Tv,
  Upload,
  Sparkles,
  Plus,
  Trash2,
  Check,
} from 'lucide-react';
import { DialItem, DialType, FirefoxContainer, FolderItem, MultiPageLink } from '../types/opendial';
import { saveThumbnailBlob } from '../services/storage';

interface EditDialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (dial: DialItem) => void;
  initialDial?: DialItem | null;
  folders: FolderItem[];
  defaultFolderId?: string | null;
}

export const EditDialModal: React.FC<EditDialModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialDial,
  folders,
  defaultFolderId,
}) => {
  const [type, setType] = useState<DialType>(initialDial?.type || 'standard');
  const [title, setTitle] = useState(initialDial?.title || '');
  const [url, setUrl] = useState(initialDial?.url || '');
  const [folderId, setFolderId] = useState<string | null>(
    initialDial?.folderId !== undefined ? initialDial.folderId : defaultFolderId || null
  );
  const [container, setContainer] = useState<FirefoxContainer>(initialDial?.container || 'none');
  const [colSpan, setColSpan] = useState<1 | 2 | 3>(initialDial?.colSpan || 1);
  const [rowSpan, setRowSpan] = useState<1 | 2>(initialDial?.rowSpan || 1);
  const [tagsInput, setTagsInput] = useState(initialDial?.tags?.join(', ') || '');
  const [bgColor, setBgColor] = useState(initialDial?.bgColor || '');
  const [isDistracting, setIsDistracting] = useState(initialDial?.isDistracting || false);

  // Live Dial specific
  const [liveUrl, setLiveUrl] = useState(initialDial?.liveUrl || '');
  const [liveZoom, setLiveZoom] = useState<number>(initialDial?.liveZoom || 100);
  const [liveCropTop, setLiveCropTop] = useState<number>(initialDial?.liveCropTop || 0);
  const [liveRefreshInterval, setLiveRefreshInterval] = useState<number>(
    initialDial?.liveRefreshInterval || 0
  );

  // Multi-page specific
  const [multiLinks, setMultiLinks] = useState<MultiPageLink[]>(
    initialDial?.multiLinks || [
      { id: '1', title: 'Home', url: 'https://example.com' },
      { id: '2', title: 'Dashboard', url: 'https://example.com/dash' },
    ]
  );

  // Weather dial specific
  const [weatherLocation, setWeatherLocation] = useState(
    initialDial?.weatherLocation || ''
  );

  // Custom thumbnail
  const [thumbnailUrl, setThumbnailUrl] = useState(initialDial?.customThumbnail || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync internal state whenever modal opens or initialDial/defaultFolderId changes
  useEffect(() => {
    if (!isOpen) return;
    if (initialDial) {
      setType(initialDial.type || 'standard');
      setTitle(initialDial.title || '');
      setUrl(initialDial.url || '');
      setFolderId(initialDial.folderId !== undefined ? initialDial.folderId : defaultFolderId || null);
      setContainer(initialDial.container || 'none');
      setColSpan(initialDial.colSpan || 1);
      setRowSpan(initialDial.rowSpan || 1);
      setTagsInput(initialDial.tags?.join(', ') || '');
      setBgColor(initialDial.bgColor || '');
      setIsDistracting(initialDial.isDistracting || false);
      setLiveUrl(initialDial.liveUrl || '');
      setLiveZoom(initialDial.liveZoom || 100);
      setLiveCropTop(initialDial.liveCropTop || 0);
      setLiveRefreshInterval(initialDial.liveRefreshInterval || 0);
      setMultiLinks(
        initialDial.multiLinks || [
          { id: '1', title: 'Home', url: 'https://example.com' },
          { id: '2', title: 'Dashboard', url: 'https://example.com/dash' },
        ]
      );
      setWeatherLocation(initialDial.weatherLocation || '');
      setThumbnailUrl(initialDial.customThumbnail || '');
    } else {
      setType('standard');
      setTitle('');
      setUrl('');
      setFolderId(defaultFolderId || null);
      setContainer('none');
      setColSpan(1);
      setRowSpan(1);
      setTagsInput('');
      setBgColor('');
      setIsDistracting(false);
      setLiveUrl('');
      setLiveZoom(100);
      setLiveCropTop(0);
      setLiveRefreshInterval(0);
      setMultiLinks([
        { id: '1', title: 'Home', url: 'https://example.com' },
        { id: '2', title: 'Dashboard', url: 'https://example.com/dash' },
      ]);
      setWeatherLocation('');
      setThumbnailUrl('');
    }
  }, [isOpen, initialDial, defaultFolderId]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setThumbnailUrl(dataUrl);
      // Also cache to IndexedDB
      const dialId = initialDial?.id || `thumb_${Date.now()}`;
      await saveThumbnailBlob(dialId, dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleAddMultiLink = () => {
    setMultiLinks([
      ...multiLinks,
      { id: `ml_${Date.now()}`, title: 'New Link', url: 'https://' },
    ]);
  };

  const handleUpdateMultiLink = (id: string, field: 'title' | 'url', val: string) => {
    setMultiLinks(
      multiLinks.map((link) => (link.id === id ? { ...link, [field]: val } : link))
    );
  };

  const handleDeleteMultiLink = (id: string) => {
    setMultiLinks(multiLinks.filter((link) => link.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() && type !== 'weather') return;

    const cleanTags = tagsInput
      .split(',')
      .map((t) => t.trim().replace(/^#/, ''))
      .filter(Boolean);

    let finalUrl = url.trim();
    if (finalUrl && !/^https?:\/\//i.test(finalUrl)) {
      finalUrl = `https://${finalUrl}`;
    }

    let finalLiveUrl = liveUrl.trim();
    if (finalLiveUrl && !/^https?:\/\//i.test(finalLiveUrl)) {
      finalLiveUrl = `https://${finalLiveUrl}`;
    }

    const item: DialItem = {
      id: initialDial?.id || `dial_${Date.now()}`,
      title: title.trim() || (type === 'weather' ? `${weatherLocation} Weather` : 'Untitled Dial'),
      url: finalUrl || (type === 'weather' ? 'https://open-meteo.com' : 'https://google.com'),
      type,
      folderId: folderId || null,
      container,
      colSpan,
      rowSpan,
      tags: cleanTags,
      bgColor: bgColor || undefined,
      customThumbnail: thumbnailUrl || undefined,
      isDistracting,
      createdAt: initialDial?.createdAt || Date.now(),
      // Specific types
      liveUrl: type === 'live' ? finalLiveUrl || finalUrl : undefined,
      liveZoom: type === 'live' ? liveZoom : undefined,
      liveCropTop: type === 'live' ? liveCropTop : undefined,
      liveRefreshInterval: type === 'live' ? liveRefreshInterval : undefined,
      multiLinks: type === 'multipage' ? multiLinks : undefined,
      weatherLocation: type === 'weather' ? weatherLocation : undefined,
    };

    onSave(item);
    onClose();
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto"
    >
      <div
        className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150 text-slate-100"
        id="edit-dial-modal-container"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <h2 className="text-base font-bold text-slate-100">
            {initialDial ? 'Edit Speed Dial' : 'Add New Speed Dial'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Dial Type Tabs */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Dial Type
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setType('standard')}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                  type === 'standard'
                    ? 'bg-sky-500/20 border-sky-500 text-sky-300'
                    : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Globe className="w-4 h-4 text-sky-400" />
                <span>Standard</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setType('live');
                  if (colSpan === 1) setColSpan(2);
                  if (rowSpan === 1) setRowSpan(2);
                }}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                  type === 'live'
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                    : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Tv className="w-4 h-4 text-emerald-400" />
                <span>Live Iframe</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setType('multipage');
                  if (colSpan === 1) setColSpan(2);
                }}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                  type === 'multipage'
                    ? 'bg-purple-500/20 border-purple-500 text-purple-300'
                    : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Layers className="w-4 h-4 text-purple-400" />
                <span>Multi-page</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setType('weather');
                  if (colSpan === 1) setColSpan(2);
                }}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                  type === 'weather'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                    : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <CloudSun className="w-4 h-4 text-amber-400" />
                <span>Weather</span>
              </button>
            </div>
          </div>

          {/* Core Fields: Title & URL */}
          {type !== 'weather' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Dial Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. GitHub, Hacker News"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Destination URL *
                </label>
                <input
                  type="text"
                  required
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>
          )}

          {/* Weather dial settings */}
          {type === 'weather' && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Forecast Location (City Name)
              </label>
              <input
                type="text"
                value={weatherLocation}
                onChange={(e) => setWeatherLocation(e.target.value)}
                placeholder="e.g. London, Tokyo, New York (or leave blank to auto-detect GPS)"
                className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Uses Open-Meteo free geocoding and 5-day weather forecast API (zero tracking).
              </p>
            </div>
          )}

          {/* Live dial settings */}
          {type === 'live' && (
            <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-3">
              <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                Live Iframe Configuration
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Embed URL (defaults to Destination URL)
                </label>
                <input
                  type="text"
                  value={liveUrl}
                  onChange={(e) => setLiveUrl(e.target.value)}
                  placeholder="https://wikipedia.org or embed-friendly site"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Zoom Level: {liveZoom}%
                  </label>
                  <input
                    type="range"
                    min="50"
                    max="150"
                    step="5"
                    value={liveZoom}
                    onChange={(e) => setLiveZoom(Number(e.target.value))}
                    className="w-full accent-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Crop Top: {liveCropTop}px
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="500"
                    value={liveCropTop}
                    onChange={(e) => setLiveCropTop(Number(e.target.value))}
                    className="w-full px-2 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Refresh Interval (sec)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="3600"
                    value={liveRefreshInterval}
                    onChange={(e) => setLiveRefreshInterval(Number(e.target.value))}
                    placeholder="0 = manual"
                    className="w-full px-2 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Multi-page links */}
          {type === 'multipage' && (
            <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-purple-400 uppercase tracking-wider">
                  Multi-Page Sub Links ({multiLinks.length})
                </div>
                <button
                  type="button"
                  onClick={handleAddMultiLink}
                  className="flex items-center gap-1 px-2 py-1 rounded bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Link</span>
                </button>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {multiLinks.map((link) => (
                  <div key={link.id} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={link.title}
                      onChange={(e) => handleUpdateMultiLink(link.id, 'title', e.target.value)}
                      placeholder="Title"
                      className="w-1/3 px-2 py-1 rounded bg-slate-800 border border-slate-700 text-xs"
                    />
                    <input
                      type="text"
                      value={link.url}
                      onChange={(e) => handleUpdateMultiLink(link.id, 'url', e.target.value)}
                      placeholder="https://"
                      className="flex-1 px-2 py-1 rounded bg-slate-800 border border-slate-700 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => handleDeleteMultiLink(link.id)}
                      className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Grid sizing and container */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Grid Width (ColSpan)
              </label>
              <select
                value={colSpan}
                onChange={(e) => setColSpan(Number(e.target.value) as 1 | 2 | 3)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-100 text-xs focus:ring-2 focus:ring-sky-500"
              >
                <option value={1}>1 Column (Standard)</option>
                <option value={2}>2 Columns (Wide)</option>
                <option value={3}>3 Columns (Ultra Wide)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Grid Height (RowSpan)
              </label>
              <select
                value={rowSpan}
                onChange={(e) => setRowSpan(Number(e.target.value) as 1 | 2)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-100 text-xs focus:ring-2 focus:ring-sky-500"
              >
                <option value={1}>1 Row (Standard)</option>
                <option value={2}>2 Rows (Tall/Expanded)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Firefox Container Tab
              </label>
              <select
                value={container}
                onChange={(e) => setContainer(e.target.value as FirefoxContainer)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-100 text-xs focus:ring-2 focus:ring-sky-500"
              >
                <option value="none">None / Default</option>
                <option value="personal">Personal (Cyan)</option>
                <option value="work">Work (Amber)</option>
                <option value="banking">Banking (Emerald)</option>
                <option value="shopping">Shopping (Rose)</option>
              </select>
            </div>
          </div>

          {/* Folder and tags */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Folder Organization
              </label>
              <select
                value={folderId || ''}
                onChange={(e) => setFolderId(e.target.value ? e.target.value : null)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-100 text-xs focus:ring-2 focus:ring-sky-500"
              >
                <option value="">None (Root Dashboard)</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    📁 {f.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Tags (comma separated)
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="dev, tools, news, social"
                className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-100 text-xs focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          {/* Custom thumbnail and background color */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Custom Thumbnail (Local Blob)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Image</span>
                </button>
                {thumbnailUrl && (
                  <img
                    src={thumbnailUrl}
                    alt="Preview"
                    className="w-8 h-8 rounded-lg object-cover border border-slate-700"
                  />
                )}
                {thumbnailUrl && (
                  <button
                    type="button"
                    onClick={() => setThumbnailUrl('')}
                    className="text-xs text-rose-400 hover:underline"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Card Accent / Custom Color
              </label>
              <input
                type="text"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                placeholder="#1e293b or gradient"
                className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-100 text-xs font-mono focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          {/* Focus mode preference */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 border border-slate-700/60">
            <div>
              <div className="text-xs font-semibold text-slate-200">
                Distracting / Leisure Dial
              </div>
              <div className="text-[11px] text-slate-400">
                Automatically hide or dim when Productivity Focus Mode is enabled.
              </div>
            </div>
            <input
              type="checkbox"
              checked={isDistracting}
              onChange={(e) => setIsDistracting(e.target.checked)}
              className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 bg-slate-800 border-slate-700"
            />
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold transition-colors shadow-md shadow-sky-600/30"
            >
              <Check className="w-4 h-4" />
              <span>Save Speed Dial</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
