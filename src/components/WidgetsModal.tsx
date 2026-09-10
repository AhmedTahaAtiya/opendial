import React, { useState, useEffect } from 'react';
import {
  X,
  Clock,
  CheckSquare,
  History,
  Play,
  Pause,
  RotateCcw,
  Flag,
  Plus,
  Trash2,
  ExternalLink,
  Bell,
} from 'lucide-react';
import { NoteItem, RecentTabItem } from '../types/opendial';
import { playAlarmChime } from '../services/audio';

interface WidgetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: NoteItem[];
  onAddNote: (text: string) => void;
  onToggleNote: (id: string) => void;
  onDeleteNote: (id: string) => void;
}

export const WidgetsModal: React.FC<WidgetsModalProps> = ({
  isOpen,
  onClose,
  notes,
  onAddNote,
  onToggleNote,
  onDeleteNote,
}) => {
  const [activeTab, setActiveTab] = useState<'timer' | 'notes' | 'recents'>('timer');

  const [timerMode, setTimerMode] = useState<'countdown' | 'stopwatch'>('countdown');

  // Countdown state
  const [countdownSeconds, setCountdownSeconds] = useState(0);
  const [initialCountdown, setInitialCountdown] = useState(0);
  const [isCountdownRunning, setIsCountdownRunning] = useState(false);
  const [customMinutesInput, setCustomMinutesInput] = useState('');

  // Stopwatch state
  const [stopwatchMs, setStopwatchMs] = useState(0);
  const [isStopwatchRunning, setIsStopwatchRunning] = useState(false);
  const [laps, setLaps] = useState<number[]>([]);

  // Notes state
  const [newNoteText, setNewNoteText] = useState('');

  // Recently Closed Tabs (Clean state)
  const [recentTabs, _setRecentTabs] = useState<RecentTabItem[]>([]);

  // Countdown interval
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isCountdownRunning && countdownSeconds > 0) {
      interval = setInterval(() => {
        setCountdownSeconds((prev) => {
          if (prev <= 1) {
            playAlarmChime();
            setIsCountdownRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isCountdownRunning, countdownSeconds]);

  // Stopwatch interval
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isStopwatchRunning) {
      const startTime = Date.now() - stopwatchMs;
      interval = setInterval(() => {
        setStopwatchMs(Date.now() - startTime);
      }, 50);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isStopwatchRunning, stopwatchMs]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Format helpers
  const formatCountdown = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatStopwatch = (ms: number) => {
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    const hundredths = Math.floor((ms % 1000) / 10);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${hundredths.toString().padStart(2, '0')}`;
  };

  const handleSetPreset = (minutes: number) => {
    setIsCountdownRunning(false);
    setInitialCountdown(minutes * 60);
    setCountdownSeconds(minutes * 60);
  };

  const handleAddLap = () => {
    setLaps([stopwatchMs, ...laps]);
  };

  const handleResetStopwatch = () => {
    setIsStopwatchRunning(false);
    setStopwatchMs(0);
    setLaps([]);
  };

  const handleNoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;
    onAddNote(newNoteText.trim());
    setNewNoteText('');
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
    >
      <div
        className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-slate-100"
        id="widgets-modal-container"
      >
        {/* Header Tabs */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('timer')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'timer'
                  ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Timers</span>
            </button>

            <button
              onClick={() => setActiveTab('notes')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'notes'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Notes & Todos</span>
            </button>

            <button
              onClick={() => setActiveTab('recents')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'recents'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Recent Tabs</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Timers */}
        {activeTab === 'timer' && (
          <div className="p-6">
            {/* Mode Switcher */}
            <div className="flex items-center justify-center gap-2 mb-6">
              <button
                onClick={() => setTimerMode('countdown')}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                  timerMode === 'countdown'
                    ? 'bg-sky-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                Countdown / Pomodoro
              </button>
              <button
                onClick={() => setTimerMode('stopwatch')}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                  timerMode === 'stopwatch'
                    ? 'bg-sky-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                Precision Stopwatch
              </button>
            </div>

            {timerMode === 'countdown' ? (
              <div className="text-center space-y-5">
                {/* Big Clock Display */}
                <div className="text-6xl font-black tracking-tight font-mono text-sky-400">
                  {formatCountdown(countdownSeconds)}
                </div>

                {/* Custom Duration Setter */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const mins = parseInt(customMinutesInput, 10);
                    if (!isNaN(mins) && mins > 0) {
                      handleSetPreset(mins);
                      setCustomMinutesInput('');
                    }
                  }}
                  className="flex items-center justify-center gap-2"
                >
                  <input
                    type="number"
                    min="1"
                    max="720"
                    value={customMinutesInput}
                    onChange={(e) => setCustomMinutesInput(e.target.value)}
                    placeholder="Enter minutes..."
                    className="w-32 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-center text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-sky-400 transition-colors"
                  >
                    Set Duration
                  </button>
                </form>

                {/* Controls */}
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => setIsCountdownRunning(!isCountdownRunning)}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-bold shadow-lg shadow-sky-600/30 transition-all"
                  >
                    {isCountdownRunning ? (
                      <>
                        <Pause className="w-4 h-4" />
                        <span>Pause</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" />
                        <span>Start</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      setIsCountdownRunning(false);
                      setCountdownSeconds(initialCountdown);
                    }}
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                    title="Reset Countdown"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>

                  <button
                    onClick={playAlarmChime}
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 transition-colors"
                    title="Test Pleasant Synthesizer Chime"
                  >
                    <Bell className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-5">
                <div className="text-5xl font-black tracking-tight font-mono text-emerald-400">
                  {formatStopwatch(stopwatchMs)}
                </div>

                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => setIsStopwatchRunning(!isStopwatchRunning)}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-lg shadow-emerald-600/30 transition-all"
                  >
                    {isStopwatchRunning ? (
                      <>
                        <Pause className="w-4 h-4" />
                        <span>Pause</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" />
                        <span>Start</span>
                      </>
                    )}
                  </button>

                  {isStopwatchRunning && (
                    <button
                      onClick={handleAddLap}
                      className="flex items-center gap-1 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
                    >
                      <Flag className="w-3.5 h-3.5 text-amber-400" />
                      <span>Lap</span>
                    </button>
                  )}

                  <button
                    onClick={handleResetStopwatch}
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                    title="Reset Stopwatch"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>

                {/* Laps List */}
                {laps.length > 0 && (
                  <div className="max-h-36 overflow-y-auto border-t border-slate-800 pt-3 space-y-1">
                    {laps.map((lap, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between text-xs px-3 py-1 rounded bg-slate-800/40 text-slate-300"
                      >
                        <span className="text-slate-500">Lap {laps.length - i}</span>
                        <span className="font-mono text-emerald-400">{formatStopwatch(lap)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Notes & tasks */}
        {activeTab === 'notes' && (
          <div className="p-6 space-y-4">
            <form onSubmit={handleNoteSubmit} className="flex gap-2">
              <input
                type="text"
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                placeholder="Add a quick note or task..."
                className="flex-1 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="submit"
                className="flex items-center gap-1 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </form>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {notes.map((note) => (
                <div
                  key={note.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50 hover:bg-slate-800 transition-colors group"
                >
                  <label className="flex items-center gap-2.5 cursor-pointer flex-1 overflow-hidden">
                    <input
                      type="checkbox"
                      checked={note.isCompleted}
                      onChange={() => onToggleNote(note.id)}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 bg-slate-900 border-slate-700"
                    />
                    <span
                      className={`text-xs truncate ${
                        note.isCompleted ? 'line-through text-slate-500' : 'text-slate-200'
                      }`}
                    >
                      {note.text}
                    </span>
                  </label>

                  <button
                    onClick={() => onDeleteNote(note.id)}
                    className="p-1 text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              {notes.length === 0 && (
                <div className="text-center py-8 text-xs text-slate-500">
                  No notes or tasks yet. Write your thoughts above!
                </div>
              )}
            </div>
          </div>
        )}

        {/* Recent tabs */}
        {activeTab === 'recents' && (
          <div className="p-6 space-y-3">
            <div className="text-xs text-slate-400">Recently closed tabs history:</div>

            {recentTabs.length === 0 ? (
              <div className="text-center py-10 text-xs text-slate-500">
                No recently closed tabs recorded. Active session tabs will appear here.
              </div>
            ) : (
              <div className="space-y-2">
                {recentTabs.map((tab) => (
                  <div
                    key={tab.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-700/50 hover:bg-slate-800 transition-colors"
                  >
                    <div className="overflow-hidden pr-2">
                      <div className="text-xs font-semibold text-slate-200 truncate">
                        {tab.title}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate">{tab.url}</div>
                    </div>

                    <a
                      href={tab.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-600/30 hover:bg-sky-600/50 text-sky-300 text-xs font-medium transition-colors"
                    >
                      <span>Reopen</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
