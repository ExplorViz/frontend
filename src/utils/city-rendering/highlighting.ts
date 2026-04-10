import { useLocalHighlightStore } from 'explorviz-frontend/src/stores/collaboration/local-highlight-store';
import { usePlayroomConnectionStore } from 'explorviz-frontend/src/stores/collaboration/playroom-connection-store';
import { useRemoteHighlightingStore } from 'explorviz-frontend/src/stores/collaboration/remote-highlighting-store';
import { useHighlightingStore } from 'explorviz-frontend/src/stores/highlighting';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import { myPlayer } from 'playroomkit';
import * as THREE from 'three';

export function getLocalHighlightingColor(): THREE.Color {
  const isConnected = usePlayroomConnectionStore.getState().isConnected;
  const me = myPlayer();
  // If in a room, use the playroomkit profile color
  if (isConnected && me) {
    return new THREE.Color(me.getProfile().color.hexString);
  }
  // If not in a room, use the local highlighting color from the settings
  else {
    return new THREE.Color(
      useUserSettingsStore.getState().visualizationSettings
        .highlightedEntityColor.value
    );
  }
}

export function getHighlightingColorForEntity(entityId: string): THREE.Color {
  // 1. Check if the entity is highlighted by the local user
  const isHighlightedLocally = useLocalHighlightStore
    .getState()
    .localHighlightedIds.has(entityId);
  if (isHighlightedLocally) {
    return getLocalHighlightingColor();
  }

  // 2. Otherwise, check if it is highlighted by a remote user
  const isConnected = usePlayroomConnectionStore.getState().isConnected;
  if (isConnected) {
    const remoteColorHex = useRemoteHighlightingStore
      .getState()
      .getColor(entityId);
    if (remoteColorHex) {
      return new THREE.Color(remoteColorHex);
    }
  }

  // Fallback
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

  useLocalHighlightStore.getState().setHighlighted(modelId, highlight);

  const isConnected = usePlayroomConnectionStore.getState().isConnected;
  if (isConnected) {
    try {
      if (sendMessage) {
        // Log to chat for replay
        useHighlightingStore.getState().logHighlightToChat(modelId, highlight);
      }

      const allMyHighlights = Array.from(
        useLocalHighlightStore.getState().localHighlightedIds
      );
      myPlayer().setState('highlightedEntities', allMyHighlights);
    } catch (e) {
      console.warn('Playroom Highlighting Update failed:', e);
    }
  }
}

export function highlightById(modelId: string, sendMessage = true) {
  setHighlightingById(modelId, true, sendMessage);
}

export function unhighlightById(modelId: string, sendMessage = true) {
  setHighlightingById(modelId, false, sendMessage);
}

export function toggleHighlightById(modelId: string, sendMessage = true) {
  const isHighlighted = useLocalHighlightStore
    .getState()
    .localHighlightedIds.has(modelId);
  setHighlightingById(modelId, !isHighlighted, sendMessage);
}

export function removeAllHighlighting(sendMessage = true) {
  // delete all local highlights
  useLocalHighlightStore.getState().reset();
  useVisualizationStore.getState().actions.removeAllHighlightedEntityIds();

  // Also remove all highlights from the player state (if in a room)
  const isConnected = usePlayroomConnectionStore.getState().isConnected;
  if (sendMessage && isConnected) {
    try {
      myPlayer().setState('highlightedEntities', []);
    } catch (e) {
      // ignore
    }
  }
}
