import { PEER_NAMES } from '../constants/collab';

export function generateUserId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `u_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
}

export function generateUserName(): string {
  const base = PEER_NAMES[Math.floor(Math.random() * PEER_NAMES.length)];
  const suffix = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, '0');
  return `${base}-${suffix}`;
}
