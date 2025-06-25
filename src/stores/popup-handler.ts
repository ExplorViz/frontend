import { create } from 'zustand';

import { useLocalUserStore } from 'explorviz-frontend/src/stores/collaboration/local-user';

import PopupData from 'explorviz-frontend/src/components/visualization/rendering/popups/popup-data';
import { useApplicationRendererStore } from 'explorviz-frontend/src/stores/application-renderer';
import { useWebSocketStore } from 'explorviz-frontend/src/stores/collaboration/web-socket';
import { useToastHandlerStore } from 'explorviz-frontend/src/stores/toast-handler';
import { ForwardedMessage } from 'explorviz-frontend/src/utils/collaboration/web-socket-messages/receivable/forwarded';
import { SerializedPopup } from 'explorviz-frontend/src/utils/collaboration/web-socket-messages/types/serialized-room';
import eventEmitter from 'explorviz-frontend/src/utils/event-emitter';
import {
  getTypeOfEntity,
  isEntityMesh,
} from 'explorviz-frontend/src/utils/extended-reality/vr-helpers/detail-info-composer';
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
import {
  Class,
  isClass,
} from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import { getStoredSettings } from 'explorviz-frontend/src/utils/settings/local-storage-settings';
import * as THREE from 'three';
import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';

type Position2D = {
  x: number;
  y: number;
};

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
  handleHoverOnMesh: (mesh?: THREE.Object3D) => void;
  addPopup: ({
    mesh,
    position,
    wasMoved,
    pinned,
    menuId,
    sharedBy,
    hovered,
    model,
  }: {
    mesh?: THREE.Object3D;
    position?: Position2D;
    wasMoved?: boolean;
    pinned?: boolean;
    menuId?: string | null;
    sharedBy?: string | null;
    hovered?: boolean;
    model?: Class;
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
  updateMeshReference: (popup: PopupData) => void;
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
    get().updateMeshReference(popup);

    const { mesh } = popup;
    const entityId = mesh.getModelId();
    const worldPosition = useApplicationRendererStore
      .getState()
      .getPositionInLandscape(mesh);
    worldPosition.y += 0.3;

    useWebSocketStore
      .getState()
      .sendRespondableMessage<MenuDetachedMessage, MenuDetachedResponse>(
        MENU_DETACHED_EVENT,
        {
          event: MENU_DETACHED_EVENT,
          detachId: entityId,
          entityType: getTypeOfEntity(mesh),
          position: worldPosition.toArray(),
          quaternion: [0, 0, 0, 0],
          scale: [1, 1, 1],
          nonce: 0, // will be overwritten
        },
        {
          responseType: isMenuDetachedResponse,
          onResponse: (response: MenuDetachedResponse) => {
            const newPopup = {
              ...popup,
              sharedBy: useLocalUserStore.getState().userId,
              isPinned: true,
              menuId: response.objectId,
            };

            const newPopupData = [
              ...get().popupData.filter(
                (pd) => pd.entity.id !== popup.entity.id
              ),
              newPopup,
            ];

            set({
              popupData: newPopupData,
            });

            return true;
          },
          onOffline: () => {
            // Not used at the moment
          },
        }
      );
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
      if (isClass(popup.entity)) {
        useVisualizationStore.getState().actions.updateClassState(entityId, {
          isHovered: false,
        });
      }
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

  handleHoverOnMesh: (mesh?: THREE.Object3D) => {
    if (isEntityMesh(mesh)) {
      set({
        popupData: get().popupData.map((pd) => ({
          ...pd,
          hovered: pd.entity.id === mesh.getModelId(),
        })),
      });
    } else {
      set({
        popupData: get().popupData.map((pd) => ({ ...pd, hovered: false })),
      });
    }
  },

  addPopup: ({
    mesh,
    position,
    wasMoved,
    pinned,
    menuId,
    sharedBy,
    hovered,
    model,
  }) => {
    // TODO: Handle HTML Mesh better
    if (
      !model ||
      getStoredSettings().hidePopupDelay.value == 0 ||
      get().deactivated
    ) {
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
      wasMoved: wasMoved || false,
      entity: model,
      mesh,
      applicationId: '1',
      menuId: menuId || null,
      isPinned: pinned || false,
      sharedBy: sharedBy || '',
      hovered: hovered || false,
    });

    // Check if popup for entity already exists and update it if so
    const maybePopup = get().popupData.find(
      (pd) => pd.entity.id === newPopup.entity.id
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

      // Do not remove popup when mouse stayed (recently) on target entity or shift is pressed
      if (
        get().isShiftPressed ||
        (latestMousePosition.x == get().latestMousePosition.x &&
          latestMousePosition.y == get().latestMousePosition.y)
      ) {
        get()._removePopupAfterTimeout(popup);
        return;
      }

      // Popup did not move (was not updated)
      if (maybePopup.mouseX == mouseX && maybePopup.mouseY == mouseY) {
        get().removePopup(popup.entity.id);
        return;
      }

      get()._removePopupAfterTimeout(popup);
    }, getStoredSettings().hidePopupDelay.value * 1000);
  },

  updatePopup: (updatedPopup: PopupData, updatePosition = true) => {
    if (get().deactivated) {
      return;
    }

    set((state) => ({
      popupData: state.popupData.map((pd) =>
        pd.entity.id === updatedPopup.entity.id
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

    get().updateMeshReference(updatedPopup);
  },

  /**
   * React on detached menu (popup in VR) update and show a regular HTML popup.
   */
  onMenuDetached: ({
    objectId,
    userId,
    detachId,
  }: MenuDetachedForwardMessage) => {
    const mesh = useApplicationRendererStore.getState().getMeshById(detachId);
    if (!mesh) {
      return;
    }
    if (get().deactivated) return;

    get().addPopup({
      mesh,
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
      const mesh = useApplicationRendererStore
        .getState()
        .getMeshById(popup.entityId);

      if (!mesh) {
        continue;
      }

      get().addPopup({
        mesh,
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

  /**
   * Updates mesh reference of popup with given ID in popup data.
   */
  updateMeshReference: (popup: PopupData) => {
    const mesh = useApplicationRendererStore
      .getState()
      .getMeshById(popup.entity.id);
    if (isEntityMesh(mesh)) {
      set({
        popupData: get().popupData.map((pd) =>
          pd.entity.id === popup.entity.id ? { ...pd, mesh: mesh } : pd
        ),
      });
    }
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
