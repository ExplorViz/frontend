import { create } from 'zustand';

import PopupData from 'explorviz-frontend/src/components/visualization/rendering/popups/popup-data';
import { useModelStore } from 'explorviz-frontend/src/stores/repos/model-repository';
import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import { ForwardedMessage } from 'explorviz-frontend/src/utils/collaboration/web-socket-messages/receivable/forwarded';
import { SerializedPopup } from 'explorviz-frontend/src/utils/collaboration/web-socket-messages/types/serialized-room';
import eventEmitter from 'explorviz-frontend/src/utils/event-emitter';
import { MenuDetachedForwardMessage } from 'explorviz-frontend/src/utils/extended-reality/vr-web-wocket-messages/receivable/menu-detached-forward';
import {
  DETACHED_MENU_CLOSED_EVENT,
  DetachedMenuClosedMessage,
} from 'explorviz-frontend/src/utils/extended-reality/vr-web-wocket-messages/sendable/request/detached-menu-closed';
import { MENU_DETACHED_EVENT } from 'explorviz-frontend/src/utils/extended-reality/vr-web-wocket-messages/sendable/request/menu-detached';
import AggregatedCommunication from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/aggregated-communication';
import {
  Building,
  City,
  District,
} from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import {
  Application,
  Class,
  Node,
  Package,
} from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import { me } from 'playroomkit';

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
      | AggregatedCommunication
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

  _constructor: () => {},

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
    if (get().deactivated) {
      return;
    }

    // Check if popup for entity already exists and remove it if so (toggle)
    const existingPopup = get().popupData.find((pd) => pd.entityId === entityId);
    if (existingPopup) {
      get().removePopup(entityId);
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

    if (newPopup.isPinned) {
      set({ popupData: [...get().popupData, newPopup] });
    } else {
      // Replace all unpinned popups
      set({
        popupData: [...get().popupData.filter((pd) => pd.isPinned), newPopup],
      });
    }
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
              fileDetailedData: updatedPopup.fileDetailedData,
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
