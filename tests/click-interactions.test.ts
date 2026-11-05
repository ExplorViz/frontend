// @vitest-environment jsdom
import type { ThreeEvent } from '@react-three/fiber';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import useClickPreventionOnDoubleClick, {
  maxPointerDriftDuringDelay,
} from '../src/hooks/useClickPreventionOnDoubleClick';
import './setup-dom';

function pointer(delta = 0) {
  return {
    stopPropagation: vi.fn(),
    delta,
    nativeEvent: new MouseEvent('click', { clientX: 10, clientY: 20 }),
  } as unknown as ThreeEvent<MouseEvent>;
}
const move = (x: number, y: number) =>
  window.dispatchEvent(
    new MouseEvent('pointermove', { clientX: x, clientY: y })
  );
beforeEach(() => vi.useFakeTimers());

function setup() {
  const click = vi.fn(),
    doubleClick = vi.fn(),
    rightClick = vi.fn();
  const hook = renderHook(() =>
    useClickPreventionOnDoubleClick(click, doubleClick, {
      onRightClick: rightClick,
    })
  );
  return { ...hook, click, doubleClick, rightClick };
}

describe('3D pointer gesture arbitration', () => {
  it('defers a single click until the double-click window closes', async () => {
    const { result, click } = setup();
    const event = pointer();
    act(() => {
      void result.current[0](event);
    });
    expect(event.stopPropagation).toHaveBeenCalledOnce();
    await act(() => vi.advanceTimersByTimeAsync(249));
    expect(click).not.toHaveBeenCalled();
    await act(() => vi.advanceTimersByTimeAsync(1));
    expect(click).toHaveBeenCalledExactlyOnceWith(event);
  });

  it('cancels pending single clicks on double click', async () => {
    const { result, click, doubleClick } = setup();
    act(() => {
      void result.current[0](pointer());
      void result.current[0](pointer());
      result.current[1](pointer());
    });
    await act(() => vi.runAllTimersAsync());
    expect(click).not.toHaveBeenCalled();
    expect(doubleClick).toHaveBeenCalledOnce();
  });

  it.each([12, 20])(
    'does not select after a drag of %s pixels',
    async (delta) => {
      const { result, click } = setup();
      act(() => {
        void result.current[0](pointer(delta));
      });
      await act(() => vi.runAllTimersAsync());
      expect(click).not.toHaveBeenCalled();
    }
  );

  it.each([0, 2])(
    'rejects drift even when the pointer returns to its start (handler %s)',
    async (index) => {
      const { result, click, rightClick } = setup();
      act(() => {
        void result.current[index](pointer());
      });
      move(30, 20);
      move(10, 20);
      await act(() => vi.runAllTimersAsync());
      expect(click).not.toHaveBeenCalled();
      expect(rightClick).not.toHaveBeenCalled();
    }
  );

  it('opens a context menu after its shorter delay and cancels selection', async () => {
    const { result, click, rightClick } = setup();
    const event = pointer();
    act(() => {
      void result.current[0](pointer());
      void result.current[2](event);
    });
    await act(() => vi.advanceTimersByTimeAsync(150));
    expect(rightClick).toHaveBeenCalledExactlyOnceWith(event);
    await act(() => vi.runAllTimersAsync());
    expect(click).not.toHaveBeenCalled();
  });

  it.each([0, 2])(
    'supports XR events whose delta getter throws (handler %s)',
    async (index) => {
      const { result, click, rightClick } = setup();
      const event = pointer();
      Object.defineProperty(event, 'delta', {
        get() {
          throw new Error('XR has no mouse delta');
        },
      });
      act(() => {
        void result.current[index](event);
      });
      await act(() => vi.runAllTimersAsync());
      expect(index === 0 ? click : rightClick).toHaveBeenCalledOnce();
    }
  );

  it('ignores context menus when no handler is registered', () => {
    const { result } = renderHook(() =>
      useClickPreventionOnDoubleClick(vi.fn(), vi.fn())
    );
    const event = pointer();
    result.current[2](event);
    expect(event.stopPropagation).not.toHaveBeenCalled();
  });

  it('cancels pending selection when the component unmounts', async () => {
    const { result, unmount, click } = setup();
    act(() => {
      void result.current[0](pointer());
    });
    unmount();
    await act(() => vi.runAllTimersAsync());
    expect(click).not.toHaveBeenCalled();
  });

  it('tracks maximum Euclidean drift and stops listening after cleanup', () => {
    const tracker = maxPointerDriftDuringDelay(pointer().nativeEvent);
    move(13, 24);
    move(10, 20);
    expect(tracker.getMaxDistance()).toBe(5);
    tracker.cleanup();
    move(100, 100);
    expect(tracker.getMaxDistance()).toBe(5);
  });
});
