export const REVIEW_STATUS = {
  DRAFT: 'draft',
  COMPLETED: 'completed',
} as const;

export type ReviewStatus = typeof REVIEW_STATUS[keyof typeof REVIEW_STATUS];

export type Review = {
  id: string;
  start: number;
  end: number;
  status: ReviewStatus;
  reviewerId: string;
  reviewerName: string;
  createdAt: number;
  completedAt?: number;
};

export const REVIEW_COLOR = {
  DRAFT: 'rgba(250, 204, 21, 0.45)',
  COMPLETED: 'rgba(34, 197, 94, 0.45)',
} as const;
