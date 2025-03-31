import { create } from 'zustand';
import { useCollaborationSessionStore } from 'explorviz-frontend/src/stores/collaboration/collaboration-session';
import { useLocalUserStore } from 'explorviz-frontend/src/stores/collaboration/local-user';
import { useMessageSenderStore } from 'explorviz-frontend/src/stores/collaboration/message-sender';
import { useApplicationRendererStore } from 'explorviz-frontend/src/stores/application-renderer';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { useLinkRendererStore } from 'explorviz-frontend/src/stores/link-renderer';
import { useChatStore } from 'explorviz-frontend/src/stores/chat';
import * as Highlighting from 'explorviz-frontend/src/utils/application-rendering/highlighting';
import { Color } from 'three';
import { Trace } from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/dynamic-data';
import { StructureLandscapeData } from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import ApplicationObject3D from 'explorviz-frontend/src/view-objects/3d/application/application-object-3d';
import ClazzCommunicationMesh from 'explorviz-frontend/src/view-objects/3d/application/clazz-communication-mesh';
import ClazzMesh from 'explorviz-frontend/src/view-objects/3d/application/clazz-mesh';
import ComponentMesh from 'explorviz-frontend/src/view-objects/3d/application/component-mesh';
import FoundationMesh from 'explorviz-frontend/src/view-objects/3d/application/foundation-mesh';
import {
  EntityMesh,
  isEntityMesh,
} from 'explorviz-frontend/src/utils/extended-reality/vr-helpers/detail-info-composer';
import {
  getAllAncestorComponents,
  openComponentsByList,
} from 'explorviz-frontend/src/utils/application-rendering/entity-manipulation';

type HighlightOptions = { sendMessage?: boolean; remoteColor?: THREE.Color };

interface HighlightingState {
  hoveredOnHighlightedMesh: boolean;
  applyHighlightingOnHover: () => boolean;
  opacity: () => number;
  highlightingColor: () => Color;
  updateHighlighting: () => void;
  highlightById: (
    modelId: string,
    sendMessage: boolean,
    color?: THREE.Color
  ) => void;
  toggleHighlightById: (
    modelId: string,
    color?: THREE.Color,
    sendMessage?: boolean
  ) => void;
  highlightTrace: (
    trace: Trace,
    traceStep: string,
    applicationObject3D: ApplicationObject3D,
    structureData: StructureLandscapeData
  ) => void;
  toggleHighlight: (mesh: EntityMesh, options?: HighlightOptions) => void;
  highlight: (mesh: EntityMesh, options?: HighlightOptions) => void;
  highlightReplay: (userId: string, appId: string, entityId: string) => void;
  unhighlight: (mesh: EntityMesh, options?: HighlightOptions) => void;
  unhighlightById: (
    modelId: string,
    sendMessage: boolean,
    color?: THREE.Color
  ) => void;
  updateHighlightingOnHover: (hoveredOnHighlightedMesh: boolean) => void;
  removeHighlightingForAllApplications: (sendMessage: boolean) => void;
  resetColorsOfHighlightedEntities: () => void;
  _getParams: () => {
    communicationMeshes: ClazzCommunicationMesh[];
    applications: ApplicationObject3D[];
  };
  _handleHighlightForLink: (
    mesh: ClazzCommunicationMesh,
    highlighted: boolean,
    options?: HighlightOptions
  ) => void;
  _handleHighlightForComponent: (
    application: ApplicationObject3D,
    object: THREE.Object3D,
    highlighted: boolean,
    options?: HighlightOptions
  ) => void;
  _turnLandscapeOpaque: () => void;
  _setHightlightStatusForMesh: (
    application: ApplicationObject3D,
    mesh: FoundationMesh | ComponentMesh | ClazzMesh | ClazzCommunicationMesh,
    highlighted: boolean,
    color?: THREE.Color
  ) => void;
  _getEntityType: (mesh: Highlighting.HighlightableMesh) => string;
}

export const useHighlightingStore = create<HighlightingState>((set, get) => ({
  hoveredOnHighlightedMesh: false,

  applyHighlightingOnHover: () => {
    return useUserSettingsStore.getState().visualizationSettings
      .applyHighlightingOnHover.value;
  },

  opacity: () => {
    return useUserSettingsStore.getState().visualizationSettings
      .transparencyIntensity.value;
  },

  highlightingColor: () => {
    if (useCollaborationSessionStore.getState().isOnline()) {
      return useLocalUserStore.getState().color;
    } else {
      return useUserSettingsStore.getState().colors!.highlightedEntityColor;
    }
  },

  updateHighlighting: () => {
    if (get().applyHighlightingOnHover() && !get().hoveredOnHighlightedMesh) {
      get()._turnLandscapeOpaque();
    } else {
      const { communicationMeshes, applications } = get()._getParams();
      Highlighting.updateHighlighting(
        applications,
        communicationMeshes,
        get().opacity()
      );
    }
  },

  highlightById: (
    modelId: string,
    sendMessage = false,
    color?: THREE.Color
  ) => {
    const mesh = useApplicationRendererStore.getState().getMeshById(modelId);
    if (isEntityMesh(mesh)) {
      get().highlight(mesh, { sendMessage, remoteColor: color });
    }
  },

  toggleHighlightById: (
    modelId: string,
    color?: THREE.Color,
    sendMessage = false
  ) => {
    const mesh = useApplicationRendererStore.getState().getMeshById(modelId);
    if (isEntityMesh(mesh)) {
      get().toggleHighlight(mesh, { sendMessage, remoteColor: color });
    }
  },

  highlightTrace: (
    trace: Trace,
    traceStep: string,
    applicationObject3D: ApplicationObject3D,
    structureData: StructureLandscapeData
  ) => {
    const classCommunications = useApplicationRendererStore
      .getState()
      .getClassCommunications(applicationObject3D);

    useApplicationRendererStore
      .getState()
      .openAllComponents(applicationObject3D);
    Highlighting.highlightTrace(
      trace,
      traceStep,
      applicationObject3D,
      classCommunications,
      structureData,
      get().opacity()
    );
  },

  toggleHighlight: (mesh: EntityMesh, options?: HighlightOptions) => {
    if (mesh.highlighted) {
      get().unhighlight(mesh, options);
    } else {
      get().highlight(mesh, options);
    }
  },

  highlight: (mesh: EntityMesh, options?: HighlightOptions) => {
    const { parent } = mesh;
    if (parent instanceof ApplicationObject3D) {
      // Includes app-internal communication
      get()._handleHighlightForComponent(parent, mesh, true, options);
    } else if (mesh instanceof ClazzCommunicationMesh) {
      // Communication between applications
      get()._handleHighlightForLink(mesh, true, options);
    }
    get().updateHighlighting();
  },

  highlightReplay: (userId: string, appId: string, entityId: string) => {
    const user = useCollaborationSessionStore
      .getState()
      .lookupRemoteUserById(userId);
    const userColor = user ? user.color : useLocalUserStore.getState().color;

    const application = useApplicationRendererStore
      .getState()
      .getApplicationById(appId);
    if (!application) {
      // extern communication link
      const mesh = useApplicationRendererStore.getState().getMeshById(entityId);
      if (mesh instanceof ClazzCommunicationMesh) {
        // multi selected extern links?
        get().toggleHighlight(mesh, {
          sendMessage: false,
          remoteColor: userColor,
        });
      }
      return;
    }

    const mesh: any = application.getMeshById(entityId);
    mesh.replayBlinkEffect();
  },

  unhighlight: (mesh: EntityMesh, options?: HighlightOptions) => {
    const { parent } = mesh;
    if (parent instanceof ApplicationObject3D) {
      get()._handleHighlightForComponent(parent, mesh, false, options); // Includes app-internal communication
    } else if (mesh instanceof ClazzCommunicationMesh) {
      // Communication between applications
      get()._handleHighlightForLink(mesh, false, options);
    }

    get().updateHighlighting();
  },

  unhighlightById: (
    modelId: string,
    sendMessage = true,
    color?: THREE.Color
  ) => {
    const mesh = useApplicationRendererStore.getState().getMeshById(modelId);
    if (isEntityMesh(mesh)) {
      get().unhighlight(mesh, { sendMessage, remoteColor: color });
    }
  },

  updateHighlightingOnHover: (hoveredOnHighlightedMesh: boolean) => {
    const hasStateChanged =
      get().hoveredOnHighlightedMesh !== hoveredOnHighlightedMesh;
    if (!get().applyHighlightingOnHover() || !hasStateChanged) {
      return;
    }

    set({ hoveredOnHighlightedMesh: hoveredOnHighlightedMesh });

    if (hoveredOnHighlightedMesh) {
      get().updateHighlighting();
    } else {
      get()._turnLandscapeOpaque();
    }
  },

  removeHighlightingForAllApplications: (sendMessage: boolean) => {
    const { communicationMeshes, applications } = get()._getParams();

    // Remove highlighting from applications
    applications.forEach((applicationObject3D) => {
      Highlighting.removeAllHighlightingFor(applicationObject3D);
      applicationObject3D.classCommunicationSet.clear(); // very important to put it here and not in removeHighlightingLocally (otherwise asymmetric remove possible since removeeHighlightingLocally can get called in another way)
    });

    // Remove highlighting from communication between applications
    communicationMeshes.forEach((link) => {
      link.unhighlight();
    });

    if (sendMessage) {
      useMessageSenderStore.getState().sendAllHighlightsReset();
    }
  },

  resetColorsOfHighlightedEntities: () => {
    const { applications } = get()._getParams();

    for (const applicationObject3D of applications) {
      const allMeshes = applicationObject3D.getAllMeshes();

      for (const baseMesh of allMeshes) {
        if (baseMesh.highlighted) {
          baseMesh.highlightingColor = get().highlightingColor();
          baseMesh.highlight();
        }
      }
    }

    useLinkRendererStore
      .getState()
      .getAllLinks()
      .forEach((externLink) => {
        if (externLink.highlighted) {
          externLink.highlightingColor = get().highlightingColor();
          externLink.highlight();
        }
      });
  },

  _getParams: (): {
    communicationMeshes: ClazzCommunicationMesh[];
    applications: ApplicationObject3D[];
  } => {
    const communicationMeshes = useLinkRendererStore.getState().getAllLinks();

    const applications = useApplicationRendererStore
      .getState()
      .getOpenApplications();
    applications.forEach((applicationObject3D: ApplicationObject3D) => {
      communicationMeshes.push(...applicationObject3D.getCommMeshes());
    });

    return {
      communicationMeshes: communicationMeshes,
      applications: applications,
    };
  },

  _handleHighlightForLink: (
    mesh: ClazzCommunicationMesh,
    highlighted: boolean,
    options?: HighlightOptions
  ) => {
    if (
      !useUserSettingsStore.getState().visualizationSettings
        .enableMultipleHighlighting.value
    ) {
      get().removeHighlightingForAllApplications(false);
    }

    mesh.highlightingColor = options?.remoteColor || get().highlightingColor();
    if (highlighted) {
      mesh.highlight();
    } else {
      mesh.unhighlight();
    }

    get().updateHighlighting();

    if (options?.sendMessage) {
      useMessageSenderStore
        .getState()
        .sendHighlightingUpdate(
          '',
          get()._getEntityType(mesh),
          mesh.getModelId(),
          mesh.highlighted,
          useUserSettingsStore.getState().visualizationSettings
            .enableMultipleHighlighting.value
        );
      if (highlighted) {
        useChatStore
          .getState()
          .sendChatMessage(
            useLocalUserStore.getState().userId,
            `${useLocalUserStore.getState().userName}(${useLocalUserStore.getState().userId}) highlighted a link`,
            true,
            'highlight',
            ['', mesh.getModelId()]
          );
      }
    }
  },

  _handleHighlightForComponent: (
    application: ApplicationObject3D,
    object: THREE.Object3D,
    highlighted: boolean,
    options?: HighlightOptions
  ) => {
    if (!Highlighting.isHighlightableMesh(object)) {
      return;
    }

    // Open parent components when nested entity is highlighted
    if (
      highlighted &&
      (object instanceof ComponentMesh || object instanceof ClazzMesh)
    ) {
      const didOpenComponent = openComponentsByList(
        getAllAncestorComponents(object.dataModel),
        application
      );
      // Only update application if component state did change
      if (didOpenComponent) {
        useApplicationRendererStore
          .getState()
          .updateApplicationObject3DAfterUpdate(application);
      }
    }

    get()._setHightlightStatusForMesh(
      application,
      object,
      highlighted,
      options?.remoteColor
    );

    if (options?.sendMessage) {
      const appId = application.getModelId();
      const entityType = get()._getEntityType(object);
      const entityId = object.getModelId();

      useMessageSenderStore
        .getState()
        .sendHighlightingUpdate(
          appId,
          entityType,
          entityId,
          object.highlighted,
          useUserSettingsStore.getState().visualizationSettings
            .enableMultipleHighlighting.value
        );
      if (highlighted) {
        useChatStore
          .getState()
          .sendChatMessage(
            useLocalUserStore.getState().userId,
            `${useLocalUserStore.getState().userName}(${useLocalUserStore.getState().userId}) highlighted ${object.dataModel.name}`,
            true,
            'highlight',
            [appId, entityId]
          );
      }
    }
  },

  _turnLandscapeOpaque: () => {
    const { communicationMeshes, applications } = get()._getParams();
    applications.forEach((applicationObject3D) => {
      applicationObject3D.turnOpaque();
    });
    communicationMeshes.forEach((link) => {
      link.turnOpaque();
    });
  },

  _setHightlightStatusForMesh: (
    application: ApplicationObject3D,
    mesh: FoundationMesh | ComponentMesh | ClazzMesh | ClazzCommunicationMesh,
    highlighted: boolean,
    color?: THREE.Color
  ) => {
    mesh.highlightingColor = color || get().highlightingColor();

    if (
      !useUserSettingsStore.getState().visualizationSettings
        .enableMultipleHighlighting.value
    ) {
      get().removeHighlightingForAllApplications(false);
    }

    Highlighting.setHightlightStatusForMesh(
      mesh.getModelId(),
      application,
      highlighted
    );
  },

  _getEntityType: (mesh: Highlighting.HighlightableMesh): string => {
    return mesh.constructor.name;
  },
}));
