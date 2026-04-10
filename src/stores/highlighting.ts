import { useCameraControlsStore } from 'explorviz-frontend/src/stores/camera-controls-store';
import { useChatStore } from 'explorviz-frontend/src/stores/chat';
import { useCollaborationSessionStore } from 'explorviz-frontend/src/stores/collaboration/collaboration-session';
import { useLocalUserStore } from 'explorviz-frontend/src/stores/collaboration/local-user';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { getWorldPositionOfModel } from 'explorviz-frontend/src/utils/layout-helper';
import * as THREE from 'three';
import { create } from 'zustand';

interface HighlightingState {
  highlightingColor: () => THREE.Color;
  /**
   * Moves the camera to look at the highlighted entity identified by entityId.
   */
  lookAtEntity: (entityId: string) => void;
  /**
   * Logs a highlight action to the chat store for collaborative context.
   */
  logHighlightToChat: (entityId: string, highlight: boolean) => void;
}

export const useHighlightingStore = create<HighlightingState>((set, get) => ({
  highlightingColor: () => {
    if (useCollaborationSessionStore.getState().isOnline()) {
      return useLocalUserStore.getState().color;
    } else {
      return new THREE.Color(
        useUserSettingsStore.getState().visualizationSettings
          .highlightedEntityColor.value
      );
    }
  },

  /**
   * Moves the camera smoothly to the world position of the given entity.
   */
  lookAtEntity: (entityId: string) => {
    if (!entityId) return;

    const worldPos = getWorldPositionOfModel(entityId);
    if (!worldPos) {
      console.warn(
        `[lookAtEntity] Could not find world position for entity: ${entityId}`
      );
      return;
    }

    // Position camera above and slightly in front of the target
    const cameraOffset = new THREE.Vector3(0, 30, 30);
    const cameraPos = worldPos.clone().add(cameraOffset);

    useCameraControlsStore.getState().moveCameraTo(
      [cameraPos.x, cameraPos.y, cameraPos.z],
      [worldPos.x, worldPos.y, worldPos.z],
      true // smooth transition
    );
  },

  /**
   * Logs a highlighting action to the chat store for collaborative replay.
   * Only logs when an entity is highlighted (not when unhighlighted).
   */
  logHighlightToChat: (entityId: string, highlight: boolean) => {
    if (!highlight) return; // Only log highlights, not unhighlights

    const MAX_DISPLAY_LENGTH = 30;
    const displayId =
      entityId.length > MAX_DISPLAY_LENGTH
        ? entityId.slice(0, MAX_DISPLAY_LENGTH) + ' ...'
        : entityId;

    const msg = `🔆 Highlighted: ${displayId}`;
    useChatStore.getState().sendChatMessage(msg, true, 'highlight', [
      '', // appId placeholder
      entityId,
    ]);
  },
}));
