import React from 'react';
import { Zap } from 'lucide-react';
import { DialItem } from '../../types/opendial';

interface DialMetadataProps {
  dial: DialItem;
  containerInfo: { name: string; bg: string } | null;
}

export const DialMetadata: React.FC<DialMetadataProps> = ({ dial, containerInfo }) => {
  const hasTags = dial.tags && dial.tags.length > 0;
  const hasAutomatedAction = dial.automatedAction?.enabled;
  const hasMetadata = containerInfo?.name || hasTags || hasAutomatedAction;

  if (!hasMetadata) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-1.5 pt-2 mt-auto border-t border-[#1a2130]">
      {/* Tags & Container pill */}
      <div className="flex flex-wrap items-center gap-1 min-w-0 flex-1">
        {containerInfo?.name && (
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#18202d] text-slate-300 border border-[#283446] flex items-center gap-1 shrink-0">
            <span className={`w-1 h-1 rounded-full ${containerInfo.bg}`} />
            {containerInfo.name}
          </span>
        )}
        {hasTags &&
          dial.tags!.map((tag) => (
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
        {hasAutomatedAction && (
          <span title="Automated Action attached (auto-fill or click)" className="text-amber-400">
            <Zap className="w-3 h-3" />
          </span>
        )}
      </div>
    </div>
  );
};
