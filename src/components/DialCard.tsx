import React, { useState, useEffect } from 'react';
import { DialItem, FirefoxContainer } from '../types/opendial';

import { DialActions } from './dials/DialActions';
import { StandardDialCard } from './dials/StandardDialCard';
import { CompactDialCard } from './dials/CompactDialCard';
import { LiveDialCard } from './dials/LiveDialCard';
import { WeatherDialCard } from './dials/WeatherDialCard';
import { MultiPageDialCard } from './dials/MultiPageDialCard';
import { FolderDialCard } from './dials/FolderDialCard';

export { CONTAINER_COLORS };

export type { DialItem, FirefoxContainer };

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
  const [iframeRefreshKey, setIframeRefreshKey] = useState(0);
  const containerInfo = dial.container ? CONTAINER_COLORS[dial.container] : null;

  // Live dial auto-refresh interval
  useEffect(() => {
    if (dial.type === 'live' && dial.liveRefreshInterval && dial.liveRefreshInterval > 0) {
      const timer = setInterval(() => {
        setIframeRefreshKey((k) => k + 1);
      }, dial.liveRefreshInterval * 1000);
      return () => clearInterval(timer);
    }
  }, [dial.type, dial.liveRefreshInterval]);

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

  // Compact view layout — only for standard dials
  if (viewDensity === 'compact' && dial.type === 'standard') {
    return (
      <div
        className={`group relative ${colSpanClass} ${rowSpanClass} ${
          dial.rowSpan === 2 ? 'min-h-[280px]' : 'min-h-[44px]'
        }`}
      >
        <CompactDialCard
          dial={dial}
          index={index}
          showHotkeys={showHotkeys}
          containerInfo={containerInfo}
          onRecordClick={onRecordClick}
        />
        <DialActions
          dial={dial}
          showHotkeys={showHotkeys}
          index={index}
          isProductivityMode={isProductivityMode}
          onEdit={onEdit}
          onDelete={onDelete}
          onToggleSpan={onToggleSpan}
          onOpenFolder={onOpenFolder}
          onRefreshLive={() => setIframeRefreshKey((k) => k + 1)}
        />
      </div>
    );
  }

  // Dispatch to the appropriate specialized component based on dial type
  const cardContent = (() => {
    switch (dial.type) {
      case 'folder':
        return (
          <FolderDialCard
            dial={dial}
            isProductivityMode={isProductivityMode}
            onEdit={onEdit}
            onRecordClick={onRecordClick}
            onOpenFolder={onOpenFolder!}
          />
        );
      case 'live':
        return (
          <LiveDialCard
            dial={dial}
            isProductivityMode={isProductivityMode}
            onEdit={onEdit}
            onRecordClick={onRecordClick}
            onRefresh={() => setIframeRefreshKey((k) => k + 1)}
            iframeRefreshKey={iframeRefreshKey}
          />
        );
      case 'multipage':
        return (
          <MultiPageDialCard
            dial={dial}
            isProductivityMode={isProductivityMode}
            onEdit={onEdit}
            onRecordClick={onRecordClick}
            onOpenAllLinks={() => {
              if (dial.multiLinks && dial.multiLinks.length > 0) {
                dial.multiLinks.forEach((link) => {
                  window.open(link.url, '_blank', 'noopener,noreferrer');
                });
              }
            }}
          />
        );
      case 'weather':
        return (
          <WeatherDialCard
            dial={dial}
            isProductivityMode={isProductivityMode}
            onEdit={onEdit}
            onRecordClick={onRecordClick}
          />
        );
      case 'standard':
      default:
        return (
          <StandardDialCard
            dial={dial}
            index={index}
            showHotkeys={showHotkeys}
            viewDensity={viewDensity}
            containerInfo={containerInfo}
            onRecordClick={onRecordClick}
          />
        );
    }
  })();

  return (
    <div
      className={`group relative ${colSpanClass} ${rowSpanClass} ${
        dial.rowSpan === 2
          ? 'min-h-[280px]'
          : viewDensity === 'editorial'
            ? 'min-h-[155px]'
            : 'min-h-[136px]'
      }`}
    >
      {cardContent}
      <DialActions
        dial={dial}
        showHotkeys={showHotkeys}
        index={index}
        isProductivityMode={isProductivityMode}
        onEdit={onEdit}
        onDelete={onDelete}
        onToggleSpan={onToggleSpan}
        onOpenFolder={onOpenFolder}
        onRefreshLive={() => setIframeRefreshKey((k) => k + 1)}
        onOpenAllMultiLinks={() => {
          if (dial.multiLinks && dial.multiLinks.length > 0) {
            dial.multiLinks.forEach((link) => {
              window.open(link.url, '_blank', 'noopener,noreferrer');
            });
          }
        }}
      />
    </div>
  );
};
