// @vitest-environment jsdom
import { useThree } from '@react-three/fiber';
import { act, create } from '@react-three/test-renderer';
import { useEffect } from 'react';
import { Matrix4, OrthographicCamera, PerspectiveCamera, Quaternion, Vector3 } from 'three';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import SpectateCameraController from '../src/components/visualization/rendering/spectate-camera-controller';
import { useRoomConnectionStore } from '../src/utils/collaboration/room-connection';
import { fakeCollaborationService, type FakeClientRoom, type FakeServerRoom } from './fake-collaboration-service';

vi.mock('@colyseus/sdk', async () => (await import('./fake-collaboration-service')).fakeColyseusSdk());

let renderer: Awaited<ReturnType<typeof create>> | undefined;
let server: FakeServerRoom;
let me: FakeClientRoom;
let remoteId: string;

beforeEach(async () => {
  fakeCollaborationService.reset();
  useRoomConnectionStore.setState(useRoomConnectionStore.getInitialState(), true);
  server = fakeCollaborationService.openRoom('ABCDEF', 'Ada');
  remoteId = [...server.clients.keys()][0];
  await useRoomConnectionStore.getState().joinRoom('ABCDEF', 'Grace');
  me = useRoomConnectionStore.getState().room as unknown as FakeClientRoom;
});
afterEach(async () => {
  await renderer?.unmount();
  renderer = undefined;
});

const spectate = (target: string) =>
  server.update((state) => {
    state.participants.get(me.sessionId)!.spectating = target;
  });

/** The camera of the remote Participant, as the service forwards it. */
function remoteCamera(from = remoteId) {
  const remote = new PerspectiveCamera(75, 2, 0.5, 500);
  remote.position.set(1, 2, 3);
  remote.quaternion.setFromAxisAngle(new Vector3(0, 1, 0), Math.PI / 4);
  return {
    remote,
    message: {
      position: remote.position.toArray(),
      quaternion: remote.quaternion.toArray(),
      projection: remote.projectionMatrix.toArray(),
      from,
    },
  };
}

it('copies the spectated camera, its projection and inverse on a frame, then restores the own projection on stopping', async () => {
  const camera = new PerspectiveCamera();
  renderer = await create(<SpectateCameraController />, { camera });
  const ownProjection = camera.projectionMatrix.clone();
  const { remote, message } = remoteCamera();

  await act(async () => spectate(remoteId));
  me.deliver('camera', message);
  await renderer.advanceFrames(1, 1 / 60);

  expect(camera.projectionMatrix.equals(remote.projectionMatrix)).toBe(true);
  const identity = camera.projectionMatrix.clone().multiply(camera.projectionMatrixInverse);
  identity.elements.forEach((value, i) => expect(value).toBeCloseTo(new Matrix4().elements[i]));
  expect(camera.position.equals(remote.position)).toBe(true);
  expect(camera.quaternion.equals(remote.quaternion)).toBe(true);

  await act(async () => spectate(''));
  me.deliver('camera', remoteCamera().message);
  camera.position.set(0, 0, 0);
  await renderer.advanceFrames(1, 1 / 60);
  expect(camera.projectionMatrix.equals(ownProjection)).toBe(true);
  expect(camera.position.equals(new Vector3())).toBe(true);
});

it.each(['not spectating', 'no camera yet', 'camera of someone else', 'orthographic', 'left the room'])(
  'preserves the camera for %s',
  async (scenario) => {
    const camera = scenario === 'orthographic' ? new OrthographicCamera() : new PerspectiveCamera();
    renderer = await create(<SpectateCameraController />, { camera });
    // R3F sizes the camera during root creation; compare subsequent frames.
    const original = camera.projectionMatrix.clone();
    const position = camera.position.clone();
    if (scenario !== 'not spectating') await act(async () => spectate(remoteId));
    if (scenario === 'orthographic') me.deliver('camera', remoteCamera().message);
    if (scenario === 'camera of someone else') me.deliver('camera', remoteCamera('someone-else').message);
    if (scenario === 'left the room') {
      me.deliver('camera', remoteCamera().message);
      await act(async () => useRoomConnectionStore.getState().leaveRoom());
    }
    await renderer.advanceFrames(2, 1 / 60);
    expect(camera.projectionMatrix.equals(original)).toBe(true);
    expect(camera.position.equals(position)).toBe(true);
  }
);

/** Makes these the default controls, as drei's `<CameraControls makeDefault />` does. */
function DefaultControls({ controls }: { controls: object }) {
  const set = useThree((state) => state.set);
  useEffect(() => set({ controls: controls as any }), [controls, set]);
  return null;
}

it('takes camera control from the own controls while spectating and hands it back after', async () => {
  const controls = {
    enabled: true,
    getPosition: (out: Vector3) => out.set(7, 8, 9),
    getTarget: (out: Vector3) => out.set(0, 0, 0),
    setLookAt: vi.fn(),
  };
  renderer = await create(
    <>
      <DefaultControls controls={controls} />
      <SpectateCameraController />
    </>,
    { camera: new PerspectiveCamera() }
  );

  await act(async () => spectate(remoteId));
  expect(controls.enabled).toBe(false);
  expect(controls.setLookAt).not.toHaveBeenCalled();
  await act(async () => spectate(''));
  expect(controls.enabled).toBe(true);
  // Back to where you were before spectating.
  expect(controls.setLookAt).toHaveBeenCalledWith(7, 8, 9, 0, 0, 0, false);
});

const sentCameras = () => me.sent.filter((m) => m.type === 'camera').map((m) => m.payload);

it('sends nothing while nobody spectates', async () => {
  const camera = new PerspectiveCamera();
  renderer = await create(<SpectateCameraController />, { camera });
  for (let i = 0; i < 10; i++) {
    camera.position.x = i;
    await renderer.advanceFrames(1, 1 / 10);
  }
  expect(sentCameras()).toEqual([]);
});

it('sends its camera to spectators at most 30 times per second and only when it changed', async () => {
  const camera = new PerspectiveCamera();
  camera.position.set(4, 5, 6);
  renderer = await create(<SpectateCameraController />, { camera });
  await act(async () =>
    server.update((state) => {
      state.participants.get(remoteId)!.spectating = me.sessionId;
    })
  );

  await renderer.advanceFrames(1, 1 / 60);
  expect(sentCameras()).toEqual([
    {
      position: [4, 5, 6],
      quaternion: new Quaternion().toArray(),
      projection: camera.projectionMatrix.toArray(),
    },
  ]);

  // 60 frames in one second, the camera moving every frame.
  for (let i = 0; i < 60; i++) {
    camera.position.x += 1;
    await renderer.advanceFrames(1, 1 / 60);
  }
  expect(sentCameras().length - 1).toBe(30);

  // A still camera is not sent again.
  const count = sentCameras().length;
  await renderer.advanceFrames(30, 1 / 30);
  expect(sentCameras().length).toBe(count);
});

it('sends a still camera once more when another Participant starts spectating', async () => {
  const camera = new PerspectiveCamera();
  renderer = await create(<SpectateCameraController />, { camera });
  const third = server.seat('session-third', 'Linus');
  const spectatedBy = (sessionId: string) =>
    act(async () =>
      server.update((state) => {
        state.participants.get(sessionId)!.spectating = me.sessionId;
      })
    );

  await spectatedBy(remoteId);
  await renderer.advanceFrames(10, 1 / 60);
  expect(sentCameras()).toHaveLength(1);

  await spectatedBy(third.sessionId);
  await renderer.advanceFrames(10, 1 / 60);
  expect(sentCameras()).toHaveLength(2);
});
