import React from 'react';
import { Layers, ExternalLink } from 'lucide-react';
import { DialItem } from '../../types/opendial';

interface MultiPageDialCardProps {
  dial: DialItem;
  isProductivityMode: boolean;
  onEdit: (dial: DialItem) => void;
  onRecordClick: (dialId: string) => void;
  onOpenAllLinks: () => void;
}

export const MultiPageDialCard: React.FC<MultiPageDialCardProps> = ({
  dial,
  isProductivityMode,
  onEdit: _onEdit,
  onRecordClick,
  onOpenAllLinks,
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
      className={`group relative flex flex-col justify-between rounded-xl border border-[#202838] hover:border-amber-500/50 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 focus:outline-none bg-[#121620] hover:bg-[#161c28] shadow-sm hover:shadow-lg transition-all duration-150 cursor-pointer min-h-[136px] p-3.5 pb-3 flex flex-col justify-between h-full`}
    >
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#18202d] border border-[#2b374c] flex items-center justify-center text-amber-400">
              <Layers className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="font-display text-sm font-bold text-slate-100 truncate">
                {dial.title}
              </div>
              <div className="font-mono text-[10px] text-slate-400">
                {dial.multiLinks?.length || 0} target links
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenAllLinks();
            }}
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
  );
};
