export type Reply = {
  id: string;
  body: string;
  authorId: string;
  authorName: string;
  authorColor: string;
  createdAt: number;
};

export type Comment = {
  id: string;
  start: number;
  end: number;
  body: string;
  authorId: string;
  authorName: string;
  authorColor: string;
  createdAt: number;
  resolved: boolean;
  resolvedAt?: number;
  replies: Reply[];
};

export const COMMENT_HIGHLIGHT_COLOR = {
  ACTIVE: 'rgba(59, 130, 246, 0.32)',
  RESOLVED: 'rgba(148, 163, 184, 0.20)',
} as const;
