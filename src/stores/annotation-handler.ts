import AnnotationData from 'explorviz-frontend/src/components/visualization/rendering/annotations/annotation-data';
import { useModelStore } from 'explorviz-frontend/src/stores/repos/model-repository';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import ClassCommunication from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/class-communication';
import {
  Application,
  Class,
  Node,
  Package,
} from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import ClazzCommuMeshDataModel from 'explorviz-frontend/src/view-objects/3d/city/utils/clazz-communication-mesh-data-model';

import { create } from 'zustand';
import { useAuthStore } from './auth';

type Position2D = {
  x: number;
  y: number;
};

interface AnnotationHandlerState {
  annotationData: AnnotationData[]; // tracked
  minimizedAnnotations: AnnotationData[];
  clearAnnotations: () => void;
  removeUnmovedAnnotations: () => void;
  editAnnotation: (annotationData: AnnotationData) => void;
  updateAnnotation: (annotationData: AnnotationData) => void;
  removeAnnotation: (
    annotationId: number,
    stillMinimized?: boolean
  ) => void;
  removeAnnotationAfterTimeout: (annotation: AnnotationData) => void;
  shareAnnotation: (annotation: AnnotationData) => void;
  addAnnotation: ({
    annotationId,
    entityId,
    entity,
    position,
    wasMoved,
    menuId,
    hovered,
    annotationTitle,
    annotationText,
    sharedBy,
    owner,
    shared,
    inEdit,
    lastEditor,
  }: {
    annotationId: number | undefined;
    entityId?: string;
    entity?:
    | Node
    | Application
    | Package
    | Class
    | ClazzCommuMeshDataModel
    | ClassCommunication;
    position: Position2D | undefined;
    wasMoved?: boolean;
    menuId?: string | null;
    hovered?: boolean;
    annotationTitle: string;
    annotationText: string;
    sharedBy: string;
    owner: string | undefined;
    shared: boolean;
    inEdit: boolean | undefined;
    lastEditor: string | undefined;
  }) => void;
  _updateExistingAnnotation: (
    annotation: AnnotationData,
    annotationText: string,
    annotationTitle: string
  ) => void;
  cleanup: () => void;
  setAnnotationData: (annotations: AnnotationData[]) => void;
  setMinimizedAnnotationData: (minimizedAnnotations: AnnotationData[]) => void;
  init: () => void;
}

export const useAnnotationHandlerStore = create<AnnotationHandlerState>(
  (set, get) => ({
    annotationData: [],
    minimizedAnnotations: [],

    init: () => {
    },

    setAnnotationData: (annotations: AnnotationData[]) => {
      set({ annotationData: annotations });
    },

    setMinimizedAnnotationData: (annotations: AnnotationData[]) => {
      set({ minimizedAnnotations: annotations });
    },

    clearAnnotations: () => {
      get().annotationData.forEach((an) => {
        if (an.entityId) {
          // Todo: Update label
          // useApplicationRendererStore.getState().updateLabel(an.entityId, '');
        }
      });

      set({ annotationData: [] });
    },

    removeUnmovedAnnotations: () => {
      // remvove annotation from minimized, if minimized one was opened and moved again
      get().minimizedAnnotations.forEach((man) => {
        get().annotationData.forEach((an) => {
          if (man.annotationId === an.annotationId && an.wasMoved) {
            set({
              minimizedAnnotations: get().minimizedAnnotations.filter(
                (data) => data.annotationId !== an.annotationId
              ),
            });
          }
        });
      });

      const unmovedAnnotations = get().annotationData.filter(
        (data) => !data.wasMoved
      );
      set({
        annotationData: get().annotationData.filter((data) => data.wasMoved),
      });

      unmovedAnnotations.forEach((an) => {
        let found = false;
        if (an.entityId) {
          get().minimizedAnnotations.forEach((man) => {
            if (an.annotationId === man.annotationId) {
              found = true;
            }
          });
        }
      });
    },

    editAnnotation: (annotationData: AnnotationData) => {
      set({
        annotationData: [
          ...get().annotationData.filter((an) => an.annotationId !== annotationData.annotationId),
          { ...annotationData, inEdit: true },
        ],
      });
    },

    updateAnnotation: (annotationData: AnnotationData) => {
      annotationData.lastEditor = useAuthStore.getState().user?.name || 'Unknown';
      set({
        annotationData: [
          ...get().annotationData.filter((an) => an.annotationId !== annotationData.annotationId),
          { ...annotationData, inEdit: false },
        ],
      });
    },

    removeAnnotation: (annotationId: number, stillMinimized: boolean = false) => {
      set({
        annotationData: get().annotationData.filter((an) => an.annotationId !== annotationId),
      });
    },

    removeAnnotationAfterTimeout: (annotation: AnnotationData) => {
      // Store annotation position
      const mouseX = annotation.mouseX;
      const mouseY = annotation.mouseY;

      setTimeout(() => {
        const maybeAnnotation = get().annotationData.find(
          (ad) => ad.annotationId === annotation.annotationId
        );

        // Annotation no longer available
        if (!maybeAnnotation || maybeAnnotation.wasMoved) {
          return;
        }

        // Annotation did not move (was not updated)
        if (
          maybeAnnotation.mouseX == mouseX &&
          maybeAnnotation.mouseY == mouseY
        ) {
          get().removeAnnotation(annotation.annotationId);
          return;
        }

        get().removeAnnotationAfterTimeout(annotation);
      }, useUserSettingsStore.getState().visualizationSettings.hidePopupDelay.value);
    },

    shareAnnotation: (annotation: AnnotationData) => {
      set({
        annotationData: [
          ...get().annotationData.filter((an) => an.annotationId !== annotation.annotationId),
          {
            ...annotation,
            sharedBy: useAuthStore.getState().user?.sub || 'Unknown',
            shared: true,
          },
        ],
      });
    },

    addAnnotation: ({
      annotationId,
      entityId,
      entity,
      position,
      wasMoved,
      menuId,
      hovered,
      annotationTitle,
      annotationText,
      sharedBy,
      owner,
      shared,
      inEdit,
      lastEditor,
    }: {
      annotationId: number | undefined;
      entityId?: string;
      entity?:
      | Node
      | Application
      | Package
      | Class
      | ClazzCommuMeshDataModel
      | ClassCommunication;
      position: Position2D | undefined;
      wasMoved?: boolean;
      menuId?: string | null;
      hovered?: boolean;
      annotationTitle: string;
      annotationText: string;
      sharedBy: string;
      owner: string | undefined;
      shared: boolean;
      inEdit: boolean | undefined;
      lastEditor: string | undefined;
    }) => {
      let minimized = false;
      let alreadyExists = false;

      // Get entity from entityId if not provided
      const resolvedEntity =
        entity ||
        (entityId ? useModelStore.getState().getModel(entityId) : undefined);
      const resolvedEntityId = entityId || resolvedEntity?.id;

      if (resolvedEntityId) {
        const annotations = get().minimizedAnnotations.filter(
          (an) => an.entityId === resolvedEntityId
        );
        if (annotations.length === 1) {
          set({
            annotationData: [...get().annotationData, annotations[0]],
            minimizedAnnotations: get().minimizedAnnotations.filter(
              (an) => an.entityId !== resolvedEntityId
            ),
          });
          minimized = true;
          get().removeAnnotationAfterTimeout(annotations[0]);
        }

        const anno = get().annotationData.filter(
          (an) => an.entityId === resolvedEntityId
        );
        if (anno.length === 1) {
          alreadyExists = true;
        }
      }

      if (!minimized && !alreadyExists && wasMoved) {
        get().removeUnmovedAnnotations();

        let annotationPosition = position;

        if (!annotationPosition) {
          annotationPosition = {
            x: 100,
            y: 200 + get().annotationData.length * 50,
          };
        }

        const newAnnotation = new AnnotationData({
          annotationId: annotationId,
          mouseX: annotationPosition.x,
          mouseY: annotationPosition.y,
          wasMoved: wasMoved || false,
          isAssociated: !!resolvedEntityId,
          entityId: resolvedEntityId,
          entity: resolvedEntity,
          applicationId: resolvedEntity?.applicationId,
          menuId: menuId || null,
          hovered: hovered || false,
          annotationText: annotationText,
          annotationTitle: annotationTitle,
          hidden: false,
          sharedBy: sharedBy || useAuthStore.getState().user!.sub, // for production: user_id makes more sense
          owner: owner || useAuthStore.getState().user!.name,
          shared: shared,
          inEdit: inEdit === undefined ? true : inEdit,
          lastEditor: lastEditor || useAuthStore.getState().user!.name,
        });

        // Check if annotation for entity already exists and update it if so
        if (newAnnotation.entityId !== undefined) {
          const maybeAnnotation = get().annotationData.find(
            (an) => an.entityId === newAnnotation.entityId
          );
          if (maybeAnnotation) {
            get()._updateExistingAnnotation(
              maybeAnnotation,
              newAnnotation.annotationText,
              newAnnotation.annotationTitle
            );
            return;
          }
        }

        set({ annotationData: [...get().annotationData, newAnnotation] });

        get().removeAnnotationAfterTimeout(newAnnotation);
      }
    },

    _updateExistingAnnotation: (
      annotation: AnnotationData,
      annotationText: string,
      annotationTitle: string
    ) => {
      set({
        annotationData: [
          ...get().annotationData.filter(
            (an) => an.entityId !== annotation.entityId
          ),
          {
            ...annotation,
            annotationText: annotationText,
            annotationTitle: annotationTitle,
          },
        ],
      });
    },


    cleanup: () => {
      set({ annotationData: [] });
      set({ minimizedAnnotations: [] });
    },
  })
);

useAnnotationHandlerStore.getState().init();
