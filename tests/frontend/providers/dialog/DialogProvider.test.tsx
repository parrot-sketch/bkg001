import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { DialogProvider, useDialogContext } from '@/providers/dialog/DialogProvider';
import { QueryWrapper } from '@/tests/frontend/mocks/react-query';

function wrapper({ children }: { children: React.ReactNode }) {
  return function Wrapper({ children: innerChildren }: { children: React.ReactNode }) {
    return (
      <QueryWrapper>
        <DialogProvider>
          {innerChildren}
        </DialogProvider>
      </QueryWrapper>
    );
  };
}

describe('DialogProvider', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns initial closed state', () => {
    const { result } = renderHook(() => useDialogContext(), {
      wrapper: wrapper({}),
    });

    expect(result.current.isCompleteDialogOpen).toBe(false);
    expect(result.current.isStartDialogOpen).toBe(false);
  });

  it('opens and closes complete dialog', async () => {
    const { result } = renderHook(() => useDialogContext(), {
      wrapper: wrapper({}),
    });

    act(() => {
      result.current.openCompleteDialog();
    });

    expect(result.current.isCompleteDialogOpen).toBe(true);
    expect(result.current.isStartDialogOpen).toBe(false);

    act(() => {
      result.current.closeCompleteDialog();
    });

    expect(result.current.isCompleteDialogOpen).toBe(false);
  });

  it('opens and closes start dialog', async () => {
    const { result } = renderHook(() => useDialogContext(), {
      wrapper: wrapper({}),
    });

    act(() => {
      result.current.openStartDialog();
    });

    expect(result.current.isStartDialogOpen).toBe(true);
    expect(result.current.isCompleteDialogOpen).toBe(false);

    act(() => {
      result.current.closeStartDialog();
    });

    expect(result.current.isStartDialogOpen).toBe(false);
  });

  it('toggles dialogs independently', async () => {
    const { result } = renderHook(() => useDialogContext(), {
      wrapper: wrapper({}),
    });

    act(() => {
      result.current.openCompleteDialog();
      result.current.openStartDialog();
    });

    expect(result.current.isCompleteDialogOpen).toBe(true);
    expect(result.current.isStartDialogOpen).toBe(true);

    act(() => {
      result.current.closeCompleteDialog();
    });

    expect(result.current.isCompleteDialogOpen).toBe(false);
    expect(result.current.isStartDialogOpen).toBe(true);
  });

  it('throws error when used outside provider', () => {
    expect(() => {
      renderHook(() => useDialogContext());
    }).toThrow('useDialogContext must be used within DialogProvider');
  });
});
