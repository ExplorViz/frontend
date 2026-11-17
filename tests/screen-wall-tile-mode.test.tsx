// @vitest-environment jsdom
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import ScreenWallTileMode from '../src/components/visualization/rendering/screen-wall-tile-mode';
import { useRoomConnectionStore } from '../src/utils/collaboration/room-connection';
import {
  fakeCollaborationService as service,
  type FakeClientRoom,
  type FakeServerRoom,
} from './fake-collaboration-service';
import './setup-dom';

vi.mock('@colyseus/sdk', async () => (await import('./fake-collaboration-service')).fakeColyseusSdk());

let room: FakeServerRoom;
let me: FakeClientRoom;
let adaId: string;
let canvas: HTMLCanvasElement;
/** Whether the browser grants fullscreen without a click. */
let granted: boolean;
let fullscreenElement: Element | null;

function setFullscreen(element: Element | null) {
  fullscreenElement = element;
  act(() => {
    document.dispatchEvent(new Event('fullscreenchange'));
  });
}

beforeEach(async () => {
  service.reset();
  useRoomConnectionStore.setState(useRoomConnectionStore.getInitialState(), true);
  granted = true;
  fullscreenElement = null;
  Object.defineProperty(document, 'fullscreenElement', { configurable: true, get: () => fullscreenElement });
  document.exitFullscreen = vi.fn(async () => setFullscreen(null));
  canvas = document.createElement('canvas');
  canvas.id = 'three-js-canvas';
  canvas.requestFullscreen = vi.fn(async function (this: HTMLCanvasElement) {
    if (!granted && !clicking) throw new TypeError('Permissions check failed');
    setFullscreen(this);
  });
  document.body.appendChild(canvas);

  room = service.openRoom('K7XQ2M', 'Ada');
  adaId = [...room.clients.keys()][0];
  await act(() => useRoomConnectionStore.getState().joinRoom('K7XQ2M', 'Grace'));
  me = useRoomConnectionStore.getState().room as unknown as FakeClientRoom;
});
afterEach(() => {
  canvas.remove();
  vi.useRealTimers();
});

/** jsdom knows no user activation; a test click stands in for it. */
let clicking = false;
async function click(element: Element) {
  clicking = true;
  try {
    await userEvent.click(element);
  } finally {
    clicking = false;
  }
}

const monitor = (name: string, x: number) => ({ name, width: 4, height: 3, diagonal: 50 / 2.54, x, y: 0 });
/** Ada (the Host) shows Tile 1, Grace Tile 2. */
const applyScreenWall = () =>
  room.update((state) => {
    room.putScreenWallTiles([monitor('Ada', 0), monitor('Grace', 45)]);
    state.screenWall.active = true;
    state.participants.get(adaId)!.tile = 0;
    state.participants.get(me.sessionId)!.tile = 1;
    state.participants.get(me.sessionId)!.spectating = adaId;
  });
const stopScreenWall = () =>
  room.update((state) => {
    state.screenWall.active = false;
    state.participants.get(me.sessionId)!.spectating = '';
  });
const becomeHost = () =>
  room.update((state) => {
    state.hostId = me.sessionId;
    state.participants.get(me.sessionId)!.spectating = '';
  });

it('shows the canvas fullscreen on becoming a Tile and leaves fullscreen on stop', async () => {
  render(<ScreenWallTileMode />);
  expect(canvas.requestFullscreen).not.toHaveBeenCalled();

  await act(async () => applyScreenWall());
  expect(document.fullscreenElement).toBe(canvas);

  await act(async () => stopScreenWall());
  expect(document.exitFullscreen).toHaveBeenCalled();
  expect(document.fullscreenElement).toBeNull();
});

it('asks for one click if the browser refuses fullscreen, and again after leaving fullscreen', async () => {
  granted = false;
  render(<ScreenWallTileMode />);
  await act(async () => applyScreenWall());
  expect(document.fullscreenElement).toBeNull();

  await click(screen.getByRole('button', { name: 'Click to show Tile 2 fullscreen' }));
  expect(document.fullscreenElement).toBe(canvas);
  expect(screen.queryByRole('button', { name: /click to show tile/i })).not.toBeInTheDocument();

  setFullscreen(null);
  expect(screen.getByRole('button', { name: 'Click to show Tile 2 fullscreen' })).toBeInTheDocument();
});

it('lets the Host leave fullscreen to the normal view and return with "Show my Tile"', async () => {
  render(<ScreenWallTileMode />);
  await act(async () => becomeHost());
  await act(async () =>
    room.update((state) => {
      room.putScreenWallTiles([monitor('Ada', 0), monitor('Grace', 45)]);
      state.screenWall.active = true;
      state.participants.get(me.sessionId)!.tile = 1;
    })
  );
  expect(document.fullscreenElement).toBe(canvas);
  expect(screen.queryByRole('button', { name: /show my tile/i })).not.toBeInTheDocument();

  setFullscreen(null);
  expect(screen.queryByRole('button', { name: /click to show tile/i })).not.toBeInTheDocument();
  granted = false;
  await click(screen.getByRole('button', { name: 'Show my Tile' }));
  expect(document.fullscreenElement).toBe(canvas);
});

it('shows its Tile number large for a few seconds when the Host identifies the Tiles', async () => {
  // A popover in the top layer, which jsdom does not show.
  const tileNumber = () => screen.queryByLabelText('Tile number');
  render(<ScreenWallTileMode />);
  act(() => me.deliver('screenWallIdentify', {}));
  expect(tileNumber()).not.toBeInTheDocument();

  await act(async () => applyScreenWall());
  vi.useFakeTimers();
  act(() => me.deliver('screenWallIdentify', {}));
  expect(tileNumber()).toHaveTextContent('2');

  act(() => vi.advanceTimersByTime(5000));
  expect(tileNumber()).not.toBeInTheDocument();
});
