// @vitest-environment jsdom
import { useThree } from '@react-three/fiber';
import { act, create } from '@react-three/test-renderer';
import { PerspectiveCamera, Vector3 } from 'three';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import HostTileProjection from '../src/components/visualization/rendering/host-tile-projection';
import SpectateCameraController from '../src/components/visualization/rendering/spectate-camera-controller';
import { useRoomConnectionStore } from '../src/utils/collaboration/room-connection';
import { fovOf } from '../src/utils/collaboration/screen-wall-projection';
import { fakeCollaborationService, type FakeClientRoom, type FakeServerRoom } from './fake-collaboration-service';

vi.mock('@colyseus/sdk', async () => (await import('./fake-collaboration-service')).fakeColyseusSdk());

let renderer: Awaited<ReturnType<typeof create>> | undefined;
let server: FakeServerRoom;
let me: FakeClientRoom;
let canvas: HTMLCanvasElement;
let graceId: string;
let fullscreenElement: Element | null = null;

const setFullscreen = (element: Element | null) =>
  act(async () => {
    fullscreenElement = element;
    document.dispatchEvent(new Event('fullscreenchange'));
  });

beforeEach(async () => {
  fakeCollaborationService.reset();
  useRoomConnectionStore.setState(useRoomConnectionStore.getInitialState(), true);
  fullscreenElement = null;
  Object.defineProperty(document, 'fullscreenElement', { configurable: true, get: () => fullscreenElement });
  canvas = document.createElement('canvas');
  canvas.id = 'three-js-canvas';
  document.body.appendChild(canvas);
  server = fakeCollaborationService.openRoom('ABCDEF', 'Grace');
  await useRoomConnectionStore.getState().joinRoom('ABCDEF', 'Ada');
  me = useRoomConnectionStore.getState().room as unknown as FakeClientRoom;
  graceId = [...server.clients.keys()][0];
  server.update((state) => {
    state.hostId = me.sessionId;
  });
});
afterEach(async () => {
  await renderer?.unmount();
  renderer = undefined;
  canvas.remove();
});

// Two 4:3 Tiles of 40 × 30 cm side by side with a 5 cm gap; the Host shows the right one.
const tile = (name: string, x: number, y = 0) => ({ name, width: 4, height: 3, diagonal: 50 / 2.54, x, y });
const applyScreenWall = (hostTileY = 0) =>
  act(async () =>
    server.update((state) => {
      server.putScreenWallTiles([tile('Grace', 0), tile('Ada', 45, hostTileY)]);
      state.screenWall.active = true;
      state.participants.get(me.sessionId)!.tile = 1;
      state.participants.get(graceId)!.tile = 0;
      state.participants.get(graceId)!.spectating = me.sessionId;
    })
  );
const sentCameras = () => me.sent.filter((m) => m.type === 'camera').map((m) => m.payload);

it('renders its Tile with exactly its own view while fullscreen, the other Tiles extending it, and its own view after', async () => {
  const camera = new PerspectiveCamera(60, 1, 0.5, 500);
  renderer = await create(<HostTileProjection />, { camera });
  const own = camera.projectionMatrix.clone();
  await applyScreenWall();
  await renderer.advanceFrames(1, 1 / 60);
  // Not fullscreen: the normal view.
  expect(camera.projectionMatrix.equals(own)).toBe(true);

  await setFullscreen(canvas);
  await renderer.advanceFrames(1, 1 / 60);
  // The own FOV over the own 4:3 Tile, not over the whole wall: the Host's view, at its Tile's aspect.
  expect(camera.projectionMatrix.equals(new PerspectiveCamera(60, 4 / 3, 0.5, 500).projectionMatrix)).toBe(true);

  await setFullscreen(null);
  await renderer.advanceFrames(1, 1 / 60);
  expect(camera.view?.enabled ?? false).toBe(false);
  expect(camera.fov).toBe(60);
  expect(camera.projectionMatrix.equals(own)).toBe(true);
});

it('still sends its own FOV to the other Tiles while it renders its Tile', async () => {
  const camera = new PerspectiveCamera(60, 1, 0.5, 500);
  renderer = await create(
    <>
      <HostTileProjection />
      <SpectateCameraController />
    </>,
    { camera }
  );
  // Lower than Grace's, so that its part of the wall is not as high as the wall.
  await applyScreenWall(30);
  await setFullscreen(canvas);
  await renderer.advanceFrames(2, 1 / 60);

  const sent = sentCameras();
  expect(camera.view?.enabled).toBe(true);
  expect(fovOf((sent.at(-1) as { projection: number[] }).projection)).toBeCloseTo(60);
});

it('sends spectators a view with its own canvas aspect, not stretched to the wall', async () => {
  const camera = new PerspectiveCamera(60, 1, 0.5, 500);
  let size = { width: 0, height: 0 };
  function SizeProbe() {
    size = useThree((state) => state.size);
    return null;
  }
  renderer = await create(
    <>
      <SizeProbe />
      <HostTileProjection />
      <SpectateCameraController />
    </>,
    { camera }
  );
  await applyScreenWall();
  await setFullscreen(canvas);
  await renderer.advanceFrames(2, 1 / 60);

  const { projection } = sentCameras().at(-1) as { projection: number[] };
  const expected = new PerspectiveCamera(60, size.width / size.height, 0.5, 500).projectionMatrix.toArray();
  projection.forEach((value, i) => expect(value).toBeCloseTo(expected[i]));
});
