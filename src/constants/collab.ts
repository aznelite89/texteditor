export const COLLAB_CHANNEL = 'quiz.collab.v1' as const;

export const COLLAB_MESSAGE = {
  JOIN: 'join',
  LEAVE: 'leave',
  PING: 'ping',
  CARET: 'caret',
  CONTENT: 'content',
  REVIEWS: 'reviews',
} as const;

export type CollabMessageType = typeof COLLAB_MESSAGE[keyof typeof COLLAB_MESSAGE];

export const COLLAB_TIMING = {
  PING_INTERVAL_MS: 5000,
  PEER_TIMEOUT_MS: 12000,
} as const;

export const PEER_COLORS = [
  '#8b5cf6',
  '#10b981',
  '#ef4444',
  '#f59e0b',
  '#3b82f6',
  '#ec4899',
  '#14b8a6',
  '#f97316',
] as const;

export const SESSION_KEYS = {
  USER_ID: 'quiz.collab.userId',
  USER_NAME: 'quiz.collab.userName',
} as const;

export const PEER_NAMES = [
  'Alex',
  'Morgan',
  'Sam',
  'Jordan',
  'Riley',
  'Casey',
  'Taylor',
  'Quinn',
  'Avery',
  'Drew',
] as const;
