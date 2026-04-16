import { create } from 'zustand';

import PopupData from 'explorviz-frontend/src/components/visualization/rendering/popups/popup-data';
import { useModelStore } from 'explorviz-frontend/src/stores/repos/model-repository';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import { ForwardedMessage } from 'explorviz-frontend/src/utils/collaboration/web-socket-messages/receivable/forwarded';
import { SerializedPopup } from 'explorviz-frontend/src/utils/collaboration/web-socket-messages/types/serialized-room';
import eventEmitter from 'explorviz-frontend/src/utils/event-emitter';
import { MenuDetachedForwardMessage } from 'explorviz-frontend/src/utils/extended-reality/vr-web-wocket-messages/receivable/menu-detached-forward';
import {
  DETACHED_MENU_CLOSED_EVENT,
  DetachedMenuClosedMessage,
} from 'explorviz-frontend/src/utils/extended-reality/vr-web-wocket-messages/sendable/request/detached-menu-closed';
import {
  MENU_DETACHED_EVENT
} from 'explorviz-frontend/src/utils/extended-reality/vr-web-wocket-messages/sendable/request/menu-detached';
import ClassCommunication from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/class-communication';
import {
  Building,
  City,
  District,
} from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import {
  Application,
  Class,
  Node,
  Package
} from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import { me } from 'playroomkit';

function isCity(entity: any): entity is City {
  return (
    entity && Object.prototype.hasOwnProperty.call(entity, 'rootDistrictIds')
  );
}

function isBuilding(entity: any): entity is Building {
  return (
    entity &&
    Object.prototype.hasOwnProperty.call(entity, 'parentCityId') &&
    Object.prototype.hasOwnProperty.call(entity, 'parentDistrictId')
  );
}

function isDistrict(entity: any): entity is District {
  return (
    entity &&
    Object.prototype.hasOwnProperty.call(entity, 'parentCityId') &&
    !Object.prototype.hasOwnProperty.call(entity, 'parentDistrictId')
  );
}

type Position2D = {
  x: number;
  y: number;
};

interface PopupHandlerState {
  popupData: PopupData[];
  deactivated: boolean;
  _constructor: () => void;
  setDeactivated: (value: boolean) => void;
  clearPopups: () => void;
  removeUnpinnedPopups: () => void;
  removeUnmovedPopups: () => void;
  sharePopup: (popup: PopupData) => void;
  pinPopup: (popup: PopupData) => void;
  removePopup: (entityId: string) => void;
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
    entity?:
      | Node
      | Application
      | Package
      | Class
      | ClassCommunication
      | City
      | District
      | Building;
    position?: Position2D;
    wasMoved?: boolean;
    pinned?: boolean;
    menuId?: string | null;
    sharedBy?: string | null;
    hovered?: boolean;
    model?: Application | Package | Class | City | District | Building;
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

  _constructor: () => {
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
    set({
      popupData: [
        ...get().popupData.filter((pd) => pd.entityId !== popup.entityId),
        { ...popup, sharedBy: me().id },
      ],
    });
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

  removePopup: (entityId: string) => {
    set({
      popupData: get().popupData.filter((pd) => pd.entity.id !== entityId),
    });
    useVisualizationStore.getState().actions.setHoveredEntityId(null);
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

      // Do not remove popup when mouse is on the popup
      if (maybePopup.hovered) {
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

