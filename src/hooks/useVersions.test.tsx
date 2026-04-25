import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { useVersions } from './useVersions';

function clearVersions() {
  window.localStorage.removeItem(STORAGE_KEYS.VERSIONS);
}

describe('useVersions — Requirement 7: version history hook', () => {
  beforeEach(() => clearVersions());
  afterEach(() => clearVersions());

  it('starts empty when no versions are stored', () => {
    const { result } = renderHook(() => useVersions());
    expect(result.current.versions).toEqual([]);
  });

  it('saveVersion adds an entry with id, name, content, and createdAt', () => {
    const { result } = renderHook(() => useVersions());

    act(() => {
      result.current.saveVersion('First draft', '<p>hello</p>');
    });

    expect(result.current.versions).toHaveLength(1);
    const v = result.current.versions[0];
    expect(v.name).toBe('First draft');
    expect(v.content).toBe('<p>hello</p>');
    expect(typeof v.id).toBe('string');
    expect(v.id.length).toBeGreaterThan(0);
    expect(typeof v.createdAt).toBe('number');
    expect(v.createdAt).toBeGreaterThan(0);
  });

  it('trims the name and falls back to "Untitled" when empty', () => {
    const { result } = renderHook(() => useVersions());

    act(() => {
      result.current.saveVersion('   trimmed   ', '<p>a</p>');
    });
    act(() => {
      result.current.saveVersion('   ', '<p>b</p>');
    });
    act(() => {
      result.current.saveVersion('', '<p>c</p>');
    });

    const names = result.current.versions.map((v) => v.name);
    // Newest-first ordering
    expect(names).toEqual(['Untitled', 'Untitled', 'trimmed']);
  });

  it('orders saved versions newest-first', () => {
    const { result } = renderHook(() => useVersions());

    act(() => result.current.saveVersion('one', 'A'));
    act(() => result.current.saveVersion('two', 'B'));
    act(() => result.current.saveVersion('three', 'C'));

    expect(result.current.versions.map((v) => v.name)).toEqual(['three', 'two', 'one']);
  });

  it('deleteVersion removes the entry with the matching id', () => {
    const { result } = renderHook(() => useVersions());

    act(() => result.current.saveVersion('keep', 'k'));
    act(() => result.current.saveVersion('drop', 'd'));
    const dropId = result.current.versions.find((v) => v.name === 'drop')!.id;

    act(() => result.current.deleteVersion(dropId));

    expect(result.current.versions.map((v) => v.name)).toEqual(['keep']);
  });

  it('deleteVersion is a no-op for unknown ids', () => {
    const { result } = renderHook(() => useVersions());
    act(() => result.current.saveVersion('only', 'x'));

    act(() => result.current.deleteVersion('does-not-exist'));

    expect(result.current.versions).toHaveLength(1);
  });

  it('getVersion returns the entry by id, or undefined for unknown ids', () => {
    const { result } = renderHook(() => useVersions());
    act(() => result.current.saveVersion('one', 'A'));
    const id = result.current.versions[0].id;

    expect(result.current.getVersion(id)?.name).toBe('one');
    expect(result.current.getVersion('missing')).toBeUndefined();
  });

  it('persists versions to STORAGE_KEYS.VERSIONS', () => {
    const { result } = renderHook(() => useVersions());

    act(() => result.current.saveVersion('persist me', '<p>z</p>'));

    const raw = window.localStorage.getItem(STORAGE_KEYS.VERSIONS);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw as string);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].name).toBe('persist me');
    expect(parsed[0].content).toBe('<p>z</p>');
  });

  it('hydrates from existing storage on mount', () => {
    const seeded = [
      { id: 'a', name: 'older', content: 'aa', createdAt: 1000 },
      { id: 'b', name: 'newer', content: 'bb', createdAt: 2000 },
    ];
    window.localStorage.setItem(STORAGE_KEYS.VERSIONS, JSON.stringify(seeded));

    const { result } = renderHook(() => useVersions());
    expect(result.current.versions).toEqual(seeded);
  });

  it('produces unique ids across rapid successive saves', () => {
    const { result } = renderHook(() => useVersions());
    act(() => {
      result.current.saveVersion('one', '1');
      result.current.saveVersion('two', '2');
      result.current.saveVersion('three', '3');
    });
    const ids = result.current.versions.map((v) => v.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
