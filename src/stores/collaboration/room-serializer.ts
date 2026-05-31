import { useAnnotationHandlerStore } from 'explorviz-frontend/src/stores/annotation-handler';
import { useLocalUserStore } from 'explorviz-frontend/src/stores/collaboration/local-user';
import { useLandscapeTokenStore } from 'explorviz-frontend/src/stores/landscape-token';
import { usePopupHandlerStore } from 'explorviz-frontend/src/stores/popup-handler';
import { useTimestampStore } from 'explorviz-frontend/src/stores/timestamp';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import {
  SerializedAnnotation,
  SerializedLandscape,
  SerializedPopup,
  SerializedRoom,
} from 'explorviz-frontend/src/utils/collaboration/web-socket-messages/types/serialized-room';
import { create } from 'zustand';

interface RoomSerializerState {
  serializedRoom?: SerializedRoom;
  setSerializedRoom: (room: SerializedRoom | undefined) => void;
  serializeRoom: (snapshot?: boolean) => SerializedRoom;
  _serializeLandscape: () => SerializedLandscape;
  _serializeOpenPopups: (snapshot: boolean) => SerializedPopup[];
  _serializeOpenAnnotations: (snapshot: boolean) => SerializedAnnotation[];
}

export const useRoomSerializerStore = create<RoomSerializerState>(
  (set, get) => ({
    serializedRoom: undefined,

    setSerializedRoom: (room: SerializedRoom | undefined) => {
      set({ serializedRoom: room });
    },

    serializeRoom: (snapshot: boolean = false): SerializedRoom => {
      const serializedRoom: SerializedRoom = {
        landscape: get()._serializeLandscape(),
        closedComponentIds: Array.from(
          useVisualizationStore.getState().closedDistrictIds
        ),
        highlightedEntities: Array.from(
          useVisualizationStore.getState().highlightedEntityIds
        ).map((entityId) => {
          return {
            userId: useLocalUserStore.getState().userId,
            entityId: entityId,
          };
        }), // TODO: Add highlighted entities of remote users
        popups: get()._serializeOpenPopups(snapshot),
        annotations: get()._serializeOpenAnnotations(snapshot),
      };

      if (snapshot) {
        serializedRoom.visualizationSettings = JSON.parse(
          JSON.stringify(
            useUserSettingsStore.getState().visualizationSettings
          )
        );
      }

      return serializedRoom;
    },

    // ToDo: Add both global and local positions
    // private
    _serializeLandscape: (): SerializedLandscape => {
      return {
        landscapeToken: useLandscapeTokenStore.getState().token?.value,
        timestamp: useTimestampStore
          .getState()
          .getLatestTimestampByCommitOrFallback('cross-commit'), // TODO: Handle commits properly
      };
    },

    /**
     * Change that if snapshot is created, that the pop up does not need to be shared
     * We always want to save a popup if pinned
     * @param popupData
     * @returns
     */
    // private
    _serializeOpenPopups: (snapshot: boolean): SerializedPopup[] => {
      return usePopupHandlerStore
        .getState()
        .popupData.filter((popup) => {
          if (snapshot) {
            return true;
          }
          return popup.isPinned && !!popup.sharedBy;
        })
        .map((popup) => {
          return {
            userId: popup.sharedBy,
            entityId: popup.entityId,
            menuId: popup.menuId,
            mouseX: popup.mouseX,
            mouseY: popup.mouseY,
          };
        });
    },

    // private
    _serializeOpenAnnotations: (snapshot: boolean): SerializedAnnotation[] => {
      const { annotationData, minimizedAnnotations } =
        useAnnotationHandlerStore.getState();

      const annotationsToSerialize = snapshot
        ? [...annotationData, ...minimizedAnnotations]
        : annotationData.filter((annotation) => annotation.shared);

      return annotationsToSerialize.map((annotation) => {
        const entityId =
          annotation.entityId ?? annotation.entity?.id ?? undefined;
        const isMinimized = minimizedAnnotations.some(
          (minimized) => minimized.annotationId === annotation.annotationId
        );

        return {
          objectId: null,
          annotationId: annotation.annotationId,
          userId: annotation.sharedBy,
          entityId,
          menuId: annotation.menuId,
          annotationText: annotation.annotationText,
          annotationTitle: annotation.annotationTitle,
          owner: annotation.owner,
          shared: snapshot ? annotation.shared : true,
          inEdit: annotation.inEdit,
          lastEditor: annotation.lastEditor,
          mouseX: annotation.mouseX,
          mouseY: annotation.mouseY,
          wasMoved: annotation.wasMoved,
          hidden: annotation.hidden,
          minimized: isMinimized,
        };
      });
    },
  })
);
