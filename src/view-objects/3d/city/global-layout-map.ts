import type BoxLayout from 'explorviz-frontend/src/utils/layout/box-layout';

// Global layout map for fallback
let globalLayoutMap: Map<string, BoxLayout> | null = null;

export function setGlobalLayoutMap(map: Map<string, BoxLayout>) {
  globalLayoutMap = map;
}

export function getGlobalLayoutMap(): Map<string, BoxLayout> | null {
  return globalLayoutMap;
}
