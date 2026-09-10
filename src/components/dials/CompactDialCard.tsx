import React from 'react';
import { ExternalLink } from 'lucide-react';
import { DialItem } from '../../types/opendial';

interface CompactDialCardProps {
  dial: DialItem;
  index?: number;
  showHotkeys?: boolean;
  containerInfo: { name: string; bg: string; border: string } | null;
  onRecordClick: (dialId: string) => void;
}

export const CompactDialCard: React.FC<CompactDialCardProps> = ({
  dial,
  index,
  showHotkeys = true,
  containerInfo,
  onRecordClick,
}) => {
  const isNumbered = showHotkeys && index !== undefined && index < 9;

  // Domain name extractor
  const domain = (() => {
    try {
      return new URL(dial.url).hostname.replace(/^www\./, '');
    } catch {
      return dial.url;
    }
  })();

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
      className={`group relative flex items-center justify-between px-3 py-2 rounded-lg border border-[#202838] hover:border-amber-500/50 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 focus:outline-none bg-[#121620] hover:bg-[#161c28] transition-all cursor-pointer shadow-sm overflow-hidden z-0`}
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
        <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-amber-400 transition-colors opacity-0 group-hover:opacity-100" />
      </div>
    </div>
  );
};
