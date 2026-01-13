import AnnotationData from 'explorviz-frontend/src/components/visualization/rendering/annotations/annotation-data';
import { useCollaborationSessionStore } from 'explorviz-frontend/src/stores/collaboration/collaboration-session';
import { useWebSocketStore } from 'explorviz-frontend/src/stores/collaboration/web-socket';
import { useModelStore } from 'explorviz-frontend/src/stores/repos/model-repository';
import { useToastHandlerStore } from 'explorviz-frontend/src/stores/toast-handler';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { AnnotationForwardMessage } from 'explorviz-frontend/src/utils/collaboration/web-socket-messages/receivable/annotation-forward';
import { AnnotationUpdatedForwardMessage } from 'explorviz-frontend/src/utils/collaboration/web-socket-messages/receivable/annotation-updated-forward';
import { ForwardedMessage } from 'explorviz-frontend/src/utils/collaboration/web-socket-messages/receivable/forwarded';
import {
  AnnotationEditResponse,
  isAnnotationEditResponse,
} from 'explorviz-frontend/src/utils/collaboration/web-socket-messages/receivable/response/annotation-edit-response';
import {
  AnnotationResponse,
  isAnnotationResponse,
} from 'explorviz-frontend/src/utils/collaboration/web-socket-messages/receivable/response/annotation-response';
import {
  AnnotationUpdatedResponse,
  isAnnotationUpdatedResponse,
} from 'explorviz-frontend/src/utils/collaboration/web-socket-messages/receivable/response/annotation-updated-response';
import {
  ANNOTATION_CLOSED_EVENT,
  AnnotationClosedMessage,
} from 'explorviz-frontend/src/utils/collaboration/web-socket-messages/sendable/annotation-closed';
import {
  ANNOTATION_EDIT_EVENT,
  AnnotationEditMessage,
} from 'explorviz-frontend/src/utils/collaboration/web-socket-messages/sendable/annotation-edit';
import {
  ANNOTATION_OPENED_EVENT,
  AnnotationOpenedMessage,
} from 'explorviz-frontend/src/utils/collaboration/web-socket-messages/sendable/annotation-opened';
import {
  ANNOTATION_UPDATED_EVENT,
  AnnotationUpdatedMessage,
} from 'explorviz-frontend/src/utils/collaboration/web-socket-messages/sendable/annotation-updated';
import { SerializedAnnotation } from 'explorviz-frontend/src/utils/collaboration/web-socket-messages/types/serialized-room';
import eventEmitter from 'explorviz-frontend/src/utils/event-emitter';
import {
  ObjectClosedResponse,
  isObjectClosedResponse,
} from 'explorviz-frontend/src/utils/extended-reality/vr-web-wocket-messages/receivable/response/object-closed';
import ClassCommunication from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/class-communication';
import {
  Application,
  Class,
  Node,
  Package,
} from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import ClazzCommuMeshDataModel from 'explorviz-frontend/src/view-objects/3d/application/utils/clazz-communication-mesh-data-model';
import { K8sDataModel } from 'explorviz-frontend/src/view-objects/3d/k8s/k8s-mesh';
import { create } from 'zustand';
import { useAuthStore } from './auth';

type Position2D = {
  x: number;
  y: number;
};

interface AnnotationHandlerState {
  annotationData: AnnotationData[]; // tracked
  minimizedAnnotations: AnnotationData[];
  latestMousePosition: { timestamp: number; x: number; y: number };
  isShiftPressed: boolean;
  handleMouseMove: (event: MouseEvent) => void;
  clearAnnotations: () => void;
  removeUnmovedAnnotations: () => void;
  editAnnotation: (annotationData: AnnotationData) => void;
  updateAnnotation: (annotationData: AnnotationData) => void;
  removeAnnotation: (
    annotationId: number,
    stillMinimized?: boolean
  ) => Promise<void>;
  canRemoveAnnotation: (annotation: AnnotationData) => Promise<boolean>;
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
      | K8sDataModel
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
  onAnnotation: ({
    annotationId,
    objectId,
    userId,
    entityId,
    annotationTitle,
    annotationText,
    owner,
    lastEditor,
  }: AnnotationForwardMessage) => void;
  onUpdatedAnnotation: ({
    objectId,
    annotationTitle,
    annotationText,
    lastEditor,
  }: AnnotationUpdatedForwardMessage) => void;
  onRestoreAnnotations: (annotations: SerializedAnnotation[]) => void;
  onMenuClosed: ({
    originalMessage: { menuId },
  }: ForwardedMessage<AnnotationForwardMessage>) => void;
  cleanup: () => void;
  setAnnotationData: (annotations: AnnotationData[]) => void;
  setMinimizedAnnotationData: (minimizedAnnotations: AnnotationData[]) => void;
  init: () => void;
}

export const useAnnotationHandlerStore = create<AnnotationHandlerState>(
  (set, get) => ({
    annotationData: [],
    minimizedAnnotations: [],
    latestMousePosition: { timestamp: 0, x: 0, y: 0 },
    isShiftPressed: false,

    init: () => {
      eventEmitter.on(ANNOTATION_OPENED_EVENT, get().onAnnotation);
      eventEmitter.on(ANNOTATION_CLOSED_EVENT, get().onMenuClosed);
      eventEmitter.on(ANNOTATION_UPDATED_EVENT, get().onUpdatedAnnotation);
      eventEmitter.on('restore_annotations', get().onRestoreAnnotations);
    },

    setAnnotationData: (annotations: AnnotationData[]) => {
      set({ annotationData: annotations });
    },

    setMinimizedAnnotationData: (annotations: AnnotationData[]) => {
      set({ minimizedAnnotations: annotations });
    },

    handleMouseMove: (event: MouseEvent) => {
      set({
        latestMousePosition: {
          timestamp: Date.now(),
          x: event.pageX,
          y: event.pageY,
        },
        isShiftPressed: event.shiftKey,
      });
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
          if (!found && !(an.entity instanceof ClazzCommuMeshDataModel)) {
            // TODO: Update label if needed
            // useApplicationRendererStore
            //   .getState()
            //   .updateLabel(an.entityId, '');
          }
        }
      });
    },

    editAnnotation: (annotationData: AnnotationData) => {
      const annotation = get().annotationData.find(
        (an) => an.annotationId === annotationData.annotationId
      );

      if (!annotation) {
        return;
      }

      if (
        !annotation.shared ||
        !useCollaborationSessionStore.getState().isOnline()
      ) {
        set({
          annotationData: [
            ...get().annotationData.filter(
              (an) => an.annotationId !== annotationData.annotationId
            ),
            { ...annotationData, inEdit: true },
          ],
        });
        return;
      }

      useWebSocketStore
        .getState()
        .sendRespondableMessage<AnnotationEditMessage, AnnotationEditResponse>(
          ANNOTATION_EDIT_EVENT,
          {
            event: ANNOTATION_EDIT_EVENT,
            objectId: annotationData.menuId!,
            nonce: 0,
          },
          {
            responseType: isAnnotationEditResponse,
            onResponse: (response: AnnotationEditResponse) => {
              if (!response.isEditable) {
                useToastHandlerStore
                  .getState()
                  .showErrorToastMessage(
                    'Another user is currently editing this annotation.'
                  );
                return false;
              }

              set({
                annotationData: [
                  ...get().annotationData.filter(
                    (an) => an.annotationId !== annotationData.annotationId
                  ),
                  { ...annotationData, inEdit: true },
                ],
              });
              return true;
            },
            onOffline: () => {
              // Nothing
            },
          }
        );
    },

    updateAnnotation: (annotationData: AnnotationData) => {
      const annotation = get().annotationData.find(
        (an) => an.annotationId === annotationData.annotationId
      );

      if (!annotation) {
        return;
      }

      annotationData.lastEditor = useAuthStore.getState().user!.name;

      if (
        !useCollaborationSessionStore.getState().isOnline() ||
        !annotation.shared
      ) {
        set({
          annotationData: [
            ...get().annotationData.filter(
              (an) => an.annotationId !== annotationData.annotationId
            ),
            { ...annotationData, inEdit: false },
          ],
        });

        return;
      }

      useWebSocketStore
        .getState()
        .sendRespondableMessage<
          AnnotationUpdatedMessage,
          AnnotationUpdatedResponse
        >(
          ANNOTATION_UPDATED_EVENT,
          {
            event: ANNOTATION_UPDATED_EVENT,
            objectId: annotationData.menuId!,
            annotationId: annotationData.annotationId,
            annotationTitle: annotationData.annotationTitle,
            annotationText: annotationData.annotationText,
            lastEditor: annotationData.lastEditor,
            nonce: 0,
          },
          {
            responseType: isAnnotationUpdatedResponse,
            onResponse: (response: AnnotationUpdatedResponse) => {
              if (response.updated) {
                set({
                  annotationData: [
                    ...get().annotationData.filter(
                      (an) => an.annotationId !== annotationData.annotationId
                    ),
                    { ...annotation, inEdit: false },
                  ],
                });
                return true;
              } else {
                useToastHandlerStore
                  .getState()
                  .showErrorToastMessage('Something went wrong.');
                return false;
              }
            },
            onOffline: () => {
              // Not used at the moment
            },
          }
        );
    },

    removeAnnotation: async (
      annotationId: number,
      stillMinimized: boolean = false
    ): Promise<void> => {
      const annotation = get().annotationData.find(
        (an) => an.annotationId === annotationId
      );
      if (!annotation) {
        return;
      }

      if (await get().canRemoveAnnotation(annotation)) {
        // remove potential toggle effects
        // TODO: Update
        // if (annotation.entity) {
        //   const mesh = useApplicationRendererStore
        //     .getState()
        //     .getMeshById(annotation.entity.id);
        //   if (mesh?.isHovered) {
        //     mesh.resetHoverEffect();
        //   }

        //   if (
        //     !(annotation.mesh!.dataModel instanceof ClazzCommuMeshDataModel) &&
        //     !stillMinimized
        //   ) {
        //     useApplicationRendererStore
        //       .getState()
        //       .updateLabel(annotation.entity.id, '');
        //   }
        // }

        set({
          annotationData: [
            ...get().annotationData.filter(
              (an) => an.annotationId !== annotationId
            ),
          ],
        });
      } else {
        useToastHandlerStore
          .getState()
          .showErrorToastMessage(
            'Could not remove annotation since it is currently in use by another user.'
          );
      }
    },

    canRemoveAnnotation: async (
      annotation: AnnotationData
    ): Promise<boolean> => {
      if (!annotation.menuId) {
        return true;
      }

      return useWebSocketStore
        .getState()
        .sendRespondableMessage<AnnotationClosedMessage, ObjectClosedResponse>(
          ANNOTATION_CLOSED_EVENT,
          {
            event: 'annotation_closed',
            menuId: annotation.menuId,
            nonce: 0,
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
    },

    removeAnnotationAfterTimeout: (annotation: AnnotationData) => {
      const latestMousePosition = get().latestMousePosition;
      // Store popup position
      const mouseX = annotation.mouseX;
      const mouseY = annotation.mouseY;

      setTimeout(() => {
        const maybeAnnotation = get().annotationData.find(
          (ad) => ad.annotationId === annotation.annotationId
        );

        // Popup no longer available
        if (!maybeAnnotation || maybeAnnotation.wasMoved) {
          return;
        }

        // Do not remove popup when mouse stayed (recently) on target entity or shift is pressed
        if (
          get().isShiftPressed ||
          (latestMousePosition.x == get().latestMousePosition.x &&
            latestMousePosition.y == get().latestMousePosition.y)
        ) {
          get().removeAnnotationAfterTimeout(annotation);
          return;
        }

        // Annotation did not move (was not updated)
        if (
          maybeAnnotation.mouseX == mouseX &&
          maybeAnnotation.mouseY == mouseY
        ) {
          get().removeAnnotation(annotation.annotationId, true);
          return;
        }

        get().removeAnnotationAfterTimeout(annotation);
      }, useUserSettingsStore.getState().visualizationSettings.hidePopupDelay.value);
    },

    shareAnnotation: (annotation: AnnotationData) => {
      const entityId = annotation.entityId;

      if (useCollaborationSessionStore.getState().isOnline()) {
        useWebSocketStore
          .getState()
          .sendRespondableMessage<AnnotationOpenedMessage, AnnotationResponse>(
            ANNOTATION_OPENED_EVENT,
            {
              event: ANNOTATION_OPENED_EVENT,
              annotationId: annotation.annotationId,
              entityId: entityId,
              menuId: annotation.menuId,
              annotationTitle: annotation.annotationTitle,
              annotationText: annotation.annotationText,
              owner: annotation.owner,
              inEdit: annotation.inEdit,
              lastEditor: annotation.lastEditor,
              nonce: 0,
            },
            {
              responseType: isAnnotationResponse,
              onResponse: (response: AnnotationResponse) => {
                const sharedBy = useAuthStore.getState().user!.sub;
                const menuId = response.objectId;
                const shared = true;

                set({
                  annotationData: [
                    ...get().annotationData.filter(
                      (an) => an.annotationId !== annotation.annotationId
                    ),
                    {
                      ...annotation,
                      sharedBy: sharedBy,
                      menuId: menuId,
                      shared: shared,
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
        | K8sDataModel
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
          set({ annotationData: [...get().annotationData, annotations[0]] });
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

    onAnnotation: ({
      annotationId,
      objectId,
      userId,
      entityId,
      annotationTitle,
      annotationText,
      owner,
      lastEditor,
    }: AnnotationForwardMessage) => {
      get().addAnnotation({
        annotationId: annotationId,
        entityId: entityId,
        entity: entityId
          ? useModelStore.getState().getModel(entityId)
          : undefined,
        position: undefined,
        wasMoved: true,
        menuId: objectId,
        hovered: false,
        annotationTitle: annotationTitle,
        annotationText: annotationText,
        sharedBy: userId,
        owner: owner,
        shared: true,
        inEdit: false,
        lastEditor: lastEditor,
      });
    },

    onUpdatedAnnotation: ({
      objectId,
      annotationTitle,
      annotationText,
      lastEditor,
    }: AnnotationUpdatedForwardMessage) => {
      let annotation = get().annotationData.find(
        (an) => an.menuId === objectId
      );

      if (!annotation) {
        annotation = get().minimizedAnnotations.find(
          (an) => an.menuId === objectId
        );

        if (!annotation) {
          return;
        }

        set({
          minimizedAnnotations: [
            ...get().minimizedAnnotations.filter(
              (an) => an.menuId === objectId
            ),
            {
              ...annotation,
              annotationTitle: annotationTitle,
              annotationText: annotationText,
              lastEditor: lastEditor,
            },
          ],
        });
      }

      set({
        annotationData: [
          ...get().annotationData.filter((an) => an.menuId === objectId),
          {
            ...annotation,
            annotationTitle: annotationTitle,
            annotationText: annotationText,
            lastEditor: lastEditor,
          },
        ],
      });
    },

    onRestoreAnnotations: (annotations: SerializedAnnotation[]) => {
      set({ annotationData: [] });

      for (const annotation of annotations) {
        get().addAnnotation({
          annotationId: annotation.annotationId,
          entityId: annotation.entityId,
          entity: annotation.entityId
            ? useModelStore.getState().getModel(annotation.entityId)
            : undefined,
          position: undefined,
          wasMoved: true,
          menuId: annotation.menuId || null,
          hovered: false,
          annotationTitle: annotation.annotationTitle,
          annotationText: annotation.annotationText,
          sharedBy: annotation.userId,
          owner: annotation.owner,
          shared: annotation.shared !== undefined ? annotation.shared : true,
          inEdit: false,
          lastEditor: annotation.lastEditor,
        });
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

    onMenuClosed: ({
      originalMessage: { menuId },
    }: ForwardedMessage<AnnotationForwardMessage>): void => {
      if (menuId) {
        const allAnnotations = [
          ...get().annotationData,
          ...get().minimizedAnnotations,
        ];

        const anno = allAnnotations.find((an) => an.menuId === menuId);

        // ToDo: Migrate
        // if (anno) {
        //   if (anno.entity) {
        //     const mesh = useApplicationRendererStore
        //       .getState()
        //       .getMeshById(anno.entity.id);
        //     if (mesh?.isHovered) {
        //       mesh.resetHoverEffect();
        //     }

        //     if (!(anno.mesh!.dataModel instanceof ClazzCommuMeshDataModel)) {
        //       useApplicationRendererStore
        //         .getState()
        //         .updateLabel(anno.entity.id, '');
        //     }
        //   }
        // }

        set({
          minimizedAnnotations: get().minimizedAnnotations.filter(
            (an) => an.menuId !== menuId
          ),
        });
        set({
          annotationData: get().annotationData.filter(
            (an) => an.menuId !== menuId
          ),
        });
      }
    },

    cleanup: () => {
      set({ annotationData: [] });
      set({ minimizedAnnotations: [] });
      // TODO: This can create errors when leaving a landscape a second time
      // useWebSocketStore.getState().off(ANNOTATION_OPENED_EVENT, get(), get().onAnnotation);
      // useWebSocketStore.getState().off(ANNOTATION_CLOSED_EVENT, get(), get().onMenuClosed);
      // useWebSocketStore.getState().off(
      //   ANNOTATION_UPDATED_EVENT,
      //   get(),
      //   get().onUpdatedAnnotation
      // );
      // useDetachedMenuRendererStore.getState().off(
      //   "restore_annotations",
      //   get(),
      //   get().onRestoreAnnotations
      // );
    },
  })
);

useAnnotationHandlerStore.getState().init();
