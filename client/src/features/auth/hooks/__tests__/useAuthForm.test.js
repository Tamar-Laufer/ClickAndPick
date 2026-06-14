import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useAuthForm from '../useAuthForm';

describe('useAuthForm', () => {
  it('initialises the form and updates a field via handleChange', () => {
    const { result } = renderHook(() => useAuthForm({ email: '', password: '' }));
    expect(result.current.form).toEqual({ email: '', password: '' });

    act(() => result.current.handleChange({ target: { name: 'email', value: 'a@b.com' } }));
    expect(result.current.form.email).toBe('a@b.com');
    expect(result.current.form.password).toBe('');
  });

  it('blocks submission and surfaces the message when validate fails', async () => {
    const handler = vi.fn();
    const { result } = renderHook(() => useAuthForm({ email: '' }));
    const preventDefault = vi.fn();

    await act(async () => {
      await result.current.submit(handler, { validate: () => 'שדה חסר' })({ preventDefault });
    });

    expect(preventDefault).toHaveBeenCalled();
    expect(handler).not.toHaveBeenCalled();
    expect(result.current.error).toBe('שדה חסר');
  });

  it('runs the handler with the current form when validation passes', async () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useAuthForm({ email: 'a@b.com' }));

    await act(async () => {
      await result.current.submit(handler)({ preventDefault() {} });
    });

    expect(handler).toHaveBeenCalledWith({ email: 'a@b.com' });
    expect(result.current.error).toBe('');
  });

  it('surfaces a thrown error message from the handler', async () => {
    const handler = vi.fn().mockRejectedValue(new Error('כשל בקשה'));
    const { result } = renderHook(() => useAuthForm({ email: 'a@b.com' }));

    await act(async () => {
      await result.current.submit(handler)({ preventDefault() {} });
    });

    expect(result.current.error).toBe('כשל בקשה');
    expect(result.current.loading).toBe(false);
  });
});
