import React, { useEffect } from 'react';
import { Plus, FolderPlus, ArrowLeft, Filter, X, ChevronRight, Trash2 } from 'lucide-react';
import { DialItem, FolderItem } from '../types/opendial';
import { DialCard } from './DialCard';

interface DialGridProps {
  dials: DialItem[];
  folders: FolderItem[];
  activeFolderId: string | null;
  activeTagFilter: string | null;
  gridColumns: number;
  viewDensity?: 'station' | 'compact' | 'editorial';
  showKeyShortcuts?: boolean;
  isProductivityMode: boolean;
  onSelectFolder: (folderId: string | null) => void;
  onSelectTag: (tag: string | null) => void;
  onAddDial: (folderId?: string | null) => void;
  onAddFolder: () => void;
  onDeleteFolder: (folderId: string) => void;
  onEditDial: (dial: DialItem) => void;
  onDeleteDial: (dialId: string) => void;
  onToggleSpan: (dialId: string) => void;
  onRecordClick: (dialId: string) => void;
}

export const DialGrid: React.FC<DialGridProps> = ({
  dials,
  folders,
  activeFolderId,
  activeTagFilter,
  gridColumns,
  viewDensity = 'station',
  showKeyShortcuts = true,
  isProductivityMode,
  onSelectFolder,
  onSelectTag,
  onAddDial,
  onAddFolder,
  onDeleteFolder,
  onEditDial,
  onDeleteDial,
  onToggleSpan,
  onRecordClick,
}) => {
  // Collect all unique tags for the filter bar
  const allTags = Array.from(new Set(dials.flatMap((d) => d.tags || []).filter(Boolean))).sort();

  // Active folder details if any
  const currentFolder = activeFolderId ? folders.find((f) => f.id === activeFolderId) : null;

  // Filter dials based on active folder and active tag
  const filteredDials = dials.filter((dial) => {
    // Folder match
    if (activeFolderId) {
      if (dial.folderId !== activeFolderId) return false;
    } else {
      // In root view, only show dials that don't belong to a folder
      if (dial.folderId) return false;
    }

    // Tag filter match
    if (activeTagFilter) {
      if (!dial.tags || !dial.tags.includes(activeTagFilter)) {
        return false;
      }
    }

    return true;
  });

  // Hotkey navigation: Pressing '1' through '9' launches the corresponding dial
  useEffect(() => {
    if (!showKeyShortcuts) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if modifier keys are pressed (e.g. Cmd+1 or Ctrl+1 to switch tabs)
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      // Ignore if typing inside input, textarea or contenteditable
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (
        activeTag === 'input' ||
        activeTag === 'textarea' ||
        (document.activeElement as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      // Ignore if any modal is active
      if (document.querySelector('.fixed.z-50, .fixed.z-\\[60\\]')) {
        return;
      }

      const keyNum = parseInt(e.key, 10);
      if (!isNaN(keyNum) && keyNum >= 1 && keyNum <= 9) {
        const targetDial = filteredDials[keyNum - 1];
        if (targetDial && targetDial.url && targetDial.type !== 'live') {
          onRecordClick(targetDial.id);
          window.open(targetDial.url, '_blank', 'noopener,noreferrer');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredDials, onRecordClick, showKeyShortcuts]);

  // Folder cards to display when in root view
  const rootFolders = !activeFolderId ? folders : [];

  // Dynamic grid column class mapping
  const gridColClass =
    viewDensity === 'compact'
      ? gridColumns <= 4
        ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
        : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
      : viewDensity === 'editorial'
        ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
        : gridColumns === 4
          ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
          : gridColumns === 6
            ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6'
            : gridColumns === 7
              ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7'
              : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5'; // default 5

  return (
    <div className="w-full max-w-7xl mx-auto px-4 pb-20" id="opendial-grid-section">
      {/* Folder Breadcrumb & Tag Filter Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          {activeFolderId && (
            <button
              onClick={() => onSelectFolder(null)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#141822] hover:bg-[#1a202c] text-slate-200 text-xs font-mono font-medium border border-[#222a3a] transition-colors"
              title="Return to Root Dashboard"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>OVERVIEW</span>
            </button>
          )}

          <div className="flex items-center text-xs font-mono tracking-wide text-slate-300">
            <span
              onClick={() => onSelectFolder(null)}
              className={`cursor-pointer transition-colors ${
                activeFolderId ? 'text-slate-500 hover:text-slate-300' : 'text-amber-400 font-bold'
              }`}
            >
              SPEED_DIAL
            </span>
            {currentFolder && (
              <>
                <ChevronRight className="w-3.5 h-3.5 mx-1 text-slate-600" />
                <span className="text-white font-bold">{currentFolder.title.toUpperCase()}</span>
                <button
                  type="button"
                  id="btn-delete-active-folder"
                  onClick={() => onDeleteFolder(currentFolder.id)}
                  className="ml-3 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-mono font-medium transition-colors cursor-pointer"
                  title="Delete this folder (dials will be moved to root)"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>DELETE FOLDER</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Tag Filters (Horizontally scrollable with hidden scrollbars) */}
        {allTags.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 max-w-full flex-nowrap scroll-smooth">
            <div className="flex items-center gap-1 text-[10px] font-mono text-slate-500 mr-1 shrink-0">
              <Filter className="w-3 h-3 text-slate-600" />
              <span>TAG:</span>
            </div>

            {activeTagFilter && (
              <button
                onClick={() => onSelectTag(null)}
                className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/40 hover:bg-rose-500/25 transition-colors shrink-0 whitespace-nowrap"
              >
                <span>CLEAR</span>
                <X className="w-3 h-3" />
              </button>
            )}

            {allTags.map((tag) => {
              const isSelected = activeTagFilter === tag;
              return (
                <button
                  key={tag}
                  onClick={() => onSelectTag(isSelected ? null : tag)}
                  className={`text-[10px] font-mono px-2 py-0.5 rounded transition-all whitespace-nowrap shrink-0 ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                      : 'bg-[#141822] hover:bg-[#1a2130] text-slate-400 hover:text-slate-200 border border-[#202736]'
                  }`}
                >
                  #{tag}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Grid Container */}
      <div className={`grid ${gridColClass} gap-3.5 auto-rows-min`}>
        {/* Render Folder Cards if in root view */}
        {rootFolders.map((folder) => {
          const count = dials.filter((d) => d.folderId === folder.id).length;
          const folderDial: DialItem = {
            id: folder.id,
            title: `${folder.title} (${count})`,
            url: '',
            type: 'folder',
            folderId: folder.id,
            bgColor: folder.color
              ? `linear-gradient(135deg, ${folder.color}15, #10151f)`
              : undefined,
            createdAt: folder.createdAt,
          };
          return (
            <DialCard
              key={folder.id}
              dial={folderDial}
              viewDensity={viewDensity}
              showHotkeys={false}
              isProductivityMode={isProductivityMode}
              onOpenFolder={(fId) => onSelectFolder(fId)}
              onEdit={() => {}}
              onDelete={() => onDeleteFolder(folder.id)}
              onToggleSpan={() => {}}
              onRecordClick={() => {}}
            />
          );
        })}

        {/* Render Dials */}
        {filteredDials.map((dial, idx) => (
          <DialCard
            key={dial.id}
            dial={dial}
            index={idx}
            showHotkeys={showKeyShortcuts}
            viewDensity={viewDensity}
            isProductivityMode={isProductivityMode}
            onOpenFolder={onSelectFolder}
            onEdit={onEditDial}
            onDelete={onDeleteDial}
            onToggleSpan={onToggleSpan}
            onRecordClick={onRecordClick}
          />
        ))}

        {/* Quick Add Dial Slot */}
        <button
          type="button"
          id="btn-grid-add-dial"
          onClick={() => onAddDial(activeFolderId)}
          className={`group relative flex flex-col items-center justify-center rounded-xl border border-dashed border-[#263144] hover:border-amber-500/60 bg-[#0e121a]/40 hover:bg-[#131924]/60 text-slate-400 hover:text-amber-300 transition-all duration-150 cursor-pointer ${
            viewDensity === 'compact' ? 'min-h-[44px] py-2 px-3 flex-row gap-2' : 'min-h-[125px]'
          }`}
        >
          <div
            className={`rounded-lg bg-[#141a26] group-hover:bg-amber-500/20 border border-[#222a3b] group-hover:border-amber-500/40 flex items-center justify-center text-slate-400 group-hover:text-amber-400 transition-colors ${
              viewDensity === 'compact' ? 'w-5 h-5' : 'w-8 h-8 mb-1.5'
            }`}
          >
            <Plus className="w-4 h-4" />
          </div>
          <span className="font-display text-xs font-semibold">Add Dial</span>
        </button>

        {/* Quick Add Folder Slot (Only in root view) */}
        {!activeFolderId && (
          <button
            type="button"
            id="btn-grid-add-folder"
            onClick={onAddFolder}
            className={`group relative flex flex-col items-center justify-center rounded-xl border border-dashed border-[#263144] hover:border-amber-500/60 bg-[#0e121a]/40 hover:bg-[#131924]/60 text-slate-400 hover:text-amber-300 transition-all duration-150 cursor-pointer ${
              viewDensity === 'compact' ? 'min-h-[44px] py-2 px-3 flex-row gap-2' : 'min-h-[125px]'
            }`}
          >
            <div
              className={`rounded-lg bg-[#141a26] group-hover:bg-amber-500/20 border border-[#222a3b] group-hover:border-amber-500/40 flex items-center justify-center text-slate-400 group-hover:text-amber-400 transition-colors ${
                viewDensity === 'compact' ? 'w-5 h-5' : 'w-8 h-8 mb-1.5'
              }`}
            >
              <FolderPlus className="w-4 h-4" />
            </div>
            <span className="font-display text-xs font-semibold">New Folder</span>
          </button>
        )}
      </div>

      {filteredDials.length === 0 && rootFolders.length === 0 && activeTagFilter && (
        <div className="text-center py-16 text-slate-500 font-mono">
          <p className="text-xs">NO DIALS MATCH CURRENT FILTER</p>
          <button
            onClick={() => onSelectTag(null)}
            className="mt-2 text-xs text-amber-400 hover:underline"
          >
            Reset filter
          </button>
        </div>
      )}
    </div>
  );
};
