import { useCollaborationSessionStore } from 'explorviz-frontend/src/stores/collaboration/collaboration-session';
import { useLocalUserStore } from 'explorviz-frontend/src/stores/collaboration/local-user';
import { useMessageSenderStore } from 'explorviz-frontend/src/stores/collaboration/message-sender';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import * as THREE from 'three';

export function getLocalHighlightingColor(): THREE.Color {
  if (useCollaborationSessionStore.getState().isOnline()) {
    return useLocalUserStore.getState().color;
  } else {
    return new THREE.Color(
      useUserSettingsStore.getState().visualizationSettings.highlightedEntityColor.value
    );
  }
}

export function getHighlightingColorForEntity(entityId: string): THREE.Color {
  if (useCollaborationSessionStore.getState().isOnline()) {
    const remoteUsers = useCollaborationSessionStore
      .getState()
      .getAllRemoteUsers();
    remoteUsers.forEach((user) => {
      if (user.highlightedEntityIds.has(entityId)) {
        return user.color;
      }
    });
  }
  return getLocalHighlightingColor();
}

export function setHighlightingById(
  modelId: string,
  highlight: boolean,
  sendMessage = true
) {
  useVisualizationStore
    .getState()
    .actions.setHighlightedEntityId(modelId, highlight);
  if (sendMessage) {
    useMessageSenderStore
      .getState()
      .sendHighlightingUpdate([modelId], highlight);
  }
}

export function highlightById(modelId: string, sendMessage = true) {
  setHighlightingById(modelId, true, sendMessage);
}

export function unhighlightById(modelId: string, sendMessage = true) {
  setHighlightingById(modelId, false, sendMessage);
}

export function toggleHighlightById(modelId: string, sendMessage = true) {
  const isHighlighted = useVisualizationStore
    .getState()
    .highlightedEntityIds.has(modelId);
  setHighlightingById(modelId, !isHighlighted, sendMessage);
}

export function removeAllHighlighting(sendMessage = true) {
  useVisualizationStore.getState().actions.removeAllHighlightedEntityIds();

  if (sendMessage) {
    useMessageSenderStore.getState().sendAllHighlightsReset();
  }
}
