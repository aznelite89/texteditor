import { useCallback, useEffect, useRef, useState } from 'react';
import { SAVE_STATUS, type SaveStatus } from '../constants/saveStatus';
import { readJSON, writeJSON } from '../utils/storage';

type SaveSnapshot = { status: SaveStatus; at: number };

export function useLocalStorage<T>(
  key: string,
  initial: T,
): [T, (next: T | ((prev: T) => T)) => void, SaveStatus, number] {
  const [value, setValue] = useState<T>(() => readJSON<T>(key, initial));
  const [save, setSave] = useState<SaveSnapshot>({ status: SAVE_STATUS.IDLE, at: 0 });
  const skipInitialWrite = useRef(true);

  useEffect(() => {
    // Don't write on the initial hydrate pass — readJSON already gave us the
    // stored value (or the fallback). Persisting the fallback would flip the
    // UI to "saved" before the user has done anything.
    if (skipInitialWrite.current) {
      skipInitialWrite.current = false;
      return;
    }
    const ok = writeJSON(key, value);
    // Always set a fresh `at` so consumers can detect each save event even
    // when status doesn't change (e.g., consecutive successful writes).
    setSave({ status: ok ? SAVE_STATUS.SAVED : SAVE_STATUS.ERROR, at: Date.now() });
  }, [key, value]);

  const set = useCallback((next: T | ((prev: T) => T)) => {
    setValue((prev) =>
      typeof next === 'function' ? (next as (p: T) => T)(prev) : next,
    );
  }, []);

  return [value, set, save.status, save.at];
}
