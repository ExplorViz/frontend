// @vitest-environment jsdom
import { act, create } from '@react-three/test-renderer';
import { type Object3D, PerspectiveCamera, Vector3 } from 'three';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import ScreenWallOutline from '../src/components/visualization/rendering/screen-wall-outline';
import { useRoomConnectionStore } from '../src/utils/collaboration/room-connection';
import { fakeCollaborationService, type FakeClientRoom, type FakeServerRoom } from './fake-collaboration-service';

vi.mock('@colyseus/sdk', async () => (await import('./fake-collaboration-service')).fakeColyseusSdk());

let renderer: Awaited<ReturnType<typeof create>> | undefined;
let server: FakeServerRoom;
let me: FakeClientRoom;

// Two 4:3 monitors of 50 cm diagonal (40 x 30 cm), 5 cm apart: the wall is 85 x 30 cm.
const monitor = (name: string, x: number) => ({ name, width: 4, height: 3, diagonal: 50 / 2.54, x, y: 0 });

beforeEach(async () => {
  fakeCollaborationService.reset();
  useRoomConnectionStore.setState(useRoomConnectionStore.getInitialState(), true);
  server = fakeCollaborationService.openRoom('ABCDEF', 'Ada');
  await useRoomConnectionStore.getState().joinRoom('ABCDEF', 'Grace');
  me = useRoomConnectionStore.getState().room as unknown as FakeClientRoom;
});
afterEach(async () => {
  await renderer?.unmount();
  renderer = undefined;
});

const startWall = (host: string) =>
  server.update((state) => {
    state.hostId = host;
    server.putScreenWallTiles([monitor('left', 0), monitor('right', 45)]);
    state.screenWall.active = true;
  });

/** A camera 4 times as wide as high, with a 60° vertical FOV. */
function hostCamera() {
  const camera = new PerspectiveCamera(60, 4, 0.1, 100);
  camera.manual = true;
  camera.position.set(1, 2, 3);
  camera.lookAt(5, 0, -2);
  return camera;
}

/** The outline's vertices, where they land on the camera's screen. */
function outlineOnScreen(camera: PerspectiveCamera) {
  const found = renderer!.scene.findAllByProps({ name: 'screen-wall-outline' })[0];
  const outline = found?.instance as Object3D & {
    geometry: {
      attributes: {
        position: { count: number; getX(i: number): number; getY(i: number): number; getZ(i: number): number };
      };
    };
  };
  if (!outline?.visible) return undefined;
  camera.updateMatrixWorld();
  outline.updateMatrixWorld();
  const position = outline.geometry.attributes.position;
  return Array.from({ length: position.count }, (_, i) =>
    new Vector3(position.getX(i), position.getY(i), position.getZ(i)).applyMatrix4(outline.matrixWorld).project(camera)
  );
}

it("outlines on the Host's screen the frustum the wall shows, with the Tile borders", async () => {
  const camera = hostCamera();
  renderer = await create(<ScreenWallOutline />, { camera });
  await act(async () => startWall(me.sessionId));
  await renderer.advanceFrames(1, 1 / 60);

  const points = outlineOnScreen(camera)!;
  // The FOV spans the wall's height; its width is 85/30 of that, against the camera's 4.
  const half = 85 / 30 / 4;
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  expect(Math.min(...xs)).toBeCloseTo(-half);
  expect(Math.max(...xs)).toBeCloseTo(half);
  expect(Math.min(...ys)).toBeCloseTo(-1);
  expect(Math.max(...ys)).toBeCloseTo(1);
  // The gap between the monitors: the left one ends at 40 cm, the right one starts at 45 cm.
  for (const cm of [40, 45]) expect(xs.some((x) => Math.abs(x - (-half + (2 * half * cm) / 85)) < 1e-6)).toBe(true);
});

it.each(['not the Host', 'wall stopped', 'Host fullscreen on its Tile'])(
  'shows no outline when %s',
  async (scenario) => {
    const camera = hostCamera();
    renderer = await create(<ScreenWallOutline />, { camera });
    await act(async () => startWall(scenario === 'not the Host' ? [...server.clients.keys()][0] : me.sessionId));
    if (scenario === 'wall stopped') await act(async () => server.update((state) => (state.screenWall.active = false)));
    if (scenario === 'Host fullscreen on its Tile') camera.setViewOffset(85, 30, 0, 0, 40, 30);
    await renderer.advanceFrames(1, 1 / 60);
    expect(outlineOnScreen(camera)).toBeUndefined();
  }
);
