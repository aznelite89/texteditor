import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readJSON, removeKey, writeJSON } from './storage';

const TEST_KEY = 'storage.test.key';
const OTHER_KEY = 'storage.test.other';

describe('storage — Requirement 4: localStorage layer', () => {
  beforeEach(() => {
    window.localStorage.removeItem(TEST_KEY);
    window.localStorage.removeItem(OTHER_KEY);
  });

  afterEach(() => {
    window.localStorage.removeItem(TEST_KEY);
    window.localStorage.removeItem(OTHER_KEY);
  });

  it('writeJSON serializes the value as JSON', () => {
    writeJSON(TEST_KEY, { hello: 'world', n: 42 });
    expect(window.localStorage.getItem(TEST_KEY)).toBe(
      JSON.stringify({ hello: 'world', n: 42 }),
    );
  });

  it('readJSON round-trips through writeJSON', () => {
    writeJSON(TEST_KEY, ['a', 'b', 'c']);
    expect(readJSON<string[]>(TEST_KEY, [])).toEqual(['a', 'b', 'c']);
  });

  it('readJSON returns the fallback when the key is missing', () => {
    expect(readJSON<string>(TEST_KEY, 'fallback')).toBe('fallback');
  });

  it('readJSON returns the fallback when the stored JSON is invalid', () => {
    window.localStorage.setItem(TEST_KEY, 'not-json{');
    expect(readJSON<string>(TEST_KEY, 'fallback')).toBe('fallback');
  });

  it('writeJSON silently swallows setItem errors (e.g., quota exceeded)', () => {
    const setItemSpy = vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    expect(() => writeJSON(TEST_KEY, 'x')).not.toThrow();
    setItemSpy.mockRestore();
  });

  it('removeKey removes the stored value', () => {
    writeJSON(TEST_KEY, 'value');
    expect(window.localStorage.getItem(TEST_KEY)).not.toBeNull();
    removeKey(TEST_KEY);
    expect(window.localStorage.getItem(TEST_KEY)).toBeNull();
  });

  it('keys are isolated from each other', () => {
    writeJSON(TEST_KEY, 'one');
    writeJSON(OTHER_KEY, 'two');
    expect(readJSON<string>(TEST_KEY, '')).toBe('one');
    expect(readJSON<string>(OTHER_KEY, '')).toBe('two');
  });
});
