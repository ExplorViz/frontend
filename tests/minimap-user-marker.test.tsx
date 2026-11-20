// @vitest-environment jsdom
import { act, create } from '@react-three/test-renderer';
import { Mesh, MeshBasicMaterial, Scene, Vector3 } from 'three';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import LocalUserMarker from '../src/components/visualization/rendering/minimap-user-marker';
import { useRoomConnectionStore } from '../src/utils/collaboration/room-connection';
import { fakeCollaborationService, type FakeServerRoom } from './fake-collaboration-service';

vi.mock('@colyseus/sdk', async () => (await import('./fake-collaboration-service')).fakeColyseusSdk());

let renderer: Awaited<ReturnType<typeof create>> | undefined;
let server: FakeServerRoom;
const minimapScene = new Scene();
const controls = { current: { getTarget: (out: Vector3) => out.set(0, 0, 0), azimuthAngle: 0 } } as any;
const anchor = { current: null } as any;

beforeEach(() => {
  fakeCollaborationService.reset();
  useRoomConnectionStore.setState(useRoomConnectionStore.getInitialState(), true);
  server = fakeCollaborationService.openRoom('ABCDEF', 'Ada');
});
afterEach(async () => {
  await renderer?.unmount();
  renderer = undefined;
});

/** The colors of the marker's meshes in the minimap scene, as CSS hex colors. */
function markerColors() {
  const marker = minimapScene.getObjectByName('minimap-user-marker')!;
  const colors: string[] = [];
  marker.traverse((object) => {
    if (object instanceof Mesh) colors.push(`#${(object.material as MeshBasicMaterial).color.getHexString()}`);
  });
  return colors;
}

it('is red while exploring alone and takes your Participant color in a Room', async () => {
  renderer = await create(
    <LocalUserMarker minimapScene={minimapScene} mainCameraControls={controls} markerAnchorRef={anchor} />
  );
  expect(markerColors()).toEqual(['#ff0000', '#ff0000']);

  await act(() => useRoomConnectionStore.getState().joinRoom('ABCDEF', 'Grace'));
  const sessionId = useRoomConnectionStore.getState().room!.sessionId;
  const ownColor = server.state.participants.get(sessionId)!.color;
  expect(markerColors()).toEqual([ownColor, ownColor]);

  // A color you pick in the Participants list follows.
  await act(async () =>
    server.update((state) => {
      state.participants.get(sessionId)!.color = '#123456';
    })
  );
  expect(markerColors()).toEqual(['#123456', '#123456']);

  await act(() => useRoomConnectionStore.getState().leaveRoom());
  expect(markerColors()).toEqual(['#ff0000', '#ff0000']);
});
