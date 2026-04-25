import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SESSION_KEYS } from '../constants/collab';
import { useLocalUser } from './useLocalUser';

describe('useLocalUser — Requirement 6: stable per-tab identity', () => {
  beforeEach(() => {
    Object.values(SESSION_KEYS).forEach((k) => {
      try {
        window.sessionStorage.removeItem(k);
      } catch {
        // ignore
      }
    });
  });

  afterEach(() => {
    Object.values(SESSION_KEYS).forEach((k) => {
      try {
        window.sessionStorage.removeItem(k);
      } catch {
        // ignore
      }
    });
  });

  it('produces an id, a name, and a color', () => {
    const { result } = renderHook(() => useLocalUser());
    expect(result.current.id).toMatch(/.+/);
    expect(result.current.name).toMatch(/.+/);
    expect(result.current.color).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('keeps identity stable across re-renders within the same hook instance', () => {
    const { result, rerender } = renderHook(() => useLocalUser());
    const first = { ...result.current };
    rerender();
    expect(result.current).toEqual(first);
  });

  it('persists identity in sessionStorage so a later hook instance reuses it', () => {
    const { result: first } = renderHook(() => useLocalUser());
    const stored = {
      id: window.sessionStorage.getItem(SESSION_KEYS.USER_ID),
      name: window.sessionStorage.getItem(SESSION_KEYS.USER_NAME),
    };
    expect(stored.id).toBe(first.current.id);
    expect(stored.name).toBe(first.current.name);

    const { result: second } = renderHook(() => useLocalUser());
    expect(second.current.id).toBe(first.current.id);
    expect(second.current.name).toBe(first.current.name);
    expect(second.current.color).toBe(first.current.color);
  });
});
