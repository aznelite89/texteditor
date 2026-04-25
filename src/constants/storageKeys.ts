export const STORAGE_KEY_CONTENT = 'quiz.editor.content' as const;
export const STORAGE_KEY_VERSIONS = 'quiz.editor.versions' as const;
export const STORAGE_KEY_REVIEWS = 'quiz.editor.reviews' as const;
export const STORAGE_KEY_COMMENTS = 'quiz.editor.comments' as const;

export const STORAGE_KEYS = {
  CONTENT: STORAGE_KEY_CONTENT,
  VERSIONS: STORAGE_KEY_VERSIONS,
  REVIEWS: STORAGE_KEY_REVIEWS,
  COMMENTS: STORAGE_KEY_COMMENTS,
} as const;

export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];
