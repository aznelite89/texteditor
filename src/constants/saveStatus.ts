export const SAVE_STATUS = {
  IDLE: 'idle',
  SAVED: 'saved',
  ERROR: 'error',
} as const;

export type SaveStatus = typeof SAVE_STATUS[keyof typeof SAVE_STATUS];
