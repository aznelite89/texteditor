import { PEER_COLORS } from '../constants/collab';

export function colorForUser(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash + userId.charCodeAt(i)) | 0;
  }
  const index = Math.abs(hash) % PEER_COLORS.length;
  return PEER_COLORS[index];
}
