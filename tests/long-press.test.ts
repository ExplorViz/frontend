// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import type { TouchEvent } from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import useLongPress from '../src/hooks/useLongPress';
import './setup-dom';

const touch = (x = 100, y = 200) =>
  ({
    touches: [{ pageX: x, pageY: y, clientX: x - 10, clientY: y - 20 }],
    preventDefault: vi.fn(),
  }) as unknown as TouchEvent;
beforeEach(() => vi.useFakeTimers());

it('fires once at the configured delay with both page and viewport coordinates', () => {
  const callback = vi.fn();
  const { result } = renderHook(() => useLongPress(callback, { delay: 400 }));
  result.current.onTouchStart(touch());
  act(() => vi.advanceTimersByTime(399));
  expect(callback).not.toHaveBeenCalled();
  act(() => vi.advanceTimersByTime(1));
  expect(callback).toHaveBeenCalledExactlyOnceWith({
    x: 100,
    y: 200,
    clientX: 90,
    clientY: 180,
  });
  const end = touch();
  result.current.onTouchEnd(end);
  expect(end.preventDefault).toHaveBeenCalledOnce();
});

it.each(['end', 'move-x', 'move-y', 'unmount'])(
  'cancels a pending long press on %s',
  (action) => {
    const callback = vi.fn();
    const { result, unmount } = renderHook(() => useLongPress(callback));
    result.current.onTouchStart(touch());
    if (action === 'end') {
      const end = touch();
      result.current.onTouchEnd(end);
      expect(end.preventDefault).not.toHaveBeenCalled();
    }
    if (action === 'move-x') result.current.onTouchMove(touch(136, 200));
    if (action === 'move-y') result.current.onTouchMove(touch(100, 236));
    if (action === 'unmount') unmount();
    act(() => vi.runAllTimers());
    expect(callback).not.toHaveBeenCalled();
  }
);

it('tolerates small movement and restarts the timer on a new touch', () => {
  const callback = vi.fn();
  const { result } = renderHook(() => useLongPress(callback));
  result.current.onTouchStart(touch());
  act(() => vi.advanceTimersByTime(300));
  result.current.onTouchStart(touch(200, 300));
  result.current.onTouchMove(touch(235, 335));
  act(() => vi.advanceTimersByTime(200));
  expect(callback).not.toHaveBeenCalled();
  act(() => vi.advanceTimersByTime(300));
  expect(callback).toHaveBeenCalledOnce();
});
