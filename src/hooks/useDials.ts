import { useState, useEffect, useCallback } from 'react';
import { DialItem } from '../types/opendial';
import { INITIAL_DIALS } from '../data/initialData';
import { loadFromLocal, saveToLocal } from '../services/storage';

export function useDials() {
  const [dials, setDials] = useState<DialItem[]>(() =>
    loadFromLocal<DialItem[]>('dials', INITIAL_DIALS)
  );

  // Synchronize dials to local storage
  useEffect(() => {
    saveToLocal('dials', dials);
  }, [dials]);

  const saveDial = useCallback((dial: DialItem) => {
    setDials((prev) => {
      const exists = prev.some((d) => d.id === dial.id);
      return exists ? prev.map((d) => (d.id === dial.id ? dial : d)) : [dial, ...prev];
    });
  }, []);

  const deleteDial = useCallback((dialId: string) => {
    setDials((prev) => prev.filter((d) => d.id !== dialId));
  }, []);

  const toggleSpan = useCallback((dialId: string) => {
    setDials((prev) =>
      prev.map((d) => {
        if (d.id === dialId) {
          const newSpan = d.colSpan === 2 ? 1 : 2;
          return { ...d, colSpan: newSpan as 1 | 2 };
        }
        return d;
      })
    );
  }, []);

  const recordClick = useCallback((dialId: string) => {
    setDials((prev) =>
      prev.map((d) =>
        d.id === dialId ? { ...d, clicksCount: (d.clicksCount || 0) + 1 } : d
      )
    );
  }, []);

  const appendDials = useCallback((imported: DialItem[]) => {
    setDials((prev) => [...imported, ...prev]);
  }, []);

  const orphanFolderDials = useCallback((folderId: string) => {
    setDials((prev) =>
      prev.map((d) => (d.folderId === folderId ? { ...d, folderId: null } : d))
    );
  }, []);

  const resetDials = useCallback(() => {
    setDials(INITIAL_DIALS);
  }, []);

  return {
    dials,
    setDials,
    saveDial,
    deleteDial,
    toggleSpan,
    recordClick,
    appendDials,
    orphanFolderDials,
    resetDials,
  };
}
