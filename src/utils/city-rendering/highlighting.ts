import { useLocalHighlightStore } from 'explorviz-frontend/src/stores/collaboration/local-highlight-store';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import * as THREE from 'three';

export function getLocalHighlightingColor(): THREE.Color {
  return new THREE.Color(useUserSettingsStore.getState().visualizationSettings.highlightedEntityColor.value);
}

export function getHighlightingColorForEntity(_entityId: string): THREE.Color {
  return getLocalHighlightingColor();
}

export function setHighlightingById(modelId: string, highlight: boolean, _sendMessage = true) {
  useVisualizationStore.getState().actions.setHighlightedEntityId(modelId, highlight);

  useLocalHighlightStore.getState().setHighlighted(modelId, highlight);
}

export function highlightById(modelId: string, sendMessage = true) {
  setHighlightingById(modelId, true, sendMessage);
}

export function unhighlightById(modelId: string, sendMessage = true) {
  setHighlightingById(modelId, false, sendMessage);
}

export function toggleHighlightById(modelId: string, sendMessage = true) {
  const isHighlighted = useLocalHighlightStore.getState().localHighlightedIds.has(modelId);
  setHighlightingById(modelId, !isHighlighted, sendMessage);
}

export function removeAllHighlighting(_sendMessage = true) {
  useLocalHighlightStore.getState().reset();
  useVisualizationStore.getState().actions.removeAllHighlightedEntityIds();
}
