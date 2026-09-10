import React from 'react';
import { RefreshCw, ExternalLink } from 'lucide-react';
import { DialItem } from '../../types/opendial';

interface LiveDialCardProps {
  dial: DialItem;
  isProductivityMode: boolean;
  onEdit: (dial: DialItem) => void;
  onRecordClick: (dialId: string) => void;
  onRefresh: () => void;
  iframeRefreshKey: number;
}

export const LiveDialCard: React.FC<LiveDialCardProps> = ({
  dial,
  isProductivityMode,
  onEdit: _onEdit,
  onRecordClick,
  onRefresh,
  iframeRefreshKey,
}) => {
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
      className={`group relative flex flex-col justify-between rounded-xl border border-[#202838] hover:border-amber-500/50 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 focus:outline-none bg-[#0b0e14] shadow-sm hover:shadow-lg transition-all duration-150 cursor-pointer w-full h-full flex flex-col bg-[#0b0e14]`}
    >
      <div className="p-2 px-3 flex items-center justify-between border-b border-[#202838] bg-[#0e121a] z-10">
        <div className="flex items-center gap-2 truncate">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-mono text-xs font-semibold text-slate-200 truncate">
            {dial.title}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRefresh();
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
  );
};
