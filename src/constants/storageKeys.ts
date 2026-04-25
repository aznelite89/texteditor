export const STORAGE_KEYS = {
  CONTENT: 'quiz.editor.content',
  VERSIONS: 'quiz.editor.versions',
  REVIEWS: 'quiz.editor.reviews',
  COMMENTS: 'quiz.editor.comments',
} as const;

export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];
