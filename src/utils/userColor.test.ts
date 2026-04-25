import { describe, expect, it } from 'vitest';
import { PEER_COLORS } from '../constants/collab';
import { colorForUser } from './userColor';

describe('colorForUser — Requirement 6: peer color derivation', () => {
  it('always returns a color from the PEER_COLORS palette', () => {
    for (const id of ['a', 'abc', 'longer-id-abc-123', '🦊']) {
      expect(PEER_COLORS).toContain(colorForUser(id));
    }
  });

  it('returns the same color for the same user id (stable hash)', () => {
    expect(colorForUser('user-1')).toBe(colorForUser('user-1'));
    expect(colorForUser('user-2')).toBe(colorForUser('user-2'));
  });

  it('typically distributes different users across the palette', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 50; i++) {
      seen.add(colorForUser(`user-${i}`));
    }
    expect(seen.size).toBeGreaterThan(1);
  });
});
