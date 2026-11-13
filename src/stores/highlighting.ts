import { useCameraControlsStore } from 'explorviz-frontend/src/stores/camera-controls-store';
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
}

export const useHighlightingStore = create<HighlightingState>(() => ({
  highlightingColor: () => {
    return new THREE.Color(useUserSettingsStore.getState().visualizationSettings.highlightedEntityColor.value);
  },

  /**
   * Moves the camera smoothly to the world position of the given entity.
   */
  lookAtEntity: (entityId: string) => {
    if (!entityId) return;

    const worldPos = getWorldPositionOfModel(entityId);
    if (!worldPos) {
      console.warn(`[lookAtEntity] Could not find world position for entity: ${entityId}`);
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
}));
