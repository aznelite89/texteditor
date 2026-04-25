export const APP_EVENT = {
  FORMAT_CHANGE: 'quiz:format-change',
} as const;

export type AppEvent = typeof APP_EVENT[keyof typeof APP_EVENT];
