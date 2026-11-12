// @vitest-environment jsdom
import { act } from '@testing-library/react';
import * as THREE from 'three';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useUserSettingsStore } from '../src/stores/user-settings';
import { useRoomConnectionStore } from '../src/utils/collaboration/room-connection';
import PingMesh from '../src/utils/extended-reality/view-objects/vr/ping-mesh';
import {
  pingByModelId,
  pingPosition,
  registerPingRuntime,
  unregisterPingRuntime,
} from '../src/view-objects/3d/city/ping-animation';
import {
  fakeCollaborationService as service,
  type FakeClientRoom,
  type FakeServerRoom,
} from './fake-collaboration-service';
import './setup-dom';

vi.mock('@colyseus/sdk', async () => (await import('./fake-collaboration-service')).fakeColyseusSdk());

// Where entities are in this browser's layout.
const layout = vi.hoisted(() => new Map<string, [number, number, number]>());
vi.mock('../src/utils/layout-helper', async (original) => {
  const { Vector3 } = await import('three');
  return {
    ...(await original<object>()),
    getWorldPositionOfModel: (id: string) => {
      const position = layout.get(id);
      return position && new Vector3(...position);
    },
  };
});

let scene: THREE.Scene;

beforeEach(() => {
  service.reset();
  useRoomConnectionStore.setState(useRoomConnectionStore.getInitialState(), true);
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response('OK', { status: 200 }))
  );
  layout.clear();
  scene = new THREE.Scene();
  registerPingRuntime(new THREE.AnimationMixer(scene), scene);
});

afterEach(() => unregisterPingRuntime());

/** The pings shown in this browser: where and in which color. */
const shownPings = () =>
  scene.children.flatMap((container) =>
    container.children
      .filter((child): child is PingMesh => child instanceof PingMesh)
      .map((mesh) => ({ at: container.position.toArray(), color: `#${mesh.material.color.getHexString()}` }))
  );

const ownColor = () =>
  `#${new THREE.Color(useUserSettingsStore.getState().visualizationSettings.highlightedEntityColor.value).getHexString()}`;

async function joinAsGrace(): Promise<{ room: FakeServerRoom; me: FakeClientRoom }> {
  const room = service.openRoom('K7XQ2M', 'Ada');
  await act(() => useRoomConnectionStore.getState().joinRoom('K7XQ2M', 'Grace'));
  return { room, me: useRoomConnectionStore.getState().room as unknown as FakeClientRoom };
}

const participantColor = (room: FakeServerRoom, sessionId: string) => room.state.participants.get(sessionId)!.color;

it('shows a ping alone in the highlighting color and sends nothing', () => {
  layout.set('class-1', [1, 2, 3]);

  pingByModelId('class-1');
  pingPosition(new THREE.Vector3(4, 5, 6));

  expect(shownPings()).toEqual([
    { at: [1, 2, 3], color: ownColor() },
    { at: [4, 5, 6], color: ownColor() },
  ]);
});

it('sends a ping of an entity or a position to the Room and shows it in your Participant color', async () => {
  const { room, me } = await joinAsGrace();
  layout.set('class-1', [1, 2, 3]);

  pingByModelId('class-1');
  pingPosition(new THREE.Vector3(4, 5, 6));

  expect(me.sent).toEqual([
    { type: 'ping', payload: { entityId: 'class-1', position: [1, 2, 3] } },
    { type: 'ping', payload: { position: [4, 5, 6] } },
  ]);
  const color = participantColor(room, me.sessionId);
  expect(shownPings()).toEqual([
    { at: [1, 2, 3], color },
    { at: [4, 5, 6], color },
  ]);
});

it('does not send a ping that is only shown again', async () => {
  const { me } = await joinAsGrace();
  layout.set('class-1', [1, 2, 3]);

  pingByModelId('class-1', false);
  pingPosition(new THREE.Vector3(4, 5, 6), undefined, false);

  expect(me.sent).toEqual([]);
  expect(shownPings()).toHaveLength(2);
});

it("shows another Participant's ping in their color, at the entity where this browser has it", async () => {
  const { me } = await joinAsGrace();
  layout.set('class-1', [7, 8, 9]);

  me.deliver('ping', { entityId: 'class-1', position: [1, 2, 3], from: 'session-1', color: '#3cb44b' });
  me.deliver('ping', { entityId: '', position: [4, 5, 6], from: 'session-1', color: '#3cb44b' });
  // An entity this browser does not know is shown at the sender's position.
  me.deliver('ping', { entityId: 'unknown', position: [0, 1, 0], from: 'session-1', color: '#3cb44b' });

  expect(shownPings()).toEqual([
    { at: [7, 8, 9], color: '#3cb44b' },
    { at: [4, 5, 6], color: '#3cb44b' },
    { at: [0, 1, 0], color: '#3cb44b' },
  ]);
  expect(me.sent).toEqual([]);
});

it('stops showing pings of a Room after leaving it', async () => {
  const { me } = await joinAsGrace();
  await act(() => useRoomConnectionStore.getState().leaveRoom());

  me.deliver('ping', { entityId: '', position: [4, 5, 6], from: 'session-1', color: '#3cb44b' });

  expect(shownPings()).toEqual([]);
});
