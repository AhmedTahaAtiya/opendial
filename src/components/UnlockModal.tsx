import React, { useEffect, useState } from 'react';
import { KeyRound, ShieldCheck, X } from 'lucide-react';

interface UnlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUnlock: (password: string) => void;
}

export const UnlockModal: React.FC<UnlockModalProps> = ({ isOpen, onClose, onUnlock }) => {
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (!isOpen) setPassword('');
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!password) return;
    onUnlock(password);
    setPassword('');
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-900 text-slate-100 shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/50 px-6 py-4">
          <div className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-amber-400" />
            <h2 className="text-base font-bold">Unlock encrypted operations</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white" aria-label="Close unlock dialog">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-6">
          <div className="flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-200">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            <p>Your master password is kept only in memory for this session. It is never saved or included in backups.</p>
          </div>
          <div>
            <label htmlFor="master-password" className="mb-1 block text-xs font-medium text-slate-300">Master password</label>
            <input
              id="master-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              autoFocus
              required
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:ring-2 focus:ring-amber-500"
              placeholder="Enter your master password"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-800 bg-slate-950/50 px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700">Cancel</button>
          <button type="submit" disabled={!password} className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50">Unlock</button>
        </div>
      </form>
    </div>
  );
};
