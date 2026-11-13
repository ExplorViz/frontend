import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { changeHighlights, highlighterColor } from 'explorviz-frontend/src/utils/collaboration/highlights';
import * as THREE from 'three';

/*
 * Highlighting as the rest of the frontend asks for it. Each function is one
 * user action of the highlights module (`utils/collaboration/highlights`),
 * which also says what is highlighted and by whom.
 */

export function getLocalHighlightingColor(): THREE.Color {
  return new THREE.Color(useUserSettingsStore.getState().visualizationSettings.highlightedEntityColor.value);
}

/** In a Room, the color of the Participant who highlighted the entity; otherwise the color of the settings. */
export function getHighlightingColorForEntity(entityId: string): THREE.Color {
  const color = highlighterColor(entityId);
  return color ? new THREE.Color(color) : getLocalHighlightingColor();
}

export function setHighlightingById(modelId: string, highlight: boolean) {
  changeHighlights({ type: highlight ? 'highlight' : 'unhighlight', entityId: modelId });
}

/** Highlights (taking over) or removes the own highlights of many entities, as one user action. */
export function setHighlightingByIds(modelIds: string[], highlight: boolean) {
  if (modelIds.length === 0) return;
  changeHighlights({ type: highlight ? 'highlightMany' : 'unhighlightMany', entityIds: modelIds });
}

/** Makes these entities the only own highlights, as one user action; in a Room everyone else's stay. */
export function highlightOnly(modelIds: string[]) {
  if (modelIds.length === 0) removeAllHighlighting();
  else changeHighlights({ type: 'highlightMany', entityIds: modelIds, replaceOwn: true });
}

/** Highlights the entity, in a Room taking it over from whoever highlighted it. */
export function highlightById(modelId: string) {
  setHighlightingById(modelId, true);
}

/** Removes the own highlight of the entity; someone else's stays. */
export function unhighlightById(modelId: string) {
  setHighlightingById(modelId, false);
}

/** A click: removes the own highlight of the entity, or else highlights it. */
export function toggleHighlightById(modelId: string) {
  changeHighlights({ type: 'toggle', entityId: modelId });
}

/** Removes all own highlights; in a Room everyone else's stay. */
export function removeAllHighlighting() {
  changeHighlights({ type: 'unhighlightAll' });
}
