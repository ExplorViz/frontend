import { FlatLandscape } from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import BoxLayout from 'explorviz-frontend/src/utils/layout/box-layout';
import { applyCircleLayoutToClasses as applyCircleLayoutToBuildings } from 'explorviz-frontend/src/utils/layout/circle-layouter';
import { usesCustomBuildingLayout } from 'explorviz-frontend/src/utils/layout/layout-dimensions';
import { applySpiralLayoutToClasses as applySpiralLayoutToBuildings } from 'explorviz-frontend/src/utils/layout/spiral-layouter';
import { VisualizationSettings } from 'explorviz-frontend/src/utils/settings/settings-schemas';

export const LANDSCAPE_ID = 'landscape';

/** A measured and arranged entity; `x` and `z` are relative to its parent's origin. */
export type LayoutNode = {
  id: string;
  isBuilding: boolean;
  width: number;
  depth: number;
  x: number;
  z: number;
  children: LayoutNode[];
};

/**
 * Converts the layout tree into box layouts, following the conventions of
 * the ELK layouter: Cities are positioned in the landscape, everything
 * inside a City relative to the City.
 */
function addBoxLayouts(
  node: LayoutNode,
  layoutMap: Map<string, BoxLayout>,
  level: number,
  offsetX: number,
  offsetZ: number,
  vs: VisualizationSettings
): void {
  const districtHeight = vs.openedDistrictHeight.value;
  const boxLayout = new BoxLayout();
  boxLayout.width = node.width || vs.buildingFootprint.value;
  boxLayout.depth = node.depth || vs.buildingFootprint.value;
  boxLayout.height = node.isBuilding ? vs.buildingFootprint.value : districtHeight;
  boxLayout.positionX = offsetX + node.x;
  boxLayout.positionY = districtHeight * level;
  boxLayout.positionZ = offsetZ + node.z;
  boxLayout.level = level;
  layoutMap.set(node.id, boxLayout);

  // The children of a City are positioned relative to the City
  const isCity = level === 1;
  const childOffsetX = isCity ? 0 : boxLayout.positionX;
  const childOffsetZ = isCity ? 0 : boxLayout.positionZ;
  for (const child of node.children) {
    addBoxLayouts(child, layoutMap, level + 1, childOffsetX, childOffsetZ, vs);
  }
}

/** The box layouts of an arranged landscape, including the Buildings a custom building layout (circle or spiral) places. */
export function toBoxLayouts(
  landscapeNode: LayoutNode,
  landscape: FlatLandscape,
  vs: VisualizationSettings
): Map<string, BoxLayout> {
  const layoutMap = new Map<string, BoxLayout>();
  addBoxLayouts(landscapeNode, layoutMap, 0, 0, 0, vs);

  if (usesCustomBuildingLayout(vs)) {
    const cities = Object.values(landscape.cities);
    if (vs.buildingLayoutAlgorithm.value === 'circle') {
      applyCircleLayoutToBuildings(layoutMap, landscape, cities);
    } else {
      applySpiralLayoutToBuildings(layoutMap, landscape, cities);
    }
  }

  return layoutMap;
}
