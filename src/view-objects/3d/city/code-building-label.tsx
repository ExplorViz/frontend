import { Text } from '@react-three/drei';
import { useClusterStore } from 'explorviz-frontend/src/stores/cluster-store';
import { useLayoutStore } from 'explorviz-frontend/src/stores/layout-store';
import { useModelStore } from 'explorviz-frontend/src/stores/repos/model-repository';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import { getTruncatedDisplayName } from 'explorviz-frontend/src/utils/annotation-utils';
import { Building } from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import BoxLayout from 'explorviz-frontend/src/utils/layout/box-layout';
import {
  computeMappedBuildingHeight,
  getCachedBuildingMetricBounds,
} from 'explorviz-frontend/src/utils/settings/building-metrics';
import gsap from 'gsap';
import { useEffect, useState } from 'react';
import * as THREE from 'three';
import { useShallow } from 'zustand/react/shallow';

function createLabelPosition(
  layout: BoxLayout,
  labelOffset: number,
  buildingHeight: number
) {
  return new THREE.Vector3(
    layout.center.x,
    layout.positionY + buildingHeight + labelOffset,
    layout.center.z
  );
}

export default function CodeBuildingLabel({
  buildingId,
}: {
  buildingId: string;
}) {
  const building = useModelStore.getState().getBuilding(buildingId);

  const {
    isBuildingHovered,
    isParentHovered,
    isBuildingHighlighted,
    isParentHighlighted,
  } = useVisualizationStore(
    useShallow((state) => ({
      isBuildingHovered: state.hoveredEntityId === buildingId,
      isParentHovered:
        state.hoveredEntityId === building?.parentDistrictId ||
        (!building?.parentDistrictId &&
          state.hoveredEntityId === building?.parentCityId),
      isBuildingHighlighted: state.highlightedEntityIds.has(buildingId),
      isParentHighlighted: state.highlightedEntityIds.has(
        building?.parentDistrictId ||
          (!building?.parentDistrictId ? building?.parentCityId || '' : '')
      ),
    }))
  );

  const { showAllBuildingLabels, labelDistanceThreshold, enableClustering } =
    useUserSettingsStore(
      useShallow((state) => ({
        showAllBuildingLabels:
          state.visualizationSettings.showAllBuildingLabels.value,
        labelDistanceThreshold:
          state.visualizationSettings.labelDistanceThreshold.value,
        enableClustering: state.visualizationSettings.enableClustering.value,
      }))
    );

  const wantsToShowLabel =
    showAllBuildingLabels ||
    isBuildingHovered ||
    isParentHovered ||
    isBuildingHighlighted ||
    isParentHighlighted;

  const layout = useLayoutStore.getState().getBuildingLayouts().get(buildingId);
  const sizeMultiplier = 1.0 + (layout?.area ?? 0) / 10000.0;
  const threshold = labelDistanceThreshold * sizeMultiplier;

  const isWithinSemanticZoomDistance = useClusterStore((state) => {
    if (!wantsToShowLabel) {
      return false;
    }
    const distance = state.getCentroidDistance(buildingId);
    return distance !== undefined ? distance <= threshold : !enableClustering;
  });

  if (!building || !wantsToShowLabel || !isWithinSemanticZoomDistance) {
    return null;
  }

  return (
    <CodeBuildingLabelContent buildingId={buildingId} building={building} />
  );
}

function CodeBuildingLabelContent({
  buildingId,
  building,
}: {
  buildingId: string;
  building: Building;
}) {
  const layout =
    useLayoutStore.getState().getBuildingLayouts().get(buildingId) ||
    new BoxLayout();

  const sceneLayers = useVisualizationStore((state) => state.sceneLayers);
  const {
    buildingFootprint,
    buildingHeightMultiplier,
    metricMapping,
    metricBuckets,
    buildingLabelFontSize,
    buildingLabelLength,
    buildingTextColor,
    heightMetric,
    labelOffset,
    labelRotation,
    enableAnimations,
    animationDuration,
  } = useUserSettingsStore(
    useShallow((state) => ({
      buildingFootprint: state.visualizationSettings.buildingFootprint.value,
      buildingHeightMultiplier:
        state.visualizationSettings.buildingHeightMultiplier.value,
      metricMapping: state.visualizationSettings.buildingMetricMapping.value,
      metricBuckets: state.visualizationSettings.buildingMetricBuckets.value,
      buildingLabelFontSize:
        state.visualizationSettings.buildingLabelFontSize.value,
      buildingLabelLength:
        state.visualizationSettings.buildingLabelLength.value,
      buildingTextColor: state.visualizationSettings.buildingTextColor.value,
      heightMetric: state.visualizationSettings.buildingHeightMetric.value,
      labelOffset: state.visualizationSettings.labelOffset.value,
      labelRotation: state.visualizationSettings.buildingLabelOrientation.value,
      enableAnimations: state.visualizationSettings.enableAnimations.value,
      animationDuration: state.visualizationSettings.animationDuration.value,
    }))
  );

  const buildings = useModelStore((state) => state.buildings);
  const heightMetricBounds = getCachedBuildingMetricBounds(
    buildings,
    heightMetric
  );

  function getBuildingHeight(targetBuilding: Building) {
    return computeMappedBuildingHeight(
      targetBuilding,
      heightMetric,
      metricMapping,
      buildingFootprint,
      buildingHeightMultiplier,
      heightMetricBounds,
      metricBuckets
    );
  }

  const [labelPosition, setLabelPosition] = useState<THREE.Vector3>(() =>
    createLabelPosition(layout, labelOffset, getBuildingHeight(building))
  );

  // Single effect drives position updates for both metric-driven height
  // changes and offset/layout changes (previously duplicated across two
  // near-identical effects, which produced two competing GSAP tweens).
  useEffect(() => {
    const target = createLabelPosition(
      layout,
      labelOffset,
      getBuildingHeight(building)
    );

    if (enableAnimations) {
      const values = {
        x: labelPosition.x,
        y: labelPosition.y,
        z: labelPosition.z,
      };
      gsap.to(values, {
        x: target.x,
        y: target.y,
        z: target.z,
        duration: animationDuration,
        onUpdate: () =>
          setLabelPosition(new THREE.Vector3(values.x, values.y, values.z)),
      });
    } else if (!labelPosition.equals(target)) {
      setLabelPosition(target);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    animationDuration,
    building,
    buildingFootprint,
    buildingHeightMultiplier,
    buildings,
    enableAnimations,
    heightMetric,
    labelOffset,
    layout,
    metricMapping,
    metricBuckets,
  ]);

  return (
    <Text
      layers={sceneLayers.Label}
      key={buildingId + '-label'}
      name={'Code building label of ' + building.name}
      position={labelPosition}
      color={buildingTextColor}
      rotation={[1.5 * Math.PI, 0, labelRotation]}
      fontSize={
        buildingLabelFontSize * Math.min(layout.width, layout.depth) * 0.5
      }
      raycast={() => null}
    >
      {getTruncatedDisplayName(building.name, buildingId, buildingLabelLength)}
    </Text>
  );
}
