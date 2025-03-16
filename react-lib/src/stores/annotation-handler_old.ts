import { createStore } from "zustand/vanilla";
// import AnnotationData from 'explorviz-frontend/components/visualization/rendering/annotations/annotation-data';
import {
  ANNOTATION_CLOSED_EVENT,
  AnnotationClosedMessage,
} from "react-lib/src/utils/collaboration/web-socket-messages/sendable/annotation-closed";
import {
  ObjectClosedResponse,
  isObjectClosedResponse,
} from "react-lib/src/utils/extended-reality/vr-web-wocket-messages/receivable/response/object-closed";
import { AnnotationForwardMessage } from "react-lib/src/utils/collaboration/web-socket-messages/receivable/annotation-forward";
import { AnnotationUpdatedForwardMessage } from "react-lib/src/utils/collaboration/web-socket-messages/receivable/annotation-updated-forward";

interface AnnotationHandlerState {
  // annotationData: AnnotationData[];
  // minimizedAnnotations: AnnotationData[];
  latestMousePosition: { timestamp: number; x: number; y: number };
  isShiftPressed: boolean;
  handleMouseMove: (event: MouseEvent) => void;
  //   canRemoveAnnotation:(annotation: AnnotationData) => boolean;
  //   removeAnnotationAfterTimeout:(annotation: AnnotationData) => void;
  //   updateExistingAnnotation: (
  //     annotation: AnnotationData,
  //     newAnnotation: AnnotationData
  //   ) => void;
  // onAnnotation: ({
  //   annotationId,
  //   objectId,
  //   userId,
  //   entityId,
  //   annotationTitle,
  //   annotationText,
  //   owner,
  //   lastEditor,
  // }: AnnotationForwardMessage) => void;
  //   onUpdatedAnnotation: ({
  //     objectId,
  //     annotationTitle,
  //     annotationText,
  //     lastEditor,
  //   }: AnnotationUpdatedForwardMessage) => void;
  //   onRestoreAnnotations:(annotations: SerializedAnnotation[]) => void;
  //   willDestroy:() => void;
}

export const useAnnotationHandlerStore = createStore<AnnotationHandlerState>(
  (set, get) => ({
    // annotationData: [],
    // minimizedAnnotations: [],
    latestMousePosition: { timestamp: 0, x: 0, y: 0 },
    isShiftPressed: false,
    handleMouseMove: (event: MouseEvent) => {
      const state = get();
      state.latestMousePosition = {
        timestamp: Date.now(),
        x: event.pageX,
        y: event.pageY,
      };
      state.isShiftPressed = event.shiftKey;
    },
    // canRemoveAnnotation: (annotation: AnnotationData) => {
    //   const state = get();
    //   if (!annotation.menuId) {
    //     return true;
    //   }

    //   return state.webSocket.sendRespondableMessage<
    //     AnnotationClosedMessage,
    //     ObjectClosedResponse
    //   >(
    //     ANNOTATION_CLOSED_EVENT,
    //     {
    //       event: "annotation_closed",
    //       menuId: annotation.menuId,
    //       nonce: 0,
    //     },
    //     {
    //       responseType: isObjectClosedResponse,
    //       onResponse: (response: ObjectClosedResponse) => {
    //         return response.isSuccess;
    //       },
    //       onOffline: () => {
    //         return true;
    //       },
    //     }
    //   );
    // },
    // removeAnnotationAfterTimeout:(annotation: AnnotationData) => {
    //   const state = get();
    //   const latestMousePosition = state.latestMousePosition;
    //   // Store popup position
    //   const mouseX = annotation.mouseX;
    //   const mouseY = annotation.mouseY;

    //   setTimeout(() => {
    //     const maybeAnnotation = state.annotationData.find(
    //       (ad) => ad.annotationId === annotation.annotationId
    //     );

    //     // Popup no longer available
    //     if (!maybeAnnotation || maybeAnnotation.wasMoved) {
    //       return;
    //     }

    //     // Do not remove popup when mouse stayed (recently) on target entity or shift is pressed
    //     if (
    //       state.isShiftPressed ||
    //       (latestMousePosition.x == state.latestMousePosition.x &&
    //         latestMousePosition.y == state.latestMousePosition.y)
    //     ) {
    //       state.removeAnnotationAfterTimeout(annotation);
    //       return;
    //     }

    //     // Popup did not move (was not updated)
    //     if (
    //       maybeAnnotation.mouseX == mouseX &&
    //       maybeAnnotation.mouseY == mouseY
    //     ) {
    //       state.removeAnnotation(annotation.annotationId);
    //       return;
    //     }

    //     state.removeAnnotationAfterTimeout(annotation);
    //   }, getStoredSettings().hidePopupDelay.value * 1000);
    // },
    // updateExistingAnnotation:(
    //     annotation: AnnotationData,
    //     newAnnotation: AnnotationData
    //   ) => {
    //     annotation.annotationText = newAnnotation.annotationText;
    //     annotation.annotationTitle = newAnnotation.annotationTitle;
    //     get().updateMeshReference(annotation);
    //   },
    // onAnnotation: ({
    //   annotationId,
    //   objectId,
    //   userId,
    //   entityId,
    //   annotationTitle,
    //   annotationText,
    //   owner,
    //   lastEditor,
    // }: AnnotationForwardMessage) => {
    //   const state = get();
    //   let mesh = undefined;
    //   if (entityId) {
    //     mesh = state.applicationRenderer.getMeshById(entityId);
    //   }

    //   state.addAnnotation({
    //     annotationId: annotationId,
    //     mesh: mesh,
    //     position: undefined,
    //     wasMoved: true,
    //     menuId: objectId,
    //     hovered: false,
    //     annotationTitle: annotationTitle,
    //     annotationText: annotationText,
    //     sharedBy: userId,
    //     owner: owner,
    //     shared: true,
    //     inEdit: false,
    //     lastEditor: lastEditor,
    //   });
    // },
    // onUpdatedAnnotation: ({
    //   objectId,
    //   annotationTitle,
    //   annotationText,
    //   lastEditor,
    // }: AnnotationUpdatedForwardMessage) => {
    //   const state = get();
    //   let annotation = state.annotationData.find(
    //     (an) => an.menuId === objectId
    //   );

    //   if (!annotation) {
    //     annotation = state.minimizedAnnotations.find(
    //       (an) => an.menuId === objectId
    //     );

    //     if (!annotation) {
    //       return;
    //     }
    //   }

    //   annotation.annotationTitle = annotationTitle;
    //   annotation.annotationText = annotationText;
    //   annotation.lastEditor = lastEditor;
    // },
    // onRestoreAnnotations:(annotations: SerializedAnnotation[]) => {
    //   const state = get();
    //   state.annotationData = [];

    //   for (const annotation of annotations) {
    //     let mesh;
    //     if (annotation.entityId !== undefined) {
    //       mesh = state.applicationRenderer.getMeshById(annotation.entityId);
    //     } else {
    //       mesh = undefined;
    //     }

    //     state.addAnnotation({
    //       annotationId: annotation.annotationId,
    //       sharedBy: annotation.userId,
    //       mesh: mesh,
    //       position: undefined,
    //       wasMoved: true,
    //       menuId: annotation.menuId,
    //       hovered: false,
    //       annotationTitle: annotation.annotationTitle,
    //       annotationText: annotation.annotationText,
    //       owner: annotation.owner,
    //       shared: annotation.shared !== undefined ? false : true,
    //       inEdit: false,
    //       lastEditor: annotation.lastEditor,
    //     });
    //   }
    // },
    // willDestroy: () => {
    //   const state = get();
    //   state.annotationData = [];
    //   state.minimizedAnnotations = [];
    //   state.webSocket.off(ANNOTATION_OPENED_EVENT, state, state.onAnnotation);
    //   state.webSocket.off(ANNOTATION_CLOSED_EVENT, state, state.onMenuClosed);
    //   state.webSocket.off(
    //     ANNOTATION_UPDATED_EVENT,
    //     state,
    //     state.onUpdatedAnnotation
    //   );
    //   state.detachedMenuRenderer.off(
    //     "restore_annotations",
    //     state,
    //     state.onRestoreAnnotations
    //   );
    // },
  })
);
