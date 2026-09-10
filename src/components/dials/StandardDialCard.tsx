import React from 'react';
import { ExternalLink } from 'lucide-react';
import { DialItem } from '../../types/opendial';
import { DialMetadata } from './DialMetadata';

interface StandardDialCardProps {
  dial: DialItem;
  index?: number;
  showHotkeys?: boolean;
  viewDensity?: 'station' | 'compact' | 'editorial';
  containerInfo: { name: string; bg: string; border: string } | null;
  onRecordClick: (dialId: string) => void;
}

export const StandardDialCard: React.FC<StandardDialCardProps> = ({
  dial,
  index,
  showHotkeys = true,
  viewDensity = 'station',
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
      className={`group relative flex flex-col justify-between rounded-xl border border-[#202838] hover:border-amber-500/50 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 focus:outline-none bg-[#121620] hover:bg-[#161c28] shadow-sm hover:shadow-lg transition-all duration-150 cursor-pointer ${
        viewDensity === 'editorial' ? 'min-h-[155px]' : 'min-h-[136px]'
      } p-3.5 pb-3 flex flex-col justify-between h-full`}
      style={{
        background: dial.bgColor || undefined,
        color: dial.textColor || undefined,
      }}
    >
      {/* Top Banner / Firefox Container */}
      {containerInfo && containerInfo.name && (
        <div
          className={`absolute top-0 left-0 right-0 h-0.5 ${containerInfo.bg}`}
          title={`Firefox Container: ${containerInfo.name}`}
        />
      )}

      {/* Thumbnail + Title + Domain */}
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

      {/* Tags, Container badge, and Indicators */}
      <DialMetadata
        dial={dial}
        containerInfo={containerInfo as { name: string; bg: string } | null}
      />

      {/* External link indicator */}
      <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-amber-400" />
    </div>
  );
};
