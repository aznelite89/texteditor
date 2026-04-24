import { useCallback, useEffect, useRef, useState } from 'react';
import { readJSON, writeJSON } from '../utils/storage';

export function useLocalStorage<T>(
  key: string,
  initial: T,
): [T, (next: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => readJSON<T>(key, initial));

  const latest = useRef(value);
  latest.current = value;

  useEffect(() => {
    writeJSON(key, value);
  }, [key, value]);

  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) =>
        typeof next === 'function' ? (next as (p: T) => T)(prev) : next,
      );
    },
    [],
  );

  return [value, set];
}
