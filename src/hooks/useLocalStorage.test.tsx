import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useLocalStorage } from './useLocalStorage';

const KEY_A = 'uls.test.a';
const KEY_B = 'uls.test.b';

describe('useLocalStorage — Requirement 4: persistent state hook', () => {
  beforeEach(() => {
    window.localStorage.removeItem(KEY_A);
    window.localStorage.removeItem(KEY_B);
  });

  afterEach(() => {
    window.localStorage.removeItem(KEY_A);
    window.localStorage.removeItem(KEY_B);
  });

  it('falls back to the initial value when no stored value exists', () => {
    const { result } = renderHook(() => useLocalStorage<string>(KEY_A, 'default'));
    expect(result.current[0]).toBe('default');
  });

  it('reads the stored value on mount', () => {
    window.localStorage.setItem(KEY_A, JSON.stringify('saved'));
    const { result } = renderHook(() => useLocalStorage<string>(KEY_A, 'default'));
    expect(result.current[0]).toBe('saved');
  });

  it('persists updates back to localStorage', () => {
    const { result } = renderHook(() => useLocalStorage<string>(KEY_A, ''));

    act(() => {
      result.current[1]('hello');
    });

    expect(result.current[0]).toBe('hello');
    expect(window.localStorage.getItem(KEY_A)).toBe(JSON.stringify('hello'));
  });

  it('supports function updaters that receive the previous value', () => {
    const { result } = renderHook(() => useLocalStorage<number>(KEY_A, 0));

    act(() => {
      result.current[1]((prev) => prev + 1);
    });
    act(() => {
      result.current[1]((prev) => prev + 1);
    });

    expect(result.current[0]).toBe(2);
    expect(window.localStorage.getItem(KEY_A)).toBe(JSON.stringify(2));
  });

  it('stores complex objects as JSON', () => {
    type Item = { id: string; name: string };
    const { result } = renderHook(() => useLocalStorage<Item[]>(KEY_A, []));

    act(() => {
      result.current[1]([
        { id: '1', name: 'first' },
        { id: '2', name: 'second' },
      ]);
    });

    expect(window.localStorage.getItem(KEY_A)).toBe(
      JSON.stringify([
        { id: '1', name: 'first' },
        { id: '2', name: 'second' },
      ]),
    );
  });

  it('keeps state for different keys isolated', () => {
    const { result: a } = renderHook(() => useLocalStorage<string>(KEY_A, ''));
    const { result: b } = renderHook(() => useLocalStorage<string>(KEY_B, ''));

    act(() => {
      a.current[1]('alpha');
    });
    act(() => {
      b.current[1]('beta');
    });

    expect(a.current[0]).toBe('alpha');
    expect(b.current[0]).toBe('beta');
    expect(window.localStorage.getItem(KEY_A)).toBe(JSON.stringify('alpha'));
    expect(window.localStorage.getItem(KEY_B)).toBe(JSON.stringify('beta'));
  });
});
