// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useVisualizationStore } from '../src/stores/visualization-store';
import '../src/utils/collaboration/capabilities';
import {
  changeDistricts,
  getDistricts,
  setDistrictSharing,
  useDistricts,
  useDistrictSharing,
} from '../src/utils/collaboration/districts';
import { useRoomConnectionStore } from '../src/utils/collaboration/room-connection';
import { fakeCollaborationService as service } from './fake-collaboration-service';
import './setup-dom';

vi.mock('@colyseus/sdk', async () => (await import('./fake-collaboration-service')).fakeColyseusSdk());

beforeEach(() => {
  service.reset();
  useRoomConnectionStore.setState(useRoomConnectionStore.getInitialState(), true);
  useVisualizationStore.setState(useVisualizationStore.getInitialState(), true);
});

const shown = () => {
  const { closedDistrictIds, hiddenDistrictIds } = getDistricts();
  return { closed: [...closedDistrictIds].sort(), hidden: [...hiddenDistrictIds].sort() };
};

const roomDistricts =
  (closed: string[], hidden: string[] = []) =>
  (state: any) => {
    state.districts.closed.clear();
    state.districts.hidden.clear();
    for (const id of closed) state.districts.closed.set(id, true);
    for (const id of hidden) state.districts.hidden.set(id, true);
  };
const sharing = (shared: boolean) => (state: any) => {
  state.districts.shared = shared;
};

async function joinRoom(code = 'K7XQ2M') {
  const room = service.rooms.get(code) ?? service.openRoom(code, 'Ada');
  await act(() => useRoomConnectionStore.getState().joinRoom(code, 'Grace'));
  return room;
}

describe('switching District sharing off', () => {
  it("changes nobody's view: the Room's Districts become the own ones", async () => {
    const room = await joinRoom();
    room.update(roomDistricts(['a'], ['a.b']));
    const { result } = renderHook(() => useDistricts((districts) => districts.closedDistrictIds));

    room.update(sharing(false));

    expect(shown()).toEqual({ closed: ['a'], hidden: ['a.b'] });
    expect([...result.current]).toEqual(['a']);
    expect([...useVisualizationStore.getState().closedDistrictIds]).toEqual(['a']);
  });
});

describe('while District sharing is off', () => {
  it("changes only the person's own view on a click", async () => {
    const room = await joinRoom();
    room.update(roomDistricts(['a']));
    room.update(sharing(false));
    const client = room.clients.get(useRoomConnectionStore.getState().room!.sessionId)!;
    const { result } = renderHook(() => useDistricts((districts) => districts.closedDistrictIds.has('b')));

    act(() => changeDistricts([{ type: 'close', ids: ['b'] }]));

    expect(client.sent).toEqual([]);
    expect(shown()).toEqual({ closed: ['a', 'b'], hidden: [] });
    expect(result.current).toBe(true);
  });

  it('does not follow changes of the Room', async () => {
    const room = await joinRoom();
    room.update(sharing(false));

    room.update(roomDistricts(['x']));

    expect(shown()).toEqual({ closed: [], hidden: [] });
  });

  it('starts someone joining with all Districts open', async () => {
    changeDistricts([{ type: 'close', ids: ['mine'] }]);
    const room = service.openRoom('K7XQ2M', 'Ada');
    room.update(roomDistricts(['stale'], ['stale.b']));
    room.update(sharing(false));

    await joinRoom();

    expect(shown()).toEqual({ closed: [], hidden: [] });
  });

  it('carries on with the own Districts after leaving', async () => {
    const room = await joinRoom();
    room.update(sharing(false));
    changeDistricts([{ type: 'close', ids: ['mine'] }]);
    room.update(roomDistricts(['x']));

    await act(() => useRoomConnectionStore.getState().leaveRoom());

    expect(shown()).toEqual({ closed: ['mine'], hidden: [] });
  });
});

describe('the Host switching District sharing', () => {
  async function createRoom() {
    await act(() => useRoomConnectionStore.getState().createRoom('Ada'));
    const clientRoom = useRoomConnectionStore.getState().room!;
    const room = service.rooms.get(clientRoom.roomId)!;
    return { room, client: room.clients.get(clientRoom.sessionId)! };
  }

  it('is on by default and shown to everyone', async () => {
    const { result } = renderHook(() => useDistrictSharing());
    const room = await joinRoom();
    expect(result.current).toBe(true);

    room.update(sharing(false));
    expect(result.current).toBe(false);
  });

  it('asks the service to switch it off, and the view stays', async () => {
    const { room, client } = await createRoom();
    room.update(roomDistricts(['a']));

    setDistrictSharing(false);
    expect(client.sent).toEqual([{ type: 'districtSharing', payload: { shared: false } }]);
    room.handleMessages();

    expect(shown()).toEqual({ closed: ['a'], hidden: [] });
  });

  it("switches it on with the Host's own Districts, and everyone's view jumps to them", async () => {
    const { room, client } = await createRoom();
    room.update(sharing(false));
    changeDistricts([{ type: 'close', ids: ['mine'] }]);

    setDistrictSharing(true);
    expect(client.sent).toEqual([
      { type: 'districtSharing', payload: { shared: true, districts: { closed: ['mine'], hidden: [] } } },
    ]);
    room.handleMessages();
    room.update(roomDistricts(['mine', 'theirs']));

    expect(shown()).toEqual({ closed: ['mine', 'theirs'], hidden: [] });
  });

  it("makes a guest's view jump to the Room's Districts when switched on", async () => {
    const room = await joinRoom();
    room.update(sharing(false));
    changeDistricts([{ type: 'close', ids: ['own'] }]);

    room.update((state) => {
      roomDistricts(['host'])(state);
      state.districts.shared = true;
    });

    expect(shown()).toEqual({ closed: ['host'], hidden: [] });
  });
});
