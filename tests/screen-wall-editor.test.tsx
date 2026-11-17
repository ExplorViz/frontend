// @vitest-environment jsdom
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CollaborationControls from '../src/components/collaboration/visualization/page-setup/sidebar/customizationbar/collaboration/collaboration-controls';
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

beforeEach(() => {
  service.reset();
  useRoomConnectionStore.setState(useRoomConnectionStore.getInitialState(), true);
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response('OK', { status: 200 }))
  );
});

async function enterAsHost() {
  await act(() => useRoomConnectionStore.getState().createRoom('Ada'));
  me = useRoomConnectionStore.getState().room as unknown as FakeClientRoom;
  room = service.rooms.get('ROOM01')!;
}

/** Renders the controls and opens the Screen Wall editor from the header. */
function renderEditor() {
  render(<CollaborationControls />);
  fireEvent.click(screen.getByRole('button', { name: /^screen wall$/i }));
}

it('hides the Screen Wall editor until the Host opens it from the header', async () => {
  await enterAsHost();
  render(<CollaborationControls />);
  const toggle = screen.getByRole('button', { name: /^screen wall$/i });
  expect(screen.queryByRole('region', { name: /screen wall/i })).not.toBeInTheDocument();

  fireEvent.click(toggle);
  expect(screen.getByRole('region', { name: /screen wall/i })).toBeInTheDocument();
  expect(toggle).toHaveAttribute('aria-pressed', 'true');

  fireEvent.click(toggle);
  expect(screen.queryByRole('region', { name: /screen wall/i })).not.toBeInTheDocument();
});

it('offers the Screen Wall editor to the Host only', async () => {
  await enterAsHost();
  renderEditor();

  expect(screen.getByRole('region', { name: /screen wall/i })).toBeInTheDocument();

  room.update((state) => (state.hostId = 'someone-else'));
  expect(screen.queryByRole('region', { name: /screen wall/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /^screen wall$/i })).not.toBeInTheDocument();
});

const tileRows = () => within(screen.getByRole('list', { name: /tiles/i })).getAllByRole('listitem');

async function setField(user: ReturnType<typeof userEvent.setup>, field: HTMLElement, value: string) {
  await user.clear(field);
  await user.type(field, value);
}

it('sends the drafted Tiles only on Apply configuration', async () => {
  await enterAsHost();
  const user = userEvent.setup();
  renderEditor();

  await user.click(screen.getByRole('button', { name: /add tile/i }));
  const tile = within(tileRows()[0]);
  await setField(user, tile.getByRole('textbox', { name: /display name/i }), 'Left');
  await setField(user, tile.getByRole('spinbutton', { name: /width/i }), '2560');
  await setField(user, tile.getByRole('spinbutton', { name: /height/i }), '1440');
  await setField(user, tile.getByRole('spinbutton', { name: /diagonal/i }), '27');
  expect(me.sent).toEqual([]);

  await user.click(screen.getByRole('button', { name: /apply configuration/i }));

  expect(me.sent).toEqual([
    {
      type: 'screenWallApply',
      payload: { tiles: [{ name: 'Left', width: 2560, height: 1440, diagonal: 27, x: 0, y: 0 }] },
    },
  ]);
});

const appliedTiles = () => (me.sent.at(-1)!.payload as { tiles: Record<string, unknown>[] }).tiles;

it('sets a resolution from a preset and rotates it', async () => {
  await enterAsHost();
  const user = userEvent.setup();
  renderEditor();
  await user.click(screen.getByRole('button', { name: /add tile/i }));
  const tile = within(tileRows()[0]);

  await user.selectOptions(tile.getByRole('combobox', { name: /resolution preset/i }), '3840 × 2160');
  await user.click(tile.getByRole('button', { name: /rotate/i }));
  await user.click(screen.getByRole('button', { name: /apply configuration/i }));

  expect(appliedTiles()[0]).toMatchObject({ width: 2160, height: 3840 });
});

const LEFT = { name: 'Left', width: 1920, height: 1080, diagonal: 24, x: 0, y: 0 };
const RIGHT = { name: 'Right', width: 1920, height: 1080, diagonal: 24, x: 54, y: 0 };

function configureWall(tiles: (typeof LEFT)[], active: boolean) {
  room.update((state) => {
    room.putScreenWallTiles(tiles);
    state.screenWall.active = active;
  });
}

it('starts the draft from the configuration the Room has', async () => {
  await enterAsHost();
  configureWall([LEFT, RIGHT], false);
  const user = userEvent.setup();
  renderEditor();

  expect(tileRows()).toHaveLength(2);
  await user.click(screen.getByRole('button', { name: /apply configuration/i }));
  expect(appliedTiles()).toEqual([LEFT, RIGHT]);
});

it('stops an active Screen Wall and asks every Tile to identify itself', async () => {
  await enterAsHost();
  const user = userEvent.setup();
  renderEditor();
  expect(screen.queryByRole('button', { name: /^stop/i })).not.toBeInTheDocument();

  configureWall([LEFT], true);
  await user.click(screen.getByRole('button', { name: /identify/i }));
  await user.click(screen.getByRole('button', { name: /^stop/i }));

  expect(me.sent).toEqual([
    { type: 'screenWallIdentify', payload: {} },
    { type: 'screenWallStop', payload: {} },
  ]);
});

it('flags a Tile whose name several Participants have', async () => {
  await enterAsHost();
  room.seat('session-left-1', 'Left');
  configureWall([LEFT, RIGHT], false);
  renderEditor();
  expect(screen.queryByText(/several participants/i)).not.toBeInTheDocument();

  act(() => {
    room.seat('session-left-2', 'Left');
  });

  expect(within(tileRows()[0]).getByText(/several participants/i)).toBeInTheDocument();
  expect(within(tileRows()[1]).queryByText(/several participants/i)).not.toBeInTheDocument();
});

it('removes a Tile from the draft', async () => {
  await enterAsHost();
  configureWall([LEFT, RIGHT], false);
  const user = userEvent.setup();
  renderEditor();

  await user.click(within(tileRows()[0]).getByRole('button', { name: /remove/i }));
  await user.click(screen.getByRole('button', { name: /apply configuration/i }));

  expect(appliedTiles()).toEqual([RIGHT]);
});

it('exports the drafted configuration as JSON', async () => {
  await enterAsHost();
  configureWall([LEFT, RIGHT], false);
  let exported: Blob | undefined;
  vi.stubGlobal(
    'URL',
    Object.assign(URL, { createObjectURL: (blob: Blob) => ((exported = blob), 'blob:wall'), revokeObjectURL: () => {} })
  );
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  const user = userEvent.setup();
  renderEditor();

  await user.click(screen.getByRole('button', { name: /export/i }));

  expect(click).toHaveBeenCalled();
  expect(JSON.parse(await exported!.text())).toEqual({ tiles: [LEFT, RIGHT] });
});

it('imports a configuration into the draft', async () => {
  await enterAsHost();
  const user = userEvent.setup();
  renderEditor();

  const file = new File([JSON.stringify({ tiles: [RIGHT, LEFT] })], 'wall.json', { type: 'application/json' });
  await user.upload(screen.getByLabelText(/import/i), file);
  await screen.findAllByRole('listitem');
  await user.click(screen.getByRole('button', { name: /apply configuration/i }));

  expect(appliedTiles()).toEqual([RIGHT, LEFT]);
});

it('drags a Tile on the arrangement canvas, snapping it to the edge of another', async () => {
  await enterAsHost();
  configureWall([LEFT, { ...RIGHT, x: 54 }], false);
  const user = userEvent.setup();
  renderEditor();
  const canvas = screen.getByRole('group', { name: /arrangement/i });
  vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 300, 150));

  const right = within(canvas).getByRole('button', { name: /tile 2/i });
  fireEvent.pointerDown(right, { clientX: 200, clientY: 50, pointerId: 1 });
  fireEvent.pointerMove(right, { clientX: 199, clientY: 50, pointerId: 1 });
  fireEvent.pointerUp(right, { clientX: 199, clientY: 50, pointerId: 1 });
  await user.click(screen.getByRole('button', { name: /apply configuration/i }));

  expect(appliedTiles()[1].x).toBeCloseTo(53.13, 2);
  expect(appliedTiles()[1].y).toBe(0);
});

it('snaps a dragged Tile from a few screen pixels away, however large the wall is in cm', async () => {
  await enterAsHost();
  configureWall([LEFT, { ...RIGHT, x: 54 }], false);
  const user = userEvent.setup();
  renderEditor();
  const canvas = screen.getByRole('group', { name: /arrangement/i });
  vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 300, 150));

  // About 0.53 cm per pixel: 4 pixels right of the snap edge are about 3 cm.
  const right = within(canvas).getByRole('button', { name: /tile 2/i });
  fireEvent.pointerDown(right, { clientX: 200, clientY: 50, pointerId: 1 });
  fireEvent.pointerMove(right, { clientX: 204, clientY: 50, pointerId: 1 });
  fireEvent.pointerUp(right, { clientX: 204, clientY: 50, pointerId: 1 });
  await user.click(screen.getByRole('button', { name: /apply configuration/i }));

  expect(appliedTiles()[1].x).toBeCloseTo(53.13, 2);
});

describe('Apply with a Tile of the Host’s own name', () => {
  let canvas: HTMLCanvasElement;
  beforeEach(() => {
    canvas = document.createElement('canvas');
    canvas.id = 'three-js-canvas';
    canvas.requestFullscreen = vi.fn(async () => {});
    document.body.appendChild(canvas);
  });
  afterEach(() => canvas.remove());

  it('shows the Host’s Tile fullscreen within the click, also on a re-Apply while active', async () => {
    await enterAsHost();
    configureWall([{ ...LEFT, name: 'Ada' }, RIGHT], false);
    const user = userEvent.setup();
    renderEditor();

    await user.click(screen.getByRole('button', { name: /apply configuration/i }));
    expect(canvas.requestFullscreen).toHaveBeenCalledTimes(1);

    act(() => room.update((state) => (state.screenWall.active = true)));
    await user.click(screen.getByRole('button', { name: /apply configuration/i }));
    expect(canvas.requestFullscreen).toHaveBeenCalledTimes(2);
  });

  it('leaves fullscreen alone when no Tile has the Host’s name', async () => {
    await enterAsHost();
    configureWall([LEFT, RIGHT], false);
    const user = userEvent.setup();
    renderEditor();

    await user.click(screen.getByRole('button', { name: /apply configuration/i }));

    expect(canvas.requestFullscreen).not.toHaveBeenCalled();
  });
});
