import { useState, useEffect, useCallback } from 'react';
import { NoteItem } from '../types/opendial';
import { INITIAL_NOTES } from '../data/initialData';
import { loadFromLocal, saveToLocal } from '../services/storage';

export function useNotes() {
  const [notes, setNotes] = useState<NoteItem[]>(() =>
    loadFromLocal<NoteItem[]>('notes', INITIAL_NOTES),
  );

  // Synchronize notes to local storage
  useEffect(() => {
    saveToLocal('notes', notes);
  }, [notes]);

  const addNote = useCallback((text: string) => {
    const newNote: NoteItem = {
      id: `note_${Date.now()}`,
      text,
      isCompleted: false,
      createdAt: Date.now(),
    };
    setNotes((prev) => [newNote, ...prev]);
  }, []);

  const toggleNote = useCallback((id: string) => {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, isCompleted: !n.isCompleted } : n)));
  }, []);

  const deleteNote = useCallback((id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const resetNotes = useCallback(() => {
    setNotes(INITIAL_NOTES);
  }, []);

  return {
    notes,
    setNotes,
    addNote,
    toggleNote,
    deleteNote,
    resetNotes,
  };
}
