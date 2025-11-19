import { useCollaborationSessionStore } from 'explorviz-frontend/src/stores/collaboration/collaboration-session';
import { useLocalUserStore } from 'explorviz-frontend/src/stores/collaboration/local-user';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import * as THREE from 'three';
import { Color } from 'three';
import { create } from 'zustand';

interface HighlightingState {
  highlightingColor: () => Color;
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
}));
