export const STORAGE_KEYS = {
  CONTENT: 'quiz.editor.content',
  VERSIONS: 'quiz.editor.versions',
  REVIEWS: 'quiz.editor.reviews',
} as const;

export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];
