import React, { useState, useEffect, useRef } from 'react';
import {
  Edit2,
  Trash2,
  Maximize2,
  Minimize2,
  RefreshCw,
  Folder,
  MoreVertical,
  ExternalLink,
} from 'lucide-react';
import { DialItem, FirefoxContainer } from '../../types/opendial';

export { CONTAINER_COLORS };
export type { FirefoxContainer };

const CONTAINER_COLORS: Record<FirefoxContainer, { name: string; bg: string; border: string }> = {
  none: { name: '', bg: '', border: '' },
  personal: { name: 'Personal', bg: 'bg-cyan-500', border: 'border-cyan-400/50' },
  work: { name: 'Work', bg: 'bg-amber-500', border: 'border-amber-400/50' },
  banking: { name: 'Banking', bg: 'bg-emerald-500', border: 'border-emerald-400/50' },
  shopping: { name: 'Shopping', bg: 'bg-rose-500', border: 'border-rose-400/50' },
};

interface DialActionsProps {
  dial: DialItem;
  showHotkeys?: boolean;
  index?: number;
  isProductivityMode?: boolean;
  onEdit: (dial: DialItem) => void;
  onDelete: (dialId: string) => void;
  onToggleSpan: (dialId: string) => void;
  onOpenFolder?: (folderId: string) => void;
  onRefreshLive?: () => void;
  onOpenAllMultiLinks?: () => void;
}

export const DialActions: React.FC<DialActionsProps> = ({
  dial,
  showHotkeys = true,
  index,
  isProductivityMode: _isProductivityMode,
  onEdit,
  onDelete,
  onToggleSpan,
  onOpenFolder,
  onRefreshLive,
  onOpenAllMultiLinks,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close context menu on outside click or Escape
  useEffect(() => {
    if (!showMenu) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [showMenu]);

  const isNumbered = showHotkeys && index !== undefined && index < 9;
  void isNumbered;

  return (
    <div
      ref={menuRef}
      className={`dial-actions-menu absolute top-2 right-2 z-50 flex items-center gap-1 transition-opacity ${
        showMenu ? 'opacity-100 pointer-events-auto' : 'opacity-0 group-hover:opacity-100'
      }`}
    >
      {dial.type === 'folder' && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onDelete(dial.id);
          }}
          className="p-1 rounded-md bg-[#0c1018]/90 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-[#232c3d] hover:border-rose-500/40 shadow-sm cursor-pointer transition-colors"
          title="Delete Folder"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}

      <div className="relative">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            setShowMenu(!showMenu);
          }}
          className="p-1 rounded-md bg-[#0c1018]/90 hover:bg-[#1a2232] text-slate-400 hover:text-slate-100 border border-[#232c3d] shadow-sm cursor-pointer"
          title={dial.type === 'folder' ? 'Folder Options' : 'Dial Options'}
        >
          <MoreVertical className="w-3.5 h-3.5" />
        </button>

        {showMenu && (
          <div
            className="absolute right-0 top-full mt-1 w-48 bg-[#121620] border border-[#2e3b52] rounded-xl shadow-2xl backdrop-blur-md py-1 z-50 text-xs text-slate-200 divide-y divide-[#1e2738]"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            {dial.type === 'folder' ? (
              <div className="py-0.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setShowMenu(false);
                    if (dial.folderId && onOpenFolder) {
                      onOpenFolder(dial.folderId);
                    }
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-[#1a2130] text-left cursor-pointer transition-colors"
                >
                  <Folder className="w-3.5 h-3.5 text-amber-400" />
                  <span className="font-medium text-slate-100">Open Drawer</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setShowMenu(false);
                    onDelete(dial.id);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-rose-500/15 text-rose-400 text-left cursor-pointer transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="font-medium">Delete Folder</span>
                </button>
              </div>
            ) : (
              <>
                <div className="py-0.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setShowMenu(false);
                      onEdit(dial);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-[#1a2130] text-left cursor-pointer transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-amber-400" />
                    <span className="font-medium text-slate-100">Edit Dial</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setShowMenu(false);
                      onToggleSpan(dial.id);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-[#1a2130] text-left cursor-pointer transition-colors"
                  >
                    {dial.colSpan === 2 ? (
                      <>
                        <Minimize2 className="w-3.5 h-3.5 text-sky-400" />
                        <span className="font-medium text-slate-100">Shrink Size (1x1)</span>
                      </>
                    ) : (
                      <>
                        <Maximize2 className="w-3.5 h-3.5 text-sky-400" />
                        <span className="font-medium text-slate-100">Expand Size (2x1)</span>
                      </>
                    )}
                  </button>

                  {dial.type === 'live' && onRefreshLive && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setShowMenu(false);
                        onRefreshLive();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-[#1a2130] text-left cursor-pointer transition-colors"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="font-medium text-slate-100">Refresh Live Monitor</span>
                    </button>
                  )}

                  {dial.type === 'multipage' && onOpenAllMultiLinks && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setShowMenu(false);
                        onOpenAllMultiLinks();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-[#1a2130] text-left cursor-pointer transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                      <span className="font-medium text-slate-100">Open All Links</span>
                    </button>
                  )}
                </div>

                <div className="py-0.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setShowMenu(false);
                      onDelete(dial.id);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-rose-500/15 text-rose-400 text-left cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="font-medium">Remove Dial</span>
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
