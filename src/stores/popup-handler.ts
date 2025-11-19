import { create } from 'zustand';

import PopupData from 'explorviz-frontend/src/components/visualization/rendering/popups/popup-data';
import { useAuthStore } from 'explorviz-frontend/src/stores/auth';
import { useCollaborationSessionStore } from 'explorviz-frontend/src/stores/collaboration/collaboration-session';
import { useWebSocketStore } from 'explorviz-frontend/src/stores/collaboration/web-socket';
import { useModelStore } from 'explorviz-frontend/src/stores/repos/model-repository';
import { useToastHandlerStore } from 'explorviz-frontend/src/stores/toast-handler';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import { ForwardedMessage } from 'explorviz-frontend/src/utils/collaboration/web-socket-messages/receivable/forwarded';
import {
  APPLICATION_ENTITY_TYPE,
  CLASS_COMMUNICATION_ENTITY_TYPE,
  CLASS_ENTITY_TYPE,
  COMPONENT_ENTITY_TYPE,
  EntityType,
  NODE_ENTITY_TYPE,
} from 'explorviz-frontend/src/utils/collaboration/web-socket-messages/types/entity-type';
import { SerializedPopup } from 'explorviz-frontend/src/utils/collaboration/web-socket-messages/types/serialized-room';
import eventEmitter from 'explorviz-frontend/src/utils/event-emitter';
import { MenuDetachedForwardMessage } from 'explorviz-frontend/src/utils/extended-reality/vr-web-wocket-messages/receivable/menu-detached-forward';
import {
  MenuDetachedResponse,
  isMenuDetachedResponse,
} from 'explorviz-frontend/src/utils/extended-reality/vr-web-wocket-messages/receivable/response/menu-detached';
import {
  ObjectClosedResponse,
  isObjectClosedResponse,
} from 'explorviz-frontend/src/utils/extended-reality/vr-web-wocket-messages/receivable/response/object-closed';
import {
  DETACHED_MENU_CLOSED_EVENT,
  DetachedMenuClosedMessage,
} from 'explorviz-frontend/src/utils/extended-reality/vr-web-wocket-messages/sendable/request/detached-menu-closed';
import {
  MENU_DETACHED_EVENT,
  MenuDetachedMessage,
} from 'explorviz-frontend/src/utils/extended-reality/vr-web-wocket-messages/sendable/request/menu-detached';
import ClassCommunication from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/class-communication';
import {
  Application,
  Class,
  Node,
  Package,
  isApplication,
  isClass,
  isNode,
  isPackage,
} from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';

type Position2D = {
  x: number;
  y: number;
};

/**
 * Converts a popup entity to the EntityType used by websocket messages
 */
function getEntityTypeForPopup(
  entity: Node | Application | Package | Class | ClassCommunication
): EntityType {
  if (isNode(entity)) {
    return NODE_ENTITY_TYPE;
  }
  if (isApplication(entity)) {
    return APPLICATION_ENTITY_TYPE;
  }
  if (isPackage(entity)) {
    return COMPONENT_ENTITY_TYPE;
  }
  if (isClass(entity)) {
    return CLASS_ENTITY_TYPE;
  }
  if (entity instanceof ClassCommunication) {
    return CLASS_COMMUNICATION_ENTITY_TYPE;
  }
  // Default fallback
  return APPLICATION_ENTITY_TYPE;
}

interface PopupHandlerState {
  popupData: PopupData[];
  deactivated: boolean;
  latestMousePosition: { timestamp: number; x: number; y: number };
  isShiftPressed: boolean;
  _constructor: () => void;
  setDeactivated: (value: boolean) => void;
  clearPopups: () => void;
  removeUnpinnedPopups: () => void;
  removeUnmovedPopups: () => void;
  sharePopup: (popup: PopupData) => void;
  pinPopup: (popup: PopupData) => void;
  removePopup: (entityId: string) => Promise<void>;
  handleMouseMove: (event: any) => void;
  addPopup: ({
    entityId,
    position,
    wasMoved,
    pinned,
    menuId,
    sharedBy,
    hovered,
    model,
  }: {
    entityId: string;
    entity?: Node | Application | Package | Class | ClassCommunication;
    position?: Position2D;
    wasMoved?: boolean;
    pinned?: boolean;
    menuId?: string | null;
    sharedBy?: string | null;
    hovered?: boolean;
    model?: Application | Package | Class;
    applicationId?: string;
  }) => void;
  _removePopupAfterTimeout: (popup: PopupData) => void;
  updatePopup: (newPopup: PopupData, updatePosition?: boolean) => void;
  /**
   * React on detached menu (popup in VR) update and show a regular HTML popup.
   */
  onMenuDetached: ({
    objectId,
    userId,
    detachId,
  }: MenuDetachedForwardMessage) => void;
  onRestorePopups: (popups: SerializedPopup[]) => void;
  onMenuClosed: ({
    originalMessage: { menuId },
  }: ForwardedMessage<DetachedMenuClosedMessage>) => void;
  /**
   * Updates mesh reference of popup with given ID in popup data.
   */
  cleanup: () => void;
}

export const usePopupHandlerStore = create<PopupHandlerState>((set, get) => ({
  popupData: [],
  deactivated: false,
  latestMousePosition: { timestamp: 0, x: 0, y: 0 },
  isShiftPressed: false,

  _constructor: () => {
    eventEmitter.on(MENU_DETACHED_EVENT, get().onMenuDetached);
    eventEmitter.on(DETACHED_MENU_CLOSED_EVENT, get().onMenuClosed);
    eventEmitter.on('restore_popups', get().onRestorePopups);
  },

  clearPopups: () => {
    set({ popupData: [] });
  },

  removeUnpinnedPopups: () => {
    set({ popupData: get().popupData.filter((data) => data.isPinned) });
  },

  removeUnmovedPopups: () => {
    set({ popupData: get().popupData.filter((data) => data.wasMoved) });
  },

  sharePopup: (popup: PopupData) => {
    const entityId = popup.entityId;
    const entityType = getEntityTypeForPopup(popup.entity);

    if (useCollaborationSessionStore.getState().isOnline()) {
      useWebSocketStore
        .getState()
        .sendRespondableMessage<MenuDetachedMessage, MenuDetachedResponse>(
          MENU_DETACHED_EVENT,
          {
            event: MENU_DETACHED_EVENT,
            detachId: entityId,
            entityType: entityType,
            position: [0, 0, 0], // Position not needed for browser popups
            quaternion: [0, 0, 0, 1],
            scale: [1, 1, 1],
            nonce: 0, // will be overwritten
          },
          {
            responseType: isMenuDetachedResponse,
            onResponse: (response: MenuDetachedResponse) => {
              const sharedBy = useAuthStore.getState().user!.sub;
              const menuId = response.objectId;

              set({
                popupData: [
                  ...get().popupData.filter(
                    (pd) => pd.entityId !== popup.entityId
                  ),
                  {
                    ...popup,
                    sharedBy: sharedBy,
                    isPinned: true,
                    menuId: menuId,
                  },
                ],
              });

              return true;
            },
            onOffline: () => {
              // Not used at the moment
            },
          }
        );
    }
  },

  pinPopup: (popup: PopupData) =>
    set({
      popupData: [
        ...get().popupData.filter((pd) => pd.entity.id !== popup.entity.id),
        {
          ...popup,
          isPinned: true,
        },
      ],
    }),

  removePopup: async (entityId: string) => {
    const popup = get().popupData.find((pd) => pd.entity.id === entityId);
    if (!popup) {
      return;
    }

    if (await canRemovePopup(popup)) {
      set({
        popupData: get().popupData.filter((pd) => pd.entity.id !== entityId),
      });
      useVisualizationStore.getState().actions.setHoveredEntityId(null);
    } else {
      useToastHandlerStore
        .getState()
        .showErrorToastMessage(
          'Could not remove popup since it is currently in use by another user.'
        );
    }
  },

  handleMouseMove: (event: any) => {
    set({
      latestMousePosition: {
        timestamp: Date.now(),
        x: event.pageX,
        y: event.pageY,
      },
      isShiftPressed: event.shiftKey,
    });
  },
  addPopup: ({
    entityId,
    entity,
    position,
    wasMoved,
    pinned,
    menuId,
    sharedBy,
    hovered,
  }) => {
    // TODO: Handle HTML Mesh better
    if (
      useUserSettingsStore.getState().visualizationSettings.hidePopupDelay
        .value == 0 ||
      get().deactivated
    ) {
      return;
    }

    entity = entity || useModelStore.getState().getModel(entityId);

    if (!entity) {
      console.warn('Could not add popup, entity not found for:', entityId);
      return;
    }

    let popupPosition = position;

    // Popups shared by other users have no position information
    if (!popupPosition) {
      popupPosition = {
        x: 100,
        y: 200 + get().popupData.length * 50, // Stack popups vertically
      };
    }

    const newPopup = new PopupData({
      mouseX: popupPosition.x,
      mouseY: popupPosition.y,
      entityId: entityId,
      entity: entity,
      wasMoved: wasMoved || false,
      isPinned: pinned || false,
      menuId: menuId || null,
      sharedBy: sharedBy || '',
      hovered: hovered || false,
    });

    // Check if popup for entity already exists and update it if so
    const maybePopup = get().popupData.find(
      (pd) => pd.entityId === newPopup.entityId
    );
    if (maybePopup) {
      get().updatePopup(newPopup, false);
      return;
    }

    // Ensure that there is at most one unpinned popup
    const unpinnedPopupIndex = get().popupData.findIndex((pd) => !pd.isPinned);

    if (unpinnedPopupIndex === -1 || newPopup.isPinned) {
      set({ popupData: [...get().popupData, newPopup] });
    } else {
      const unpinnedPopup = get().popupData[unpinnedPopupIndex];

      // Place new popup at same position of previously moved popup
      if (unpinnedPopup.wasMoved) {
        newPopup.mouseX = unpinnedPopup.mouseX;
        newPopup.mouseY = unpinnedPopup.mouseY;
        newPopup.wasMoved = true;
      }

      // Replace unpinned popup
      set((state) => ({
        popupData: state.popupData.map((pd) =>
          pd.entity.id === unpinnedPopup.entity.id ? newPopup : pd
        ),
      }));
    }

    get()._removePopupAfterTimeout(newPopup);
  },

  _removePopupAfterTimeout: (popup: PopupData) => {
    const latestMousePosition = get().latestMousePosition;
    // Store popup position
    const mouseX = popup.mouseX;
    const mouseY = popup.mouseY;

    setTimeout(() => {
      const maybePopup = get().popupData.find(
        (pd) => pd.entity.id === popup.entity.id
      );

      // Popup no longer available
      if (!maybePopup || maybePopup.wasMoved || popup.isPinned) {
        return;
      }

      // Do not remove popup when mouse is on the popup, stayed (recently) on target entity or shift is pressed
      if (
        maybePopup.hovered ||
        get().isShiftPressed ||
        (latestMousePosition.x == get().latestMousePosition.x &&
          latestMousePosition.y == get().latestMousePosition.y)
      ) {
        get()._removePopupAfterTimeout(popup);
        return;
      }

      // Popup did not move (was not updated)
      if (maybePopup.mouseX == mouseX && maybePopup.mouseY == mouseY) {
        get().removePopup(popup.entityId);
        return;
      }

      get()._removePopupAfterTimeout(popup);
    }, useUserSettingsStore.getState().visualizationSettings.hidePopupDelay.value * 1000);
  },

  updatePopup: (updatedPopup: PopupData, updatePosition = true) => {
    if (get().deactivated) {
      return;
    }

    set((state) => ({
      popupData: state.popupData.map((pd) =>
        pd.entityId === updatedPopup.entityId
          ? {
              ...pd,
              wasMoved: pd.wasMoved || updatedPopup.wasMoved,
              mouseX: updatePosition ? updatedPopup.mouseX : pd.mouseX,
              mouseY: updatePosition ? updatedPopup.mouseY : pd.mouseY,
              isPinned: pd.isPinned || updatedPopup.isPinned,
              sharedBy: updatedPopup.sharedBy,
              hovered: updatedPopup.hovered,
            }
          : pd
      ),
    }));
  },

  /**
   * React on detached menu (popup in VR) update and show a regular HTML popup.
   */
  onMenuDetached: ({
    objectId,
    userId,
    detachId,
  }: MenuDetachedForwardMessage) => {
    // TODO: Check if mesh is deactivated

    get().addPopup({
      entityId: detachId,
      wasMoved: true,
      pinned: true,
      sharedBy: userId,
      menuId: objectId,
    });
  },

  onRestorePopups: (popups: SerializedPopup[]) => {
    if (get().deactivated) return;
    set({ popupData: [] });

    for (const popup of popups) {
      get().addPopup({
        entityId: popup.entityId,
        wasMoved: true,
        pinned: true,
        sharedBy: popup.userId || undefined,
        menuId: popup.menuId,
      });
    }
  },

  onMenuClosed: ({
    originalMessage: { menuId },
  }: ForwardedMessage<DetachedMenuClosedMessage>) => {
    set({ popupData: get().popupData.filter((pd) => pd.menuId !== menuId) });
  },

  cleanup: () => {
    eventEmitter.off(MENU_DETACHED_EVENT, get().onMenuDetached);
    eventEmitter.off(DETACHED_MENU_CLOSED_EVENT, get().onMenuClosed);
    eventEmitter.off('restore_popups', get().onRestorePopups);
  },

  setDeactivated: (value: boolean) => set({ deactivated: value }),
}));

async function canRemovePopup(popup: PopupData) {
  // Popup / menu cannot be grabbed by other user without menuId
  if (!popup.menuId) {
    return true;
  }

  return useWebSocketStore
    .getState()
    .sendRespondableMessage<DetachedMenuClosedMessage, ObjectClosedResponse>(
      DETACHED_MENU_CLOSED_EVENT,
      {
        event: 'detached_menu_closed',
        menuId: popup.menuId,
        nonce: 0, // will be overwritten
      },
      {
        responseType: isObjectClosedResponse,
        onResponse: (response: ObjectClosedResponse) => {
          return response.isSuccess;
        },
        onOffline: () => {
          return true;
        },
      }
    );
}

usePopupHandlerStore.getState()._constructor();
