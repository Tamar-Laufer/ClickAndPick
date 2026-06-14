import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useAsyncAction from '../useAsyncAction';

describe('useAsyncAction', () => {
  it('returns the action result and keeps error empty on success', async () => {
    const action = vi.fn().mockResolvedValue('ok');
    const { result } = renderHook(() => useAsyncAction(action));

    let ret;
    await act(async () => { ret = await result.current.run('arg'); });

    expect(action).toHaveBeenCalledWith('arg');
    expect(ret).toBe('ok');
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('');
  });

  it('flips loading to true while the action is in flight', async () => {
    let release;
    const action = vi.fn(() => new Promise((res) => { release = res; }));
    const { result } = renderHook(() => useAsyncAction(action));

    let pending;
    act(() => { pending = result.current.run(); });
    expect(result.current.loading).toBe(true);

    await act(async () => { release('done'); await pending; });
    expect(result.current.loading).toBe(false);
  });

  it('catches a thrown error, exposes its message, and resolves to undefined', async () => {
    const action = vi.fn().mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useAsyncAction(action));

    let ret = 'sentinel';
    await act(async () => { ret = await result.current.run(); });

    expect(ret).toBeUndefined();
    expect(result.current.error).toBe('boom');
    expect(result.current.loading).toBe(false);
  });

  it('lets callers clear the error via setError', async () => {
    const action = vi.fn().mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useAsyncAction(action));

    await act(async () => { await result.current.run(); });
    expect(result.current.error).toBe('boom');

    act(() => result.current.setError(''));
    expect(result.current.error).toBe('');
  });
});
