import { act, create } from '@react-three/test-renderer';
import { Matrix4, OrthographicCamera, PerspectiveCamera } from 'three';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import SpectateCameraController from '../src/components/visualization/rendering/spectate-camera-controller';
import { useSpectateUserStore } from '../src/stores/collaboration/spectate-user';

const { players } = vi.hoisted(() => ({
  players: [{ id: 'remote', getState: vi.fn() }],
}));
vi.mock('../src/components/collaboration/playroom-players-context-store', () => ({
  usePlayroomPlayers: () => players,
}));
vi.mock('playroomkit', () => ({ myPlayer: () => undefined }));
let renderer: Awaited<ReturnType<typeof create>> | undefined;
beforeEach(() => {
  useSpectateUserStore.setState(useSpectateUserStore.getInitialState(), true);
  players[0].getState.mockReset();
});
afterEach(async () => {
  await renderer?.unmount();
  renderer = undefined;
});

it('copies remote projection and its inverse on a frame, then stops on deactivation', async () => {
  const camera = new PerspectiveCamera();
  const remote = new PerspectiveCamera(75, 2, 0.5, 500);
  const originalPosition = camera.position.clone();
  players[0].getState.mockReturnValue(remote.projectionMatrix.toArray());
  useSpectateUserStore.getState().activate('remote');
  renderer = await create(<SpectateCameraController />, { camera });
  await renderer.advanceFrames(1, 1 / 60);
  expect(camera.projectionMatrix.equals(remote.projectionMatrix)).toBe(true);
  const identity = camera.projectionMatrix.clone().multiply(camera.projectionMatrixInverse);
  identity.elements.forEach((value, i) => expect(value).toBeCloseTo(new Matrix4().elements[i]));
  expect(camera.position.equals(originalPosition)).toBe(true);
  await act(async () => useSpectateUserStore.getState().deactivate());
  const previous = camera.projectionMatrix.clone();
  players[0].getState.mockReturnValue(new Matrix4().toArray());
  await renderer.advanceFrames(1, 1 / 60);
  expect(camera.projectionMatrix.equals(previous)).toBe(true);
});

it.each(['inactive', 'missing player', 'missing projection', 'orthographic'])(
  'preserves the camera for %s',
  async (scenario) => {
    const camera = scenario === 'orthographic' ? new OrthographicCamera() : new PerspectiveCamera();
    if (scenario !== 'inactive')
      useSpectateUserStore.getState().activate(scenario === 'missing player' ? 'unknown' : 'remote');
    renderer = await create(<SpectateCameraController />, { camera });
    // R3F sizes the camera during root creation; compare subsequent frames.
    const original = camera.projectionMatrix.clone();
    await renderer.advanceFrames(2, 1 / 60);
    expect(camera.projectionMatrix.equals(original)).toBe(true);
  }
);
