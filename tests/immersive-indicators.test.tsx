// @vitest-environment jsdom
import { act, create } from '@react-three/test-renderer';
import { Mesh, MeshStandardMaterial, Vector3 } from 'three';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import RemoteImmersiveIndicators from '../src/components/visualization/rendering/remote-immersive-indicators';
import { useImmersiveViewStore } from '../src/stores/immersive-view-store';
import { useLayoutStore } from '../src/stores/layout-store';
import { useRoomConnectionStore } from '../src/utils/collaboration/room-connection';
import { fakeCollaborationService, type FakeClientRoom, type FakeServerRoom } from './fake-collaboration-service';

vi.mock('@colyseus/sdk', async () => (await import('./fake-collaboration-service')).fakeColyseusSdk());
vi.mock('../src/utils/layout-helper', () => ({
  getWorldPositionOfModel: (id: string) => (id === 'class-42' ? new Vector3(4, 1, 6) : undefined),
}));

let renderer: Awaited<ReturnType<typeof create>> | undefined;
let server: FakeServerRoom;
let me: FakeClientRoom;
let adaId: string;

beforeEach(async () => {
  fakeCollaborationService.reset();
  useRoomConnectionStore.setState(useRoomConnectionStore.getInitialState(), true);
  useImmersiveViewStore.setState(useImmersiveViewStore.getInitialState(), true);
  useLayoutStore.setState({ getLayout: () => ({ height: 2 }) as any });
  server = fakeCollaborationService.openRoom('ABCDEF', 'Ada');
  adaId = [...server.clients.keys()][0];
  await useRoomConnectionStore.getState().joinRoom('ABCDEF', 'Grace');
  me = useRoomConnectionStore.getState().room as unknown as FakeClientRoom;
});
afterEach(async () => {
  await renderer?.unmount();
  renderer = undefined;
});

const immersiveSent = () => me.sent.filter((m) => m.type === 'immersive').map((m) => m.payload);
const spheres = () =>
  renderer!.scene.findAll((node) => node.type === 'Mesh' && (node.instance as Mesh).geometry.type === 'SphereGeometry');

it('tells the Room when you enter and leave an immersive view', async () => {
  renderer = await create(<RemoteImmersiveIndicators />);

  await act(async () => useImmersiveViewStore.getState().enterImmersive('class-7', new Vector3()));
  expect(immersiveSent()).toEqual([{ entityId: 'class-7' }]);
  // The service records it.
  await act(async () =>
    server.update((state) => {
      state.participants.get(me.sessionId)!.immersiveEntityId = 'class-7';
    })
  );
  expect(immersiveSent()).toHaveLength(1);

  await act(async () => useImmersiveViewStore.getState().exitImmersive());
  expect(immersiveSent()).toEqual([{ entityId: 'class-7' }, { entityId: null }]);
});

it('tells a Room you join that you are already in an immersive view', async () => {
  await useRoomConnectionStore.getState().leaveRoom();
  useImmersiveViewStore.getState().enterImmersive('class-7', new Vector3());
  renderer = await create(<RemoteImmersiveIndicators />);

  await act(() => useRoomConnectionStore.getState().joinRoom('ABCDEF', 'Grace'));

  const rejoined = useRoomConnectionStore.getState().room as unknown as FakeClientRoom;
  expect(rejoined.sent).toEqual([{ type: 'immersive', payload: { entityId: 'class-7' } }]);
});

it("marks the entity another Participant views immersively in that Participant's color", async () => {
  renderer = await create(<RemoteImmersiveIndicators />);

  await act(async () =>
    server.update((state) => {
      state.participants.get(adaId)!.immersiveEntityId = 'class-42';
    })
  );

  expect(spheres()).toHaveLength(1);
  const material = (spheres()[0].instance as Mesh).material as MeshStandardMaterial;
  expect(`#${material.color.getHexString()}`).toBe(server.state.participants.get(adaId)!.color);

  await act(async () =>
    server.update((state) => {
      state.participants.get(adaId)!.immersiveEntityId = '';
    })
  );
  expect(spheres()).toHaveLength(0);
});

it('marks nothing for your own immersive view or an entity not on screen', async () => {
  renderer = await create(<RemoteImmersiveIndicators />);

  await act(async () =>
    server.update((state) => {
      state.participants.get(me.sessionId)!.immersiveEntityId = 'class-42';
      state.participants.get(adaId)!.immersiveEntityId = 'class-unknown';
    })
  );

  expect(spheres()).toHaveLength(0);
});
