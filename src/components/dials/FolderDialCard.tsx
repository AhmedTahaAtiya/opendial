import React from 'react';
import { Folder } from 'lucide-react';
import { DialItem } from '../../types/opendial';

interface FolderDialCardProps {
  dial: DialItem;
  isProductivityMode: boolean;
  onEdit: (dial: DialItem) => void;
  onRecordClick: (dialId: string) => void;
  onOpenFolder: (folderId: string) => void;
}

export const FolderDialCard: React.FC<FolderDialCardProps> = ({
  dial,
  isProductivityMode,
  onEdit: _onEdit,
  onRecordClick,
  onOpenFolder,
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

  const handleClick = (_e: React.MouseEvent | React.KeyboardEvent) => {
    onRecordClick(dial.id);
    if (dial.folderId && onOpenFolder) {
      onOpenFolder(dial.folderId);
    }
  };

  return (
    <div
      id={`dial-card-${dial.id}`}
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick(e);
        }
      }}
      className={`group relative flex flex-col items-center justify-center text-center h-full group-hover:scale-[1.01] transition-transform rounded-xl border border-[#202838] hover:border-amber-500/50 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 focus:outline-none bg-[#121620] hover:bg-[#161c28] shadow-sm hover:shadow-lg transition-all duration-150 cursor-pointer p-4`}
    >
      <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-2 shadow-inner">
        <Folder className="w-5 h-5" />
      </div>
      <div className="font-display text-sm font-bold text-slate-100 truncate w-full px-2">
        {dial.title}
      </div>
      <div className="font-mono text-[10px] text-slate-400 mt-0.5">OPEN DRAWER</div>
    </div>
  );
};
