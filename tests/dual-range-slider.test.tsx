// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import DualRangeSlider from '../src/components/dual-range-slider';
import './setup-dom';

it('sorts initial bounds numerically and submits the selected range', () => {
  render(
    <form aria-label="Range">
      <DualRangeSlider
        min={0}
        max={100}
        initialValue={[20, 3]}
        lowerFormName="from"
        upperFormName="to"
      />
    </form>
  );
  expect(screen.getByRole('form')).toHaveFormValues({ from: '3', to: '20' });
});

it('supports keyboard steps, crossover and clamping to bounds', async () => {
  const user = userEvent.setup();
  const change = vi.fn();
  render(
    <DualRangeSlider min={0} max={10} initialValue={[2, 4]} onChange={change} />
  );
  await user.tab();
  await user.keyboard('{ArrowRight}');
  expect(change).toHaveBeenLastCalledWith([3, 4]);
  await user.keyboard('{PageUp}');
  expect(change).toHaveBeenLastCalledWith([4, 5]);
  await user.keyboard('{End}');
  expect(change).toHaveBeenLastCalledWith([4, 10]);
  const calls = change.mock.calls.length;
  await user.keyboard('{ArrowRight}');
  expect(change).toHaveBeenCalledTimes(calls);
  await user.keyboard('{Home}');
  expect(change).toHaveBeenLastCalledWith([0, 4]);
});

it('uses controlled values until the parent supplies new bounds', async () => {
  const user = userEvent.setup();
  const change = vi.fn();
  const { rerender } = render(
    <form aria-label="Range">
      <DualRangeSlider
        min={0}
        max={10}
        value={[2, 8]}
        lowerFormName="from"
        onChange={change}
      />
    </form>
  );
  await user.tab();
  await user.keyboard('{ArrowRight}');
  expect(change).toHaveBeenLastCalledWith([3, 8]);
  expect(screen.getByRole('form')).toHaveFormValues({ from: '2' });
  await act(async () => {
    rerender(
      <form aria-label="Range">
        <DualRangeSlider min={0} max={10} value={[3, 8]} lowerFormName="from" />
      </form>
    );
  });
  expect(screen.getByRole('form')).toHaveFormValues({ from: '3' });
});

it('does not change a disabled slider through keyboard or track clicks', () => {
  const change = vi.fn();
  const { container } = render(
    <DualRangeSlider min={0} max={10} disabled onChange={change} />
  );
  // The current component has no slider roles; tab order and the track are its public interaction surface.
  const track = container.firstElementChild!;
  vi.spyOn(track, 'getBoundingClientRect').mockReturnValue({
    left: 0,
    width: 100,
  } as DOMRect);
  fireEvent.pointerDown(track, { clientX: 50 });
  expect(change).not.toHaveBeenCalled();
});

it('starts keyboard navigation at the numeric lower bound', async () => {
  const user = userEvent.setup();
  const change = vi.fn();
  render(
    <DualRangeSlider
      min={0}
      max={100}
      initialValue={[20, 3]}
      onChange={change}
    />
  );
  await user.tab();
  await user.keyboard('{ArrowRight}');
  expect(change).toHaveBeenLastCalledWith([4, 20]);
});

it('snaps pointer selection, drags the closest thumb, and stops after release', async () => {
  const change = vi.fn();
  const { container } = render(
    <DualRangeSlider
      min={0}
      max={100}
      step={10}
      initialValue={[20, 80]}
      onChange={change}
    />
  );
  const track = container.firstElementChild!;
  vi.spyOn(track, 'getBoundingClientRect').mockReturnValue({
    left: 0,
    width: 100,
  } as DOMRect);
  // JSDOM does not implement pointer capture. Stub only this browser boundary.
  for (const thumb of container.querySelectorAll('.dual-range-thumb')) {
    Object.assign(thumb, {
      setPointerCapture: vi.fn(),
      hasPointerCapture: () => true,
      releasePointerCapture: vi.fn(),
    });
  }
  // Focusing a thumb and changing its value schedule asynchronous Popper updates.
  // Await them inside act before asserting or starting the next gesture.
  await act(async () => {
    fireEvent.pointerDown(track, { clientX: 72, pointerId: 1 });
  });
  expect(change).toHaveBeenLastCalledWith([20, 70]);
  await act(async () => {
    fireEvent.pointerMove(window, { clientX: 90, pointerId: 1 });
  });
  expect(change).toHaveBeenLastCalledWith([20, 90]);
  await act(async () => {
    fireEvent.pointerUp(document.activeElement!, { pointerId: 1 });
  });
  const calls = change.mock.calls.length;
  await act(async () => {
    fireEvent.pointerMove(window, { clientX: 50, pointerId: 1 });
  });
  expect(change).toHaveBeenCalledTimes(calls);
  await act(async () => {
    fireEvent.pointerDown(track, { clientX: 13, pointerId: 2 });
  });
  expect(change).toHaveBeenLastCalledWith([10, 90]);
  await act(async () => {
    fireEvent.pointerCancel(document.activeElement!, { pointerId: 2 });
  });
});
