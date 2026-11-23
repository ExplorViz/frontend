import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { FlatLandscape } from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import BoxLayout from 'explorviz-frontend/src/utils/layout/box-layout';
import layoutLandscapeWithElk from 'explorviz-frontend/src/utils/layout/elk-layouter';
import layoutLandscapeWithMaxRects from 'explorviz-frontend/src/utils/layout/maxrects-layouter';

export type LayoutEngine = 'elk' | 'maxrects';

export function getLayoutEngine(): LayoutEngine {
  return useUserSettingsStore.getState().visualizationSettings.layoutEngine.value as LayoutEngine;
}

/** Whether the layout is kept stable and only recomputed on request. */
export function isLayoutStable(): boolean {
  return getLayoutEngine() === 'maxrects';
}

/**
 * Layouts the landscape with the layout engine chosen in the settings:
 * ELK recomputes the layout for every change of the landscape, maxrects keeps
 * it stable until the user asks for a new one.
 */
export default async function layoutLandscape(
  landscape: FlatLandscape,
  removedDistrictIds: Set<string>
): Promise<Map<string, BoxLayout>> {
  if (getLayoutEngine() === 'maxrects') {
    return layoutLandscapeWithMaxRects(landscape, removedDistrictIds);
  }
  return layoutLandscapeWithElk(landscape, removedDistrictIds);
}
