import { create } from 'zustand';
import {
  getTypeOfEntity,
  isEntityMesh,
} from 'react-lib/src/utils/extended-reality/vr-helpers/detail-info-composer';
import {
  SerializedAnnotation,
  SerializedDetachedMenu,
  SerializedPopup,
} from 'react-lib/src/utils/collaboration/web-socket-messages/types/serialized-room';
import { SPECTATE_VIEW_ENTITY_TYPE } from 'react-lib/src/utils/collaboration/web-socket-messages/types/entity-type';
import eventEmitter from 'react-lib/src/utils/event-emitter';
import { useLocalUserStore } from 'react-lib/src/stores/collaboration/local-user';
import { useApplicationRendererStore } from 'react-lib/src/stores/application-renderer';
import { useVrMenuFactoryStore } from 'react-lib/src/stores/extended-reality/vr-menu-factory';
import { useDetachedMenuGroupsStore } from 'react-lib/src/stores/extended-reality/detached-menu-groups';

interface DetachedMenuRendererState {
  restore: (
    popups: SerializedPopup[],
    detachedMenus: SerializedDetachedMenu[]
  ) => void;
  restoreAnnotations: (annotations: SerializedAnnotation[]) => void;
  restoreDetachedMenus: (detachedMenus: SerializedDetachedMenu[]) => void;
  restoreDetachedMenu: (detachedMenu: SerializedDetachedMenu) => void;
  restoreFromPopups: (popupData: SerializedPopup[]) => void;
  restoreFromPopup: (popupData: SerializedPopup) => void;
}

export const useDetachedMenuRendererStore = create<DetachedMenuRendererState>(
  (set, get) => ({
    restore: (
      popups: SerializedPopup[],
      detachedMenus: SerializedDetachedMenu[]
    ) => {
      if (useLocalUserStore.getState().visualizationMode === 'browser') {
        const popupsFromMenu: SerializedPopup[] = detachedMenus.map(
          (detachedMenu) => {
            return {
              userId: detachedMenu.userId,
              entityId: detachedMenu.entityId,
              menuId: detachedMenu.objectId,
            };
          }
        );
        eventEmitter.emit('restore_popups', popups.concat(popupsFromMenu));
      }

      if (useLocalUserStore.getState().visualizationMode === 'vr') {
        popups.forEach((popup) => {
          get().restoreFromPopup(popup);
        });
        detachedMenus.forEach((detachedMenu) => {
          get().restoreDetachedMenu(detachedMenu);
        });
      }
    },

    restoreAnnotations: (annotations: SerializedAnnotation[]) => {
      for (const an of annotations) {
        an.menuId = an.objectId;
      }
      eventEmitter.emit('restore_annotations', annotations);
    },

    restoreDetachedMenus: (detachedMenus: SerializedDetachedMenu[]) => {
      detachedMenus.forEach((detachedMenu) => {
        get().restoreDetachedMenu(detachedMenu);
      });
    },

    restoreDetachedMenu: (detachedMenu: SerializedDetachedMenu) => {
      if (detachedMenu.entityType === SPECTATE_VIEW_ENTITY_TYPE) {
        return;
      }
      const object = useApplicationRendererStore
        .getState()
        .getMeshById(detachedMenu.entityId);

      if (isEntityMesh(object)) {
        const menu = useVrMenuFactoryStore.getState().buildInfoMenu(object);
        menu.position.fromArray(detachedMenu.position);
        menu.quaternion.fromArray(detachedMenu.quaternion);
        menu.scale.fromArray(detachedMenu.scale);
        useDetachedMenuGroupsStore
          .getState()
          .addDetachedMenuLocally(
            menu,
            detachedMenu.objectId,
            detachedMenu.userId
          );
      }
    },

    restoreFromPopups: (popupData: SerializedPopup[]) => {
      popupData.forEach((popup) => {
        get().restoreFromPopup(popup);
      });
    },

    restoreFromPopup: (popupData: SerializedPopup) => {
      const mesh = useApplicationRendererStore
        .getState()
        .getMeshById(popupData.entityId);
      if (!isEntityMesh(mesh)) {
        return;
      }
      //TODO: check for other function
      const worldPosition = useApplicationRendererStore
        .getState()
        .getGraphPosition(mesh);
      worldPosition.y += 0.3;

      get().restoreDetachedMenu({
        objectId: popupData.entityId,
        userId: null,
        entityId: popupData.entityId,
        entityType: getTypeOfEntity(mesh),
        position: worldPosition.toArray(),
        quaternion: [0, 0, 0, 0],
        scale: [1, 1, 1],
      });
    },
  })
);
