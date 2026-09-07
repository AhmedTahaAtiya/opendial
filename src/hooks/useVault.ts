import { useState, useEffect, useCallback } from 'react';

export function useVault() {
  // The master password is deliberately session-only and is never persisted.
  const [masterPassword, setMasterPassword] = useState('');

  // Remove any legacy persisted master password left by earlier releases.
  useEffect(() => {
    localStorage.removeItem(['opendial', 'pwd', 'cache'].join('_'));
  }, []);

  const unlock = useCallback((password: string) => {
    setMasterPassword(password);
  }, []);

  const lock = useCallback(() => {
    setMasterPassword('');
  }, []);

  const resetVault = useCallback(() => {
    setMasterPassword('');
  }, []);

  return {
    masterPassword,
    isUnlocked: Boolean(masterPassword),
    unlock,
    lock,
    resetVault,
  };
}
