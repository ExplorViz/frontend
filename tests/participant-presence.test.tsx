// @vitest-environment jsdom
import { useThree } from '@react-three/fiber';
import { act, create } from '@react-three/test-renderer';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect } from 'react';
import { Mesh, MeshStandardMaterial, PerspectiveCamera, Vector3 } from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CollaborationControls from '../src/components/collaboration/visualization/page-setup/sidebar/customizationbar/collaboration/collaboration-controls';
import ParticipantPresenceIndicators, {
  PresenceSender,
} from '../src/components/visualization/rendering/participant-presence';
import { PRESENCE_SMOOTHING_DELAY_MS, useShowParticipantsStore } from '../src/utils/collaboration/presence';
import { useRoomConnectionStore } from '../src/utils/collaboration/room-connection';
import { fakeCollaborationService, type FakeClientRoom, type FakeServerRoom } from './fake-collaboration-service';
import './setup-dom';

vi.mock('@colyseus/sdk', async () => (await import('./fake-collaboration-service')).fakeColyseusSdk());

let renderer: Awaited<ReturnType<typeof create>> | undefined;
let server: FakeServerRoom;
let me: FakeClientRoom;
let adaId: string;

beforeEach(async () => {
  fakeCollaborationService.reset();
  localStorage.clear();
  useShowParticipantsStore.setState({ showParticipants: true });
  useRoomConnectionStore.setState(useRoomConnectionStore.getInitialState(), true);
  server = fakeCollaborationService.openRoom('ABCDEF', 'Ada');
  adaId = [...server.clients.keys()][0];
  await useRoomConnectionStore.getState().joinRoom('ABCDEF', 'Grace');
  me = useRoomConnectionStore.getState().room as unknown as FakeClientRoom;
});
afterEach(async () => {
  vi.useRealTimers();
  await renderer?.unmount();
  renderer = undefined;
});

/** Makes these the default controls, as drei's `<CameraControls makeDefault />` does. */
function DefaultControls({ controls }: { controls: object }) {
  const set = useThree((state) => state.set);
  useEffect(() => set({ controls: controls as any }), [controls, set]);
  return null;
}

const orbitTarget = new Vector3(0, 1, -2);
const controls = { getTarget: (out: Vector3) => out.copy(orbitTarget) };

describe('sending', () => {
  const sent = () => me.sent.filter((m) => m.type === 'presence').map((m) => m.payload);

  async function renderSender(camera = new PerspectiveCamera()) {
    renderer = await create(
      <>
        <DefaultControls controls={controls} />
        <PresenceSender />
      </>,
      { camera }
    );
    return camera;
  }

  it('sends the camera position and the orbit target at most 10 times per second', async () => {
    const camera = new PerspectiveCamera();
    camera.position.set(4, 5, 6);
    await renderSender(camera);

    await renderer!.advanceFrames(1, 1 / 60);
    expect(sent()).toEqual([{ position: [4, 5, 6], target: [0, 1, -2] }]);

    // 60 frames in one second, the camera moving every frame.
    for (let i = 0; i < 60; i++) {
      camera.position.x += 1;
      await renderer!.advanceFrames(1, 1 / 60);
    }
    expect(sent().length - 1).toBe(10);
  });

  it('sends a still camera again only every 2 seconds', async () => {
    await renderSender();
    await renderer!.advanceFrames(1, 1 / 60);

    await renderer!.advanceFrames(19, 1 / 10);
    expect(sent()).toHaveLength(1);
    await renderer!.advanceFrames(1, 1 / 10);
    expect(sent()).toHaveLength(2);
  });

  it('sends at once when somebody joins, even if the camera is still', async () => {
    await renderSender();
    await renderer!.advanceFrames(1, 1 / 60);

    await act(async () => server.seat('linus', 'Linus'));
    await renderer!.advanceFrames(1, 1 / 60);

    expect(sent()).toHaveLength(2);
  });

  it('sends nothing while alone in the Room', async () => {
    await act(async () => server.update((state) => state.participants.delete(adaId)));
    await renderSender();
    await renderer!.advanceFrames(5, 1 / 5);
    expect(sent()).toEqual([]);
  });

  it('sends nothing while spectating, and again as soon as that ends', async () => {
    await act(async () =>
      server.update((state) => {
        state.participants.get(me.sessionId)!.spectating = adaId;
      })
    );
    await renderSender();
    await renderer!.advanceFrames(5, 1 / 5);
    expect(sent()).toEqual([]);

    await act(async () =>
      server.update((state) => {
        state.participants.get(me.sessionId)!.spectating = '';
      })
    );
    await renderer!.advanceFrames(1, 1 / 60);
    expect(sent()).toHaveLength(1);
  });
});

describe('markers', () => {
  const heads = () =>
    renderer!.scene.findAll(
      (node) =>
        node.type === 'Mesh' &&
        (node.instance as Mesh).geometry.type === 'SphereGeometry' &&
        (node.instance as Mesh).material instanceof MeshStandardMaterial
    );
  const headGroupOf = (sessionId: string) =>
    renderer!.scene.find((node) => node.instance.name === `presence-${sessionId}`).children[0];

  /** The service passes on Ada's Presence; it shows once the smoothing delay has passed. */
  async function receive(presence = { position: [1, 2, 3], target: [0, 0, 0] }, from = adaId) {
    me.deliver('presence', { ...presence, from });
    vi.advanceTimersByTime(PRESENCE_SMOOTHING_DELAY_MS + 1);
    await renderer!.advanceFrames(1, 1 / 60);
  }

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['performance'] });
  });

  it("marks another Participant's position in their color, looking at their target", async () => {
    renderer = await create(<ParticipantPresenceIndicators />, { camera: new PerspectiveCamera() });

    expect(heads()).toHaveLength(1);
    expect(headGroupOf(adaId).instance.visible).toBe(false);

    await receive({ position: [1, 2, 3], target: [1, 2, 13] });

    const head = headGroupOf(adaId).instance;
    expect(head.visible).toBe(true);
    expect(head.position.toArray()).toEqual([1, 2, 3]);
    // The marker's +Z, where its view cone opens, points at the target.
    const forward = new Vector3(0, 0, 1).applyQuaternion(head.quaternion);
    expect(forward.z).toBeCloseTo(1);
    const material = (heads()[0].instance as Mesh).material as MeshStandardMaterial;
    expect(`#${material.color.getHexString()}`).toBe(server.state.participants.get(adaId)!.color);
  });

  it('marks nobody who spectates, is in an immersive view, or whom you spectate, nor yourself', async () => {
    server.seat('linus', 'Linus');
    server.seat('barbara', 'Barbara');
    await act(async () =>
      server.update((state) => {
        state.participants.get('linus')!.spectating = adaId;
        state.participants.get('barbara')!.immersiveEntityId = 'class-7';
      })
    );
    renderer = await create(<ParticipantPresenceIndicators />, { camera: new PerspectiveCamera() });
    expect(heads()).toHaveLength(1);

    await act(async () =>
      server.update((state) => {
        state.participants.get(me.sessionId)!.spectating = adaId;
      })
    );
    expect(heads()).toHaveLength(0);
  });

  it('marks nobody once you switch the markers off', async () => {
    renderer = await create(<ParticipantPresenceIndicators />, { camera: new PerspectiveCamera() });
    await receive();
    expect(heads()).toHaveLength(1);

    await act(async () => useShowParticipantsStore.getState().setShowParticipants(false));

    expect(heads()).toHaveLength(0);
  });
});

describe('the switch in the room settings', () => {
  it('turns the markers off and on and is remembered in the browser', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('OK', { status: 200 }))
    );
    const user = userEvent.setup();
    render(<CollaborationControls />);
    await user.click(await screen.findByRole('button', { name: /room settings/i }));
    const toggle = screen.getByRole('checkbox', { name: /show other participants/i });
    expect(toggle).toBeChecked();

    await user.click(toggle);

    expect(toggle).not.toBeChecked();
    expect(useShowParticipantsStore.getState().showParticipants).toBe(false);
    expect(localStorage.getItem('explorviz.collaboration.showParticipants')).toBe('false');
    // Only for you: nothing is sent to the Room.
    expect(me.sent.filter((m) => m.type !== 'immersive')).toEqual([]);

    await user.click(toggle);
    expect(useShowParticipantsStore.getState().showParticipants).toBe(true);
    vi.unstubAllGlobals();
  });
});
