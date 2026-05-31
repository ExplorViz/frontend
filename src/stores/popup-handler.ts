import { create } from 'zustand';

import PopupData from 'explorviz-frontend/src/components/visualization/rendering/popups/popup-data';
import { useModelStore } from 'explorviz-frontend/src/stores/repos/model-repository';
import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import { SerializedPopup } from 'explorviz-frontend/src/utils/collaboration/web-socket-messages/types/serialized-room';
import eventEmitter from 'explorviz-frontend/src/utils/event-emitter';
import AggregatedCommunication from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/aggregated-communication';
import {
  Building,
  City,
  District,
} from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
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
    entity?: City | District | Building | AggregatedCommunication;
    position?: Position2D;
    wasMoved?: boolean;
    pinned?: boolean;
    menuId?: string | null;
    sharedBy?: string | null;
    hovered?: boolean;
    model?: City | District | Building | AggregatedCommunication;
    applicationId?: string;
  }) => void;
  updatePopup: (newPopup: PopupData, updatePosition?: boolean) => void;
  onRestorePopups: (popups: SerializedPopup[]) => void;
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
    const existingPopup = get().popupData.find(
      (pd) => pd.entityId === entityId
    );
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
              fileDetailedData:
                updatedPopup.fileDetailedData ?? pd.fileDetailedData,
            }
          : pd
      ),
    }));
  },

  onRestorePopups: (popups: SerializedPopup[]) => {
    if (get().deactivated) {
      return;
    }

    const restoredPopups: PopupData[] = [];

    for (const popup of popups) {
      const entity = useModelStore.getState().getModel(popup.entityId);
      if (!entity) {
        console.warn(
          'Could not restore popup, entity not found for:',
          popup.entityId
        );
        continue;
      }

      restoredPopups.push(
        new PopupData({
          mouseX: popup.mouseX ?? 100,
          mouseY: popup.mouseY ?? 200 + restoredPopups.length * 50,
          entityId: popup.entityId,
          entity,
          wasMoved: true,
          isPinned: true,
          menuId: popup.menuId ?? null,
          sharedBy: popup.userId ?? '',
          hovered: false,
        })
      );
    }

    set({ popupData: restoredPopups });
  },

  cleanup: () => {
    eventEmitter.off('restore_popups', get().onRestorePopups);
  },

  setDeactivated: (value: boolean) => set({ deactivated: value }),
}));
