import { useCallback } from 'react';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { useLocalStorage } from './useLocalStorage';

export type Version = {
  id: string;
  name: string;
  content: string;
  createdAt: number;
};

function makeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function useVersions() {
  const [versions, setVersions] = useLocalStorage<Version[]>(
    STORAGE_KEYS.VERSIONS,
    [],
  );

  const saveVersion = useCallback(
    (name: string, content: string) => {
      const entry: Version = {
        id: makeId(),
        name: name.trim() || 'Untitled',
        content,
        createdAt: Date.now(),
      };
      setVersions((prev) => [entry, ...prev]);
    },
    [setVersions],
  );

  const deleteVersion = useCallback(
    (id: string) => {
      setVersions((prev) => prev.filter((v) => v.id !== id));
    },
    [setVersions],
  );

  const getVersion = useCallback(
    (id: string) => versions.find((v) => v.id === id),
    [versions],
  );

  return { versions, saveVersion, deleteVersion, getVersion };
}
