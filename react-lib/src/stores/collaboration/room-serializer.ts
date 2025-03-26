import { create } from 'zustand';
import {
  useApplicationRendererStore,
  AddApplicationArgs,
} from 'react-lib/src/stores/application-renderer';
import { useLandscapeTokenStore } from 'react-lib/src/stores/landscape-token';
import { useLinkRendererStore } from 'react-lib/src/stores/link-renderer';
import { useTimestampStore } from 'react-lib/src/stores/timestamp';
import { isTrace } from 'react-lib/src/utils/landscape-schemes/dynamic/dynamic-data';
import ApplicationObject3D from 'react-lib/src/view-objects/3d/application/application-object-3d';
import ClazzCommunicationMesh from 'react-lib/src/view-objects/3d/application/clazz-communication-mesh';
import ClazzMesh from 'react-lib/src/view-objects/3d/application/clazz-mesh';
import ComponentMesh from 'react-lib/src/view-objects/3d/application/component-mesh';
import FoundationMesh from 'react-lib/src/view-objects/3d/application/foundation-mesh';
import * as THREE from 'three';
import { useDetachedMenuGroupsStore } from 'react-lib/src/stores/extended-reality/detached-menu-groups';
import {
  DetachableMenu,
  isDetachableMenu,
} from 'react-lib/src/utils/extended-reality/vr-menus/detachable-menu';
import {
  SerializedAnnotation,
  SerializedApp,
  SerializedDetachedMenu,
  SerializedHighlightedComponent,
  SerializedLandscape,
  SerializedPopup,
  SerializedRoom,
} from 'react-lib/src/utils/collaboration/web-socket-messages/types/serialized-room';
import PopupData from 'react-lib/src/components/visualization/rendering/popups/popup-data';
import AnnotationData from 'react-lib/src/components/visualization/rendering/annotations/annotation-data';

// TODO: Is not used yet (imports and so on)
// Has imports of components and stores that doesn't exist right now

interface RoomSerializerState {
  serializedRoom?: SerializedRoom;
  serializeRoom: (
    popupData?: PopupData[],
    annotationData?: AnnotationData[],
    snapshot?: boolean
  ) => SerializedRoom;
  _serializeLandscape: () => SerializedLandscape;
  _serializeOpenApplications: () => SerializedApp[];
  serializeApplication: (application: ApplicationObject3D) => {
    id: string;
    position: THREE.Vector3Tuple;
    quaternion: number[];
    scale: THREE.Vector3Tuple;
    openComponents: string[];
    transparentComponents: string[];
    highlightedComponents: {
      appId: string;
      userId: string;
      entityType: string;
      entityId: string;
      isHighlighted: boolean;
      color: number[];
    }[];
  };
  serializeToAddApplicationArgs: (
    application: ApplicationObject3D | SerializedApp
  ) => AddApplicationArgs;
  _serializeHighlightedComponent: (application: ApplicationObject3D) => {
    appId: string;
    userId: string;
    entityType: string;
    entityId: string;
    isHighlighted: boolean;
    color: number[];
  }[];
  _serializeOpenPopups: (
    popupData: PopupData[],
    snapshot: boolean
  ) => SerializedPopup[];
  _serializeOpenAnnotations: (
    annotationData: AnnotationData[],
    snapshot: boolean
  ) => SerializedAnnotation[];
  _serializeDetachedMenus: () => SerializedDetachedMenu[];
  _serializehighlightedExternCommunicationLinks: () => SerializedHighlightedComponent[];
  setSerializedRoom: (room: SerializedRoom | undefined) => void;
}

export const useRoomSerializerStore = create<RoomSerializerState>(
  (set, get) => ({
    serializedRoom: undefined,

    setSerializedRoom: (room: SerializedRoom | undefined) => {
      set({ serializedRoom: room });
    },

    serializeRoom: (
      popupData: PopupData[] = [],
      annotationData: AnnotationData[] = [],
      snapshot: boolean = false
    ): SerializedRoom => {
      const serializedRoom = {
        landscape: get()._serializeLandscape(),
        openApps: get()._serializeOpenApplications(),
        highlightedExternCommunicationLinks:
          get()._serializehighlightedExternCommunicationLinks(),
        popups: get()._serializeOpenPopups(popupData, snapshot),
        annotations: get()._serializeOpenAnnotations(annotationData, snapshot), // TODO: previously annotationData, snapshot),
        detachedMenus: get()._serializeDetachedMenus(),
      };
      return serializedRoom;
    },

    // ToDo: Add both global and local positions
    // private
    _serializeLandscape: (): SerializedLandscape => {
      return {
        landscapeToken: useLandscapeTokenStore.getState().token?.value,
        timestamp: useTimestampStore.getState().timestamp, // TODO: wrong?
      };
    },

    // ToDo: Add both global and local positions
    // private
    _serializeOpenApplications(): SerializedApp[] {
      return useApplicationRendererStore
        .getState()
        .getOpenApplications()
        .map((application) => get().serializeApplication(application));
    },

    serializeApplication: (application: ApplicationObject3D) => {
      // collect transparent extern links
      const transparentExternLinks: Set<string> = new Set();
      useLinkRendererStore
        .getState()
        .getAllLinks()
        .forEach((link) => {
          if (link.dataModel.application.id === application.getModelId()) {
            if (link.material.opacity !== 1) {
              transparentExternLinks.add(link.getModelId());
            }
          }
        });

      return {
        id: application.getModelId(),
        position: application.position.toArray(),
        quaternion: application.quaternion.toArray(),
        scale: application.scale.toArray(),
        openComponents: Array.from(application.openComponentIds),
        transparentComponents: Array.from(
          new Set([
            ...application.transparentComponentIds,
            ...transparentExternLinks,
          ])
        ),
        highlightedComponents:
          get()._serializeHighlightedComponent(application),
      };
    },

    serializeToAddApplicationArgs: (
      application: ApplicationObject3D | SerializedApp
    ): AddApplicationArgs => {
      let serializedApp;
      if (application instanceof ApplicationObject3D) {
        serializedApp = get().serializeApplication(application);
      } else {
        serializedApp = application;
      }

      return {
        position: new THREE.Vector3(...serializedApp.position),
        quaternion: new THREE.Quaternion(...serializedApp.quaternion),
        scale: new THREE.Vector3(...serializedApp.scale),
        openComponents: new Set(serializedApp.openComponents),
        transparentComponents: new Set(serializedApp.transparentComponents),
        highlightedComponents: serializedApp.highlightedComponents.map(
          (highlightedComponent) => ({
            entityType: highlightedComponent.entityType,
            entityId: highlightedComponent.entityId,
            color: new THREE.Color().fromArray(highlightedComponent.color),
          })
        ),
      };
    },

    // private
    _serializeHighlightedComponent: (application: ApplicationObject3D) => {
      const { highlightedEntity } = application;
      if (highlightedEntity && !isTrace(highlightedEntity)) {
        const list: {
          appId: string;
          userId: string;
          entityType: string;
          entityId: string;
          isHighlighted: boolean;
          color: number[];
        }[] = [];

        Array.from(highlightedEntity.keys()).forEach((meshId) => {
          const color = application
            .getMeshById(meshId)
            ?.highlightingColor.toArray();
          const entityType = application.getMeshById(meshId);
          if (color && entityType) {
            const item = {
              appId: application.getModelId(),
              userId: '1',
              entityType: entityType.constructor.name,
              entityId: (
                application.getMeshById(meshId) as
                  | ComponentMesh
                  | ClazzMesh
                  | ClazzCommunicationMesh
                  | FoundationMesh
              ).getModelId(),
              isHighlighted: true,
              color: color,
            };
            list.push(item);
          }
        });

        return list;
      }
      return [];
    },

    /**
     * Change that if snapshot is created, that the pop up does not need to be shared
     * We always want to save a popup if pinned
     * @param popupData
     * @returns
     */
    // private
    _serializeOpenPopups: (
      popupData: PopupData[],
      snapshot: boolean
    ): SerializedPopup[] => {
      return popupData
        .filter((popup) => {
          return (
            (popup.isPinned && popup.sharedBy) || (popup.isPinned && snapshot)
          );
        })
        .map((popup) => {
          return {
            userId: popup.sharedBy,
            entityId: popup.mesh.dataModel.id,
            menuId: popup.menuId,
          };
        });
    },

    // private
    _serializeOpenAnnotations: (
      annotationData: AnnotationData[],
      snapshot: boolean
    ): SerializedAnnotation[] => {
      return annotationData
        .filter((annotation) => {
          return annotation.shared || snapshot;
        })
        .map((annotation) => {
          let entityId = undefined;

          if (annotation.entity !== undefined) {
            entityId = annotation.entity.id;
          }
          return {
            objectId: null,
            annotationId: annotation.annotationId,
            userId: annotation.sharedBy,
            entityId: entityId,
            menuId: annotation.menuId,
            annotationText: annotation.annotationText,
            annotationTitle: annotation.annotationTitle,
            owner: annotation.owner,
            shared: snapshot ? false : true,
            inEdit: annotation.inEdit,
            lastEditor: annotation.lastEditor,
          };
        });
    },

    // private
    _serializeDetachedMenus: (): SerializedDetachedMenu[] => {
      return useDetachedMenuGroupsStore
        .getState()
        .getDetachedMenus()
        .filter((detachedMenuGroup) =>
          isDetachableMenu(detachedMenuGroup.currentMenu)
        )
        .map((detachedMenuGroup) => {
          const detachedMenu = detachedMenuGroup.currentMenu as DetachableMenu;
          return {
            userId: null, // TODO Check if this works
            objectId: detachedMenuGroup.getGrabId(),
            entityId: detachedMenu.getDetachId(),
            entityType: detachedMenu.getEntityType(),
            position: detachedMenuGroup
              .getWorldPosition(new THREE.Vector3())
              .toArray(),
            quaternion: detachedMenuGroup
              .getWorldQuaternion(new THREE.Quaternion())
              .toArray(),
            scale: detachedMenuGroup.scale.toArray(),
          };
        });
    },

    // private
    _serializehighlightedExternCommunicationLinks:
      (): SerializedHighlightedComponent[] => {
        return useLinkRendererStore
          .getState()
          .getAllLinks()
          .filter((externLinkMesh) => externLinkMesh.highlighted)
          .map((externLinkMesh) => {
            const color = (externLinkMesh.material as THREE.MeshBasicMaterial)
              .color;
            return {
              userId: '', // TODO: userId
              appId: '',
              entityType: 'ClazzCommunicationMesh',
              entityId: externLinkMesh.getModelId(),
              isHighlighted: externLinkMesh.highlighted,
              color: [color.r, color.g, color.b],
            };
          });
      },
  })
);
