// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { usePopupHandlerStore } from '../src/stores/popup-handler';
import { useModelStore } from '../src/stores/repos/model-repository';
import '../src/utils/collaboration/capabilities';
import {
  addPopup,
  getPopup,
  getPopups,
  removePopup,
  sharePopup,
  updatePopup,
  usePopups,
} from '../src/utils/collaboration/popups';
import { useRoomConnectionStore } from '../src/utils/collaboration/room-connection';
import { fakeCollaborationService as service, type FakeServerRoom } from './fake-collaboration-service';
import { building, city, district } from './fixtures/landscape';
import './setup-dom';

vi.mock('@colyseus/sdk', async () => (await import('./fake-collaboration-service')).fakeColyseusSdk());

beforeEach(() => {
  service.reset();
  useRoomConnectionStore.setState(useRoomConnectionStore.getInitialState(), true);
  usePopupHandlerStore.setState(usePopupHandlerStore.getInitialState(), true);
  useModelStore.getState().setAllModels({
    cities: [city],
    districts: [district],
    buildings: [building],
    buildingCommunications: [],
  });
});

/** The popups that are shown: entity id and who shared it ("" for an own one). */
const shown = () => getPopups().map((popup) => [popup.entityId, popup.sharedBy || '']);

const open = (entityId: string) => act(() => addPopup({ entityId, position: { x: 10, y: 20 } }));

/** Opens and pins a popup, as one must before sharing it. */
function openPinned(entityId: string) {
  open(entityId);
  act(() => usePopupHandlerStore.getState().pinPopup(getPopup(entityId)!));
}

async function createRoom() {
  await act(() => useRoomConnectionStore.getState().createRoom('Ada'));
  return service.rooms.get('ROOM01')!;
}

async function joinRoom(code = 'K7XQ2M') {
  const room = service.rooms.get(code) ?? service.openRoom(code, 'Ada');
  await act(() => useRoomConnectionStore.getState().joinRoom(code, 'Grace'));
  return room;
}

const sharedIn = (room: FakeServerRoom) => Object.keys(room.state.popups.toJSON());

/** Ada, who opened the Room, shares her popup of this entity. */
function sharedBySomeoneElse(room: FakeServerRoom, entityId: string) {
  room.inbox.push({ from: 'session-1', type: 'sharePopup', payload: { entityId } });
  room.handleMessages();
}

describe('popups in a Room', () => {
  it('opening one stays local: nothing is sent', async () => {
    const room = await joinRoom();

    open('building');

    expect(shown()).toEqual([['building', '']]);
    expect(room.inbox).toEqual([]);
  });

  it('sharing one makes it the Room’s, and it shows who shared it', async () => {
    const room = await joinRoom();
    openPinned('building');

    act(() => sharePopup(getPopup('building')!));
    expect(room.inbox).toEqual([{ from: 'session-2', type: 'sharePopup', payload: { entityId: 'building' } }]);
    room.handleMessages();

    expect(sharedIn(room)).toEqual(['building']);
    expect(shown()).toEqual([['building', 'Grace']]);
  });

  it('shows a popup someone else shared, pinned, with who shared it', async () => {
    const room = await joinRoom();

    sharedBySomeoneElse(room, 'district');

    expect(shown()).toEqual([['district', 'Ada']]);
    expect(getPopup('district')!.isPinned).toBe(true);
  });

  it('renders shared popups for rendering code too', async () => {
    const room = await joinRoom();
    const { result } = renderHook(() => usePopups().map((popup) => [popup.entityId, popup.sharedBy || '']));
    open('building');

    sharedBySomeoneElse(room, 'district');

    expect(result.current).toEqual([
      ['building', ''],
      ['district', 'Ada'],
    ]);
  });

  it('closing a shared popup closes it for everyone, once the service has handled it', async () => {
    const room = await joinRoom();
    sharedBySomeoneElse(room, 'district');
    act(() => updatePopup({ ...getPopup('district')!, mouseX: 300, mouseY: 400, wasMoved: true }));

    act(() => removePopup('district'));
    expect(shown()).toEqual([['district', 'Ada']]);
    room.handleMessages();

    expect(sharedIn(room)).toEqual([]);
    expect(shown()).toEqual([]);
    expect(usePopupHandlerStore.getState().popupData).toEqual([]);
  });

  it('clicking the entity of a shared popup again closes it for everyone', async () => {
    const room = await joinRoom();
    sharedBySomeoneElse(room, 'district');

    open('district');
    room.handleMessages();

    expect(sharedIn(room)).toEqual([]);
  });

  it('closing an unshared popup affects only yourself', async () => {
    const room = await joinRoom();
    sharedBySomeoneElse(room, 'district');
    open('building');

    act(() => removePopup('building'));

    expect(shown()).toEqual([['district', 'Ada']]);
    expect(room.inbox).toEqual([]);
  });

  it('where a shared popup sits is up to each person', async () => {
    const room = await joinRoom();
    sharedBySomeoneElse(room, 'district');

    act(() => updatePopup({ ...getPopup('district')!, mouseX: 300, mouseY: 400, wasMoved: true }));

    expect(getPopup('district')).toMatchObject({ mouseX: 300, mouseY: 400, wasMoved: true, sharedBy: 'Ada' });
    expect(room.inbox).toEqual([]);
  });

  it('the creator’s open popups stay their own when the Room is created', async () => {
    openPinned('building');

    const room = await createRoom();

    expect(shown()).toEqual([['building', '']]);
    expect(sharedIn(room)).toEqual([]);
    expect(service.requests[0].options.startingState.popups).toBeUndefined();
  });

  it('joining drops the own popups and shows the Room’s shared ones', async () => {
    const room = service.openRoom('K7XQ2M', 'Ada');
    sharedBySomeoneElse(room, 'district');
    openPinned('building');

    await joinRoom();

    expect(shown()).toEqual([['district', 'Ada']]);
  });

  it('after leaving, the shared popups stay open as your own', async () => {
    const room = await joinRoom();
    sharedBySomeoneElse(room, 'district');
    open('building');

    await act(() => useRoomConnectionStore.getState().leaveRoom());

    expect(shown()).toEqual([
      ['building', ''],
      ['district', ''],
    ]);
    act(() => removePopup('district'));
    expect(shown()).toEqual([['building', '']]);
  });

  it('a Landscape switch clears the shared popups', async () => {
    const room = await createRoom();
    openPinned('building');
    act(() => sharePopup(getPopup('building')!));
    room.handleMessages();

    room.update((state: any) => (state.landscapeToken = 'other'));
    act(() => useRoomConnectionStore.getState().room!.send('switchLandscape', { landscapeToken: 'next' }));
    room.handleMessages();

    expect(sharedIn(room)).toEqual([]);
    expect(shown()).toEqual([]);
  });
});

describe('popups alone', () => {
  it('cannot be shared: there is nobody to share with', () => {
    openPinned('building');

    act(() => sharePopup(getPopup('building')!));

    expect(shown()).toEqual([['building', '']]);
  });

  it('open and close as the own state', () => {
    open('building');
    open('district');
    expect(shown()).toEqual([['district', '']]);

    act(() => removePopup('district'));
    expect(shown()).toEqual([]);
  });
});
