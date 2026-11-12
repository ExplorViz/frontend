// @vitest-environment jsdom
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LeaveRoomForSnapshotNotice from '../src/components/collaboration/leave-room-for-snapshot-notice';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAnnotationHandlerStore } from '../src/stores/annotation-handler';
import { useAuthStore } from '../src/stores/auth';
import { useRoomSerializerStore } from '../src/stores/collaboration/room-serializer';
import { useLandscapeTokenStore } from '../src/stores/landscape-token';
import { usePopupHandlerStore } from '../src/stores/popup-handler';
import { useModelStore } from '../src/stores/repos/model-repository';
import { useVisualizationStore } from '../src/stores/visualization-store';
import { closeDistrictsByList } from '../src/utils/city-rendering/entity-manipulation';
import { highlightById } from '../src/utils/city-rendering/highlighting';
import { addAnnotation } from '../src/utils/collaboration/annotations';
import { applySerializedRoomState } from '../src/utils/snapshot/snapshot-helpers';
import '../src/utils/collaboration/capabilities';
import { addPopup } from '../src/utils/collaboration/popups';
import { useRoomConnectionStore } from '../src/utils/collaboration/room-connection';
import { leaveRoomToOpenSnapshot } from '../src/utils/collaboration/snapshots';
import { fakeCollaborationService as service, type FakeServerRoom } from './fake-collaboration-service';
import { building, city, district } from './fixtures/landscape';
import './setup-dom';

vi.mock('@colyseus/sdk', async () => (await import('./fake-collaboration-service')).fakeColyseusSdk());

beforeEach(() => {
  service.reset();
  useRoomConnectionStore.setState(useRoomConnectionStore.getInitialState(), true);
  useVisualizationStore.setState(useVisualizationStore.getInitialState(), true);
  usePopupHandlerStore.setState(usePopupHandlerStore.getInitialState(), true);
  useAnnotationHandlerStore.setState(useAnnotationHandlerStore.getInitialState(), true);
  useAuthStore.setState({ user: { name: 'Grace Hopper', nickname: 'grace', sub: 'grace-1' } as any });
  useLandscapeTokenStore.setState({ token: null, retrieveTokens: async () => [] } as any);
  useModelStore.getState().setAllModels({
    cities: [city],
    districts: [district],
    buildings: [building],
    buildingCommunications: [],
  });
});

async function joinRoom(code = 'K7XQ2M') {
  const room = service.rooms.get(code) ?? service.openRoom(code, 'Ada');
  await act(() => useRoomConnectionStore.getState().joinRoom(code, 'Grace'));
  return room;
}

const annotate = (entityId: string) =>
  act(() =>
    addAnnotation({
      annotationId: undefined,
      entityId,
      position: { x: 300, y: 400 },
      hovered: false,
      annotationTitle: 'Mine',
      annotationText: 'text',
      sharedBy: '',
      owner: 'Grace Hopper',
      shared: false,
      inEdit: false,
      lastEditor: undefined,
      wasMoved: true,
    })
  );

const snapshotOf = () => useRoomSerializerStore.getState().serializeRoom(true);

/** What a Snapshot holds of the exploration, without layout details. */
const exploration = () => {
  const saved = snapshotOf();
  return {
    closed: [...saved.closedComponentIds].sort(),
    highlighted: saved.highlightedEntities.map((highlight) => highlight.entityId).sort(),
    popups: saved.popups.map((popup) => popup.entityId),
    annotations: saved.annotations.map((annotation) => [annotation.entityId, annotation.annotationTitle]),
  };
};

describe('saving a Snapshot', () => {
  it('alone, saves the own exploration', async () => {
    act(() => closeDistrictsByList(['district']));
    act(() => highlightById('building'));
    act(() => addPopup({ entityId: 'building', position: { x: 10, y: 20 } }));
    await annotate('district');

    expect(exploration()).toEqual({
      closed: ['district'],
      highlighted: ['building'],
      popups: ['building'],
      annotations: [['district', 'Mine']],
    });
  });

  it("in a Room, saves the Room's exploration as the person sees it", async () => {
    act(() => highlightById('city'));
    const room: FakeServerRoom = await joinRoom();
    room.update((state: any) => {
      state.districts.closed.set('district', true);
      state.highlights.set('building', 'session-1');
      room.putAnnotation({ id: 7, entityId: 'district', title: 'Theirs', creatorName: 'Ada' });
    });
    room.inbox.push({ from: 'session-1', type: 'sharePopup', payload: { entityId: 'building' } });
    room.handleMessages();

    expect(exploration()).toEqual({
      closed: ['district'],
      highlighted: ['building'],
      popups: ['building'],
      annotations: [['district', 'Theirs']],
    });
  });

  it('in a Room with District sharing off, saves the own Districts', async () => {
    const room: FakeServerRoom = await joinRoom();
    room.update((state: any) => {
      state.districts.closed.set('district', true);
      state.districts.shared = false;
    });
    room.update((state: any) => state.districts.closed.clear());

    expect(exploration().closed).toEqual(['district']);
  });
});

describe('a Room created after opening a Snapshot', () => {
  it("starts from the Snapshot's exploration", async () => {
    act(() =>
      applySerializedRoomState({
        landscape: { landscapeToken: 'a', timestamp: 1 },
        closedComponentIds: ['district'],
        highlightedEntities: [{ userId: 'someone', entityId: 'building' }],
        popups: [],
        annotations: [
          {
            objectId: null,
            annotationId: 3,
            userId: '',
            entityId: 'district',
            menuId: null,
            annotationText: 'from the Snapshot',
            annotationTitle: 'Saved',
            owner: 'Ada',
            shared: false,
            inEdit: false,
            lastEditor: 'Ada',
            mouseX: 10,
            mouseY: 20,
            wasMoved: true,
            hidden: false,
            minimized: false,
          },
        ],
      } as any)
    );

    await act(() => useRoomConnectionStore.getState().createRoom('Grace'));

    const starting = service.requests[0].options.startingState;
    expect(starting.districts.closed).toEqual(['district']);
    expect(starting.highlights).toEqual(['building']);
    expect(starting.annotations).toEqual([
      expect.objectContaining({ entityId: 'district', title: 'Saved', text: 'from the Snapshot' }),
    ]);
  });
});

const SNAPSHOT = {
  landscape: { landscapeToken: 'a', timestamp: 1 },
  closedComponentIds: ['district'],
  highlightedEntities: [{ userId: 'someone', entityId: 'building' }],
  popups: [],
  annotations: [],
} as any;

describe('opening a Snapshot', () => {
  it('alone, opens it without asking', async () => {
    render(<LeaveRoomForSnapshotNotice />);

    await expect(leaveRoomToOpenSnapshot()).resolves.toBe(true);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('in a Room, asks to leave first and opens it once left', async () => {
    const room = await joinRoom();
    render(<LeaveRoomForSnapshotNotice />);

    let opened: Promise<boolean>;
    act(() => {
      opened = leaveRoomToOpenSnapshot();
    });
    expect(await screen.findByRole('dialog')).toHaveTextContent(/leave the room/i);

    await userEvent.click(screen.getByRole('button', { name: /leave the room and open/i }));

    await expect(opened!).resolves.toBe(true);
    expect(useRoomConnectionStore.getState().room).toBeUndefined();
    expect(room.clients.size).toBe(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('in a Room, staying in it does not open the Snapshot', async () => {
    await joinRoom();
    render(<LeaveRoomForSnapshotNotice />);

    let opened: Promise<boolean>;
    act(() => {
      opened = leaveRoomToOpenSnapshot();
    });
    await userEvent.click(await screen.findByRole('button', { name: /stay in the room/i }));

    await expect(opened!).resolves.toBe(false);
    expect(useRoomConnectionStore.getState().room).toBeDefined();
  });

  it('is never loaded into the Room', async () => {
    const room = await joinRoom();

    act(() => applySerializedRoomState(SNAPSHOT));
    room.handleMessages();

    const sent = [...room.clients.values()].flatMap((client) => client.sent);
    expect(sent).toEqual([]);
    expect(room.state.districts.closed.size).toBe(0);
    expect(room.state.highlights.size).toBe(0);
  });

  it('that was waiting for its Landscape is dropped when a Room is joined', async () => {
    act(() => useRoomSerializerStore.getState().setSerializedRoom(SNAPSHOT));

    await joinRoom();

    expect(useRoomSerializerStore.getState().serializedRoom).toBeUndefined();
  });
});
