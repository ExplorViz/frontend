import { useMemo } from 'react';

import PopupData from 'explorviz-frontend/src/components/visualization/rendering/popups/popup-data';
import { usePopupHandlerStore } from 'explorviz-frontend/src/stores/popup-handler';
import { useModelStore } from 'explorviz-frontend/src/stores/repos/model-repository';
import {
  registerHandOver,
  useRoomConnectionStore,
  useRoomStatePart,
} from 'explorviz-frontend/src/utils/collaboration/room-connection';
import type { ClientMessages } from 'explorviz-frontend/src/utils/collaboration/room-contract.generated';

/*
 * The collaboration module for popups.
 *
 * A popup is the person's own until they share it; a shared popup is the
 * Room's, and everyone in the Room has it open. Which popups are shared, and
 * by whom, is read directly from the Room's state; it is never copied into
 * the popup store. Where a popup sits on the screen, whether it was moved and
 * the file details it loaded stay with each person, shared or not.
 *
 * The popup store (`usePopupHandlerStore.popupData`) holds the own popups.
 * In a Room it also holds the screen layout of shared popups the person has
 * open; such an entry shows the shared popup, it does not make it shared.
 * Only this module writes the popup store, apart from resets of the own
 * state (page reset, Snapshot restore).
 */

type AddPopupArgs = Parameters<ReturnType<typeof usePopupHandlerStore.getState>['addPopup']>[0];

/** A shared popup as the Room holds it: entity id -> who shared it. */
type SharedPopups = ReadonlyMap<string, { sharedByName: string }>;

const NOT_SHARED: SharedPopups = new Map();

const currentRoom = () => useRoomConnectionStore.getState().room;

/** The shared popups of the joined Room, from its decoded state. */
function roomSharedPopups(): SharedPopups {
  return (currentRoom()?.state.popups as SharedPopups | undefined) ?? NOT_SHARED;
}

/** The popups to show: the own ones, and every shared one with this person's layout of it. */
function shownPopups(own: PopupData[], shared: SharedPopups, getModel = useModelStore.getState().getModel) {
  if (shared.size === 0) return own;
  const shown = own.map((popup) => {
    const sharedPopup = shared.get(popup.entityId);
    return sharedPopup ? { ...popup, isPinned: true, sharedBy: sharedPopup.sharedByName } : popup;
  });
  for (const [entityId, { sharedByName }] of shared) {
    if (own.some((popup) => popup.entityId === entityId)) continue;
    const popup = defaultLayout(entityId, shown.length, getModel);
    if (popup) shown.push({ ...popup, sharedBy: sharedByName });
  }
  return shown;
}

/** A pinned popup of this entity where newly appearing popups are stacked, or undefined if the entity is unknown. */
function defaultLayout(entityId: string, index: number, getModel = useModelStore.getState().getModel) {
  const entity = getModel(entityId);
  if (!entity) return undefined;
  return new PopupData({
    mouseX: 100,
    mouseY: 200 + index * 50,
    entityId,
    entity,
    wasMoved: false,
    isPinned: true,
    sharedBy: '',
    menuId: null,
    hovered: false,
  });
}

/** The shown popups, for reading outside of rendering. */
export function getPopups(): PopupData[] {
  return shownPopups(usePopupHandlerStore.getState().popupData, roomSharedPopups());
}

/** The shown popup of this entity, if any. */
export function getPopup(entityId: string): PopupData | undefined {
  return getPopups().find((popup) => popup.entityId === entityId);
}

/** The shown popups, for rendering. */
export function usePopups(): PopupData[] {
  const own = usePopupHandlerStore((state) => state.popupData);
  const roomPopups = useRoomStatePart('popups');
  // A shared popup appears once its entity is loaded.
  const cities = useModelStore((state) => state.cities);
  const districts = useModelStore((state) => state.districts);
  const buildings = useModelStore((state) => state.buildings);
  const communications = useModelStore((state) => state.aggregatedCommunications);
  return useMemo(() => {
    const shared = new Map(Object.entries(roomPopups ?? {}));
    return shownPopups(own, shared, (id) => cities[id] || districts[id] || buildings[id] || communications[id]);
  }, [own, roomPopups, cities, districts, buildings, communications]);
}

/** Whether popups can be shared now: only in a Room. */
export function useCanSharePopups(): boolean {
  return useRoomConnectionStore((state) => state.room !== undefined);
}

/**
 * The user opened a popup (clicking the entity again closes it). Opening is
 * always the person's own; only sharing hands it to the Room.
 */
export function addPopup(args: AddPopupArgs) {
  if (getPopup(args.entityId)) {
    removePopup(args.entityId);
    return;
  }
  usePopupHandlerStore.getState().addPopup(args);
}

/**
 * The user closed a popup. A shared one is closed for everyone, once the
 * service has handled it; an own one only for the person.
 */
export function removePopup(entityId: string) {
  const room = currentRoom();
  if (room && roomSharedPopups().has(entityId)) {
    room.send('closePopup', { entityId } satisfies ClientMessages['closePopup']);
    return;
  }
  usePopupHandlerStore.getState().removePopup(entityId);
}

/** The user moved a popup, or it loaded more details. This stays with the person, shared or not. */
export function updatePopup(popup: PopupData, updatePosition = true) {
  const store = usePopupHandlerStore.getState();
  if (!store.popupData.some((own) => own.entityId === popup.entityId)) {
    // A shared popup the person had not laid out yet.
    if (!roomSharedPopups().has(popup.entityId)) return;
    const layout = defaultLayout(popup.entityId, store.popupData.length);
    if (!layout) return;
    usePopupHandlerStore.setState({ popupData: [...store.popupData, layout] });
  }
  usePopupHandlerStore.getState().updatePopup(popup, updatePosition);
}

/** The user pinned a popup, so opening another one does not replace it. */
export function pinPopup(popup: PopupData) {
  usePopupHandlerStore.getState().pinPopup(popup);
}

/**
 * The user shared their popup with the Room: from now on everyone has it
 * open. It is pinned, so it stays. Alone there is nobody to share with.
 */
export function sharePopup(popup: PopupData) {
  const room = currentRoom();
  if (!room || roomSharedPopups().has(popup.entityId)) return;
  if (!popup.isPinned) usePopupHandlerStore.getState().pinPopup(popup);
  room.send('sharePopup', { entityId: popup.entityId } satisfies ClientMessages['sharePopup']);
}

registerHandOver({
  enter: (room, entry) => {
    // The creator's open popups stay their own until shared; a joiner's are dropped.
    if (entry === 'joined') usePopupHandlerStore.getState().clearPopups();
    let shared = new Set<string>(room.state.popups?.keys() ?? []);
    room.onStateChange((state) => {
      const now = new Set<string>(state.popups?.keys() ?? []);
      // Closed for everyone (or by a Landscape switch): this person's layout of it goes too.
      const closed = [...shared].filter((entityId) => !now.has(entityId));
      if (closed.length > 0) {
        const { popupData } = usePopupHandlerStore.getState();
        usePopupHandlerStore.setState({
          popupData: popupData.filter((popup) => !closed.includes(popup.entityId)),
        });
      }
      shared = now;
    });
  },
  leave: (lastState) => {
    // The shared popups stay open, as the person's own.
    const shared = (lastState.popups as SharedPopups | undefined) ?? NOT_SHARED;
    const { popupData } = usePopupHandlerStore.getState();
    const own = shownPopups(popupData, shared).map((popup) =>
      shared.has(popup.entityId) ? { ...popup, sharedBy: '' } : popup
    );
    usePopupHandlerStore.setState({ popupData: own });
  },
});
