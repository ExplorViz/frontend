import AnnotationData from 'explorviz-frontend/src/components/visualization/rendering/annotations/annotation-data';
import { SerializedAnnotation } from 'explorviz-frontend/src/utils/collaboration/web-socket-messages/types/serialized-room';
import { useModelStore } from 'explorviz-frontend/src/stores/repos/model-repository';
import AggregatedCommunication from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/aggregated-communication';

import { create } from 'zustand';
import { Building, City, District } from '../utils/landscape-schemes/flat-landscape';
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
    | City
    | District
    | Building
    | AggregatedCommunication;
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
  onRestoreAnnotations: (annotations: SerializedAnnotation[]) => void;
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
      set({ annotationData: [] });
    },

    removeUnmovedAnnotations: () => {
      // Remove annotation from minimized, if minimized one was opened and moved again
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
      set({
        annotationData: get().annotationData.filter((data) => data.wasMoved),
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

    removeAnnotation: (annotationId: number) => {
      set({
        annotationData: get().annotationData.filter((an) => an.annotationId !== annotationId),
      });
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
      | City
      | District
      | Building
      | AggregatedCommunication;
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


    onRestoreAnnotations: (annotations: SerializedAnnotation[]) => {
      const openAnnotations: AnnotationData[] = [];
      const minimized: AnnotationData[] = [];

      for (const annotation of annotations) {
        const entity =
          annotation.entityId !== undefined
            ? useModelStore.getState().getModel(annotation.entityId)
            : undefined;

        const restored = new AnnotationData({
          annotationId: annotation.annotationId,
          mouseX: annotation.mouseX ?? 100,
          mouseY: annotation.mouseY ?? 200,
          wasMoved: annotation.wasMoved ?? true,
          isAssociated: annotation.entityId !== undefined,
          entityId: annotation.entityId,
          entity,
          menuId: annotation.menuId ?? null,
          hovered: false,
          annotationText: annotation.annotationText,
          annotationTitle: annotation.annotationTitle,
          hidden: annotation.hidden ?? false,
          sharedBy: annotation.userId,
          owner: annotation.owner,
          shared: annotation.shared,
          inEdit: annotation.inEdit,
          lastEditor: annotation.lastEditor,
        });

        if (annotation.minimized) {
          minimized.push(restored);
        } else {
          openAnnotations.push(restored);
        }
      }

      const maxId = annotations.reduce(
        (max, annotation) => Math.max(max, annotation.annotationId),
        0
      );
      if (maxId >= AnnotationData.incrementer) {
        AnnotationData.incrementer = maxId + 1;
      }

      set({
        annotationData: openAnnotations,
        minimizedAnnotations: minimized,
      });
    },

    cleanup: () => {
      set({ annotationData: [] });
      set({ minimizedAnnotations: [] });
    },
  })
);

useAnnotationHandlerStore.getState().init();
