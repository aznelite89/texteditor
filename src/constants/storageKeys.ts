export const STORAGE_KEYS = {
  CONTENT: 'quiz.editor.content',
  VERSIONS: 'quiz.editor.versions',
} as const;

export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];
