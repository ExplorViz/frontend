// @vitest-environment jsdom
import { act } from '@testing-library/react';
import { beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest';
import { useLandscapeTokenStore, type LandscapeToken } from '../src/stores/landscape-token';
import { useVisualizationStore } from '../src/stores/visualization-store';
import '../src/utils/collaboration/capabilities';
import { useRoomConnectionStore } from '../src/utils/collaboration/room-connection';
import eventEmitter from '../src/utils/event-emitter';
import { fakeCollaborationService as service, type FakeServerRoom } from './fake-collaboration-service';
import './setup-dom';

vi.mock('@colyseus/sdk', async () => (await import('./fake-collaboration-service')).fakeColyseusSdk());

const landscape = (value: string): LandscapeToken => ({
  value,
  alias: `Landscape ${value.toUpperCase()}`,
  created: 1,
  ownerId: 'someone',
  sharedUsersIds: [],
  isRequestedFromVSCodeExtension: false,
  projectName: '',
  commitId: '',
});

/** The Landscapes the person may open, as the user service lists them. */
const MY_LANDSCAPES = [landscape('a'), landscape('b'), landscape('c')];

beforeEach(() => {
  service.reset();
  useRoomConnectionStore.setState(useRoomConnectionStore.getInitialState(), true);
  useVisualizationStore.setState(useVisualizationStore.getInitialState(), true);
  useLandscapeTokenStore.setState(
    { ...useLandscapeTokenStore.getInitialState(), token: null, retrieveTokens: async () => MY_LANDSCAPES },
    true
  );
});

const openLandscape = (value: string) => act(() => useLandscapeTokenStore.getState().setToken(landscape(value)));
const loaded = () => useLandscapeTokenStore.getState().token;

const onLandscape = (value: string) => (state: any) => {
  state.landscapeToken = value;
};

async function createRoom() {
  await act(() => useRoomConnectionStore.getState().createRoom('Ada'));
  return service.rooms.get('ROOM01')!;
}

async function joinRoom(roomLandscape: string) {
  const room = service.openRoom('K7XQ2M', 'Ada');
  room.update(onLandscape(roomLandscape));
  await act(() => useRoomConnectionStore.getState().joinRoom('K7XQ2M', 'Grace'));
  return room;
}

function collectToasts() {
  const toasts: { type: string; message: string }[] = [];
  const listener = (type: string, message: string) => toasts.push({ type, message });
  eventEmitter.on('newToastMessage', listener);
  onTestFinished(() => eventEmitter.off('newToastMessage', listener));
  return toasts;
}

const switchesSent = (room: FakeServerRoom) =>
  [...room.clients.values()].flatMap((client) => client.sent.filter((message) => message.type === 'switchLandscape'));

describe('creating a Room', () => {
  it('makes the own Landscape the Room’s', async () => {
    openLandscape('a');
    await createRoom();

    expect(service.requests[0].options.startingState.landscapeToken).toBe('a');
  });
});

describe('joining a Room', () => {
  it('on another Landscape loads the Room’s Landscape', async () => {
    openLandscape('a');
    await joinRoom('b');

    await vi.waitFor(() => expect(loaded()).toEqual(landscape('b')));
  });

  it('on the same Landscape keeps it', async () => {
    openLandscape('a');
    const before = loaded();
    await joinRoom('a');

    expect(loaded()).toBe(before);
  });

  it('loads the Room’s Landscape even when the person’s own list does not have it', async () => {
    openLandscape('a');
    await joinRoom('elsewhere');

    await vi.waitFor(() => expect(loaded()?.value).toBe('elsewhere'));
  });
});

describe('the Host', () => {
  it('switches the Room’s Landscape by opening another one', async () => {
    openLandscape('a');
    const room = await createRoom();
    room.update((state) => state.districts.closed.set('a.x', true));

    openLandscape('b');
    expect(switchesSent(room)).toEqual([
      { type: 'switchLandscape', payload: { landscapeToken: 'b', landscapeName: 'Landscape B' } },
    ]);

    room.handleMessages();
    expect(room.state.landscapeToken).toBe('b');
    expect(room.state.districts.closed.size).toBe(0);
    expect(loaded()?.value).toBe('b');
  });

  it('is not switched back while the switch is on its way', async () => {
    openLandscape('a');
    const room = await createRoom();

    openLandscape('b');
    // Other changes of the Room arrive before the switch.
    room.update(() => room.appendChatEntry({ authorId: '', authorName: 'Grace', text: 'hi' }));
    room.update((state) => state.districts.closed.set('a.x', true));

    expect(loaded()?.value).toBe('b');
  });

  it('sends nothing when leaving the Landscape for the Landscape selection', async () => {
    openLandscape('a');
    const room = await createRoom();

    act(() => useLandscapeTokenStore.getState().setToken(null));

    expect(switchesSent(room)).toEqual([]);
  });
});

describe('everyone else', () => {
  it('loads the new Landscape when the Host switches it', async () => {
    openLandscape('a');
    const room = await joinRoom('a');

    room.update(onLandscape('c'));

    await vi.waitFor(() => expect(loaded()).toEqual(landscape('c')));
  });

  it('is taken back to the Room’s Landscape when opening another one, and told why', async () => {
    const toasts = collectToasts();
    openLandscape('a');
    const room = await joinRoom('a');

    openLandscape('b');

    await vi.waitFor(() => expect(loaded()?.value).toBe('a'));
    expect(switchesSent(room)).toEqual([]);
    expect(toasts).toEqual([{ type: 'info', message: 'Only the Host can switch the Landscape of the room.' }]);
  });
});

describe('leaving a Room', () => {
  it('stays on the Room’s Landscape and switches alone again', async () => {
    openLandscape('a');
    const room = await joinRoom('b');
    await vi.waitFor(() => expect(loaded()?.value).toBe('b'));

    await act(() => useRoomConnectionStore.getState().leaveRoom());
    room.update(onLandscape('c'));
    openLandscape('a');

    expect(loaded()?.value).toBe('a');
  });
});
