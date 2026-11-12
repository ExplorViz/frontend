// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAnnotationHandlerStore } from '../src/stores/annotation-handler';
import { usePopupHandlerStore } from '../src/stores/popup-handler';
import { useVisualizationStore } from '../src/stores/visualization-store';
import '../src/utils/collaboration/capabilities';
import { changeDistricts, getDistricts, useDistricts } from '../src/utils/collaboration/districts';
import { useRoomConnectionStore } from '../src/utils/collaboration/room-connection';
import { fakeCollaborationService as service } from './fake-collaboration-service';
import './setup-dom';

vi.mock('@colyseus/sdk', async () => (await import('./fake-collaboration-service')).fakeColyseusSdk());

beforeEach(() => {
  service.reset();
  useRoomConnectionStore.setState(useRoomConnectionStore.getInitialState(), true);
  useVisualizationStore.setState(useVisualizationStore.getInitialState(), true);
  usePopupHandlerStore.setState(usePopupHandlerStore.getInitialState(), true);
  useAnnotationHandlerStore.setState(useAnnotationHandlerStore.getInitialState(), true);
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

async function joinRoom(code = 'K7XQ2M') {
  const room = service.rooms.get(code) ?? service.openRoom(code, 'Ada');
  await act(() => useRoomConnectionStore.getState().joinRoom(code, 'Grace'));
  return room;
}

describe('alone', () => {
  it('changes the own Districts directly', () => {
    changeDistricts([
      { type: 'close', ids: ['a', 'a.b'] },
      { type: 'hide', ids: ['a.b'] },
    ]);
    expect(shown()).toEqual({ closed: ['a', 'a.b'], hidden: ['a.b'] });

    changeDistricts([
      { type: 'open', ids: ['a'] },
      { type: 'show', ids: ['a.b'] },
    ]);
    expect(shown()).toEqual({ closed: ['a.b'], hidden: [] });

    changeDistricts([{ type: 'openAll' }]);
    expect(shown()).toEqual({ closed: [], hidden: [] });
  });

  it('renders the own Districts', () => {
    const { result } = renderHook(() => useDistricts((districts) => districts.closedDistrictIds.has('a')));
    expect(result.current).toBe(false);

    act(() => changeDistricts([{ type: 'close', ids: ['a'] }]));
    expect(result.current).toBe(true);
  });

  it('keeps the same sets when an action changes nothing', () => {
    changeDistricts([{ type: 'close', ids: ['a'] }]);
    const before = getDistricts().closedDistrictIds;

    changeDistricts([{ type: 'close', ids: ['a'] }]);
    expect(getDistricts().closedDistrictIds).toBe(before);
  });
});

describe('in a Room', () => {
  it("shows the Room's Districts, not the own ones", async () => {
    changeDistricts([{ type: 'close', ids: ['mine'] }]);
    const room = service.openRoom('K7XQ2M', 'Ada');
    room.update(roomDistricts(['a'], ['a.b']));

    const { result } = renderHook(() => useDistricts((districts) => districts.closedDistrictIds));
    await joinRoom();

    expect(shown()).toEqual({ closed: ['a'], hidden: ['a.b'] });
    expect([...result.current]).toEqual(['a']);

    room.update(roomDistricts(['a', 'c']));
    expect(shown()).toEqual({ closed: ['a', 'c'], hidden: [] });
    expect([...result.current].sort()).toEqual(['a', 'c']);
  });

  it('sends a click as one action and changes the view only after the service handled it', async () => {
    const room = await joinRoom();
    const client = room.clients.get(useRoomConnectionStore.getState().room!.sessionId)!;

    changeDistricts([
      { type: 'close', ids: ['a', 'a.b'] },
      { type: 'hide', ids: ['a.b'] },
    ]);

    expect(client.sent).toEqual([
      {
        type: 'districts',
        payload: [
          { type: 'close', ids: ['a', 'a.b'] },
          { type: 'hide', ids: ['a.b'] },
        ],
      },
    ]);
    expect(shown()).toEqual({ closed: [], hidden: [] });

    room.handleMessages();
    expect(shown()).toEqual({ closed: ['a', 'a.b'], hidden: ['a.b'] });
  });

  it('sends nothing when the action would not change the Room', async () => {
    const room = await joinRoom();
    room.update(roomDistricts(['a']));
    const client = room.clients.get(useRoomConnectionStore.getState().room!.sessionId)!;

    changeDistricts([{ type: 'close', ids: ['a'] }]);

    expect(client.sent).toEqual([]);
  });

  it('leaves the own Districts alone while in the Room', async () => {
    const room = await joinRoom();
    changeDistricts([{ type: 'close', ids: ['a'] }]);
    room.handleMessages();

    expect(useVisualizationStore.getState().closedDistrictIds.size).toBe(0);
  });
});

describe('hand-overs', () => {
  it("makes the creator's own Districts the Room's", async () => {
    changeDistricts([
      { type: 'close', ids: ['a', 'a.b'] },
      { type: 'hide', ids: ['a.b'] },
    ]);

    await act(() => useRoomConnectionStore.getState().createRoom('Ada'));

    expect(service.requests[0].options.startingState).toEqual({
      districts: { closed: ['a', 'a.b'], hidden: ['a.b'] },
    });
  });

  it('drops all local exploration state when joining', async () => {
    changeDistricts([{ type: 'close', ids: ['mine'] }]);
    useVisualizationStore.getState().actions.setHighlightedEntityId('building', true);
    useAnnotationHandlerStore.setState({ annotationData: [{ annotationId: 1 } as any] });
    usePopupHandlerStore.setState({ popupData: [{ entity: { id: 'building' } } as any] });

    await joinRoom();

    expect(useVisualizationStore.getState().closedDistrictIds.size).toBe(0);
    expect(useVisualizationStore.getState().highlightedEntityIds.size).toBe(0);
    expect(useAnnotationHandlerStore.getState().annotationData).toEqual([]);
    expect(usePopupHandlerStore.getState().popupData).toEqual([]);
  });

  it('keeps nothing joined from a refused join', async () => {
    changeDistricts([{ type: 'close', ids: ['mine'] }]);

    await act(() => useRoomConnectionStore.getState().joinRoom('ZZZZZZ', 'Grace'));

    expect(shown()).toEqual({ closed: ['mine'], hidden: [] });
  });

  it('carries on with the Districts seen in the Room after leaving', async () => {
    const room = await joinRoom();
    room.update(roomDistricts(['a'], ['a.b']));

    await act(() => useRoomConnectionStore.getState().leaveRoom());

    expect(shown()).toEqual({ closed: ['a'], hidden: ['a.b'] });
    changeDistricts([{ type: 'open', ids: ['a'] }]);
    expect(shown()).toEqual({ closed: [], hidden: ['a.b'] });
  });

  it('carries on with the Districts seen in the Room when the connection is lost', async () => {
    const room = await joinRoom();
    room.update(roomDistricts(['a']));

    act(() => (useRoomConnectionStore.getState().room as any).closed(1006));

    expect(useRoomConnectionStore.getState().room).toBeUndefined();
    expect(shown()).toEqual({ closed: ['a'], hidden: [] });
  });
});
