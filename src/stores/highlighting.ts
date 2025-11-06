import { useCollaborationSessionStore } from 'explorviz-frontend/src/stores/collaboration/collaboration-session';
import { useLocalUserStore } from 'explorviz-frontend/src/stores/collaboration/local-user';
import { useMessageSenderStore } from 'explorviz-frontend/src/stores/collaboration/message-sender';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import { Trace } from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/dynamic-data';
import { StructureLandscapeData } from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import * as THREE from 'three';
import { Color } from 'three';
import { create } from 'zustand';

type HighlightOptions = { sendMessage?: boolean; remoteColor?: THREE.Color };

interface HighlightingState {
  highlightingColor: () => Color;
  highlightById: (modelId: string, sendMessage: boolean) => void;
  unhighlightById: (modelId: string, sendMessage: boolean) => void;
  toggleHighlightById: (modelId: string, sendMessage?: boolean) => void;
  highlightTrace: (
    trace: Trace,
    traceStep: string,
    applicationObject3D: ApplicationObject3D,
    structureData: StructureLandscapeData
  ) => void;
  highlightReplay: (userId: string, appId: string, entityId: string) => void;
  removeHighlightingForAllApplications: (sendMessage: boolean) => void;
  resetColorsOfHighlightedEntities: () => void;
}

export const useHighlightingStore = create<HighlightingState>((set, get) => ({
  highlightingColor: () => {
    if (useCollaborationSessionStore.getState().isOnline()) {
      return useLocalUserStore.getState().color;
    } else {
      return new THREE.Color(
        useUserSettingsStore.getState().visualizationSettings.highlightedEntityColor.value
      );
    }
  },

  highlightById: (modelId: string, options?: HighlightOptions) => {
    useVisualizationStore
      .getState()
      .actions.setHighlightedEntityId(modelId, true);
    if (options?.sendMessage ?? true) {
      useMessageSenderStore.getState().sendHighlightingUpdate([modelId], true);
    }
  },

  unhighlightById: (modelId: string, options?: HighlightOptions) => {
    useVisualizationStore
      .getState()
      .actions.setHighlightedEntityId(modelId, false);
    if (options?.sendMessage ?? true) {
      useMessageSenderStore.getState().sendHighlightingUpdate([modelId], false);
    }
  },

  toggleHighlightById: (modelId: string, options?: HighlightOptions) => {
    useVisualizationStore
      .getState()
      .actions.setHighlightedEntityId(modelId, false);
    if (options?.sendMessage ?? true) {
      useMessageSenderStore.getState().sendHighlightingUpdate([modelId], false);
    }
  },

  highlightTrace: (
    trace: Trace,
    traceStep: string,
    applicationObject3D: ApplicationObject3D,
    structureData: StructureLandscapeData
  ) => {
    // ToDo
  },

  highlightReplay: (userId: string, appId: string, entityId: string) => {
    // ToDo:
    // const user = useCollaborationSessionStore
    //   .getState()
    //   .lookupRemoteUserById(userId);
    // const userColor = user ? user.color : useLocalUserStore.getState().color;
    // const application = useApplicationRendererStore
    //   .getState()
    //   .getApplicationById(appId);
    // if (!application) {
    //   // extern communication link
    //   const mesh = useApplicationRendererStore.getState().getMeshById(entityId);
    //   if (mesh instanceof ClazzCommunicationMesh) {
    //     // multi selected extern links?
    //     get().toggleHighlight(mesh, {
    //       sendMessage: false,
    //       remoteColor: userColor,
    //     });
    //   }
    //   return;
    // }
    // const mesh: any = application.getMeshById(entityId);
    // mesh.replayBlinkEffect();
  },

  removeHighlightingForAllApplications: (sendMessage = true) => {
    useVisualizationStore.getState().actions.removeAllHighlightedEntityIds();

    if (sendMessage) {
      useMessageSenderStore.getState().sendAllHighlightsReset();
    }
  },

  resetColorsOfHighlightedEntities: () => {
    // ToDo
  },
}));
