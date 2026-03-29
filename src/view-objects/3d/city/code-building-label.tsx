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
  MetricKey,
  metricMappingMultipliers,
} from 'explorviz-frontend/src/utils/settings/default-settings';
import gsap from 'gsap';
import { useCallback, useEffect, useState } from 'react';
import * as THREE from 'three';
import { useShallow } from 'zustand/react/shallow';

export default function CodeBuildingLabel({
  buildingId,
}: {
  buildingId: string;
}) {
  const building = useModelStore.getState().getBuilding(buildingId);
  const layout =
    useLayoutStore.getState().getBuildingLayouts().get(buildingId) ||
    new BoxLayout();

  const {
    isBuildingHovered,
    isParentHovered,
    isBuildingHighlighted,
    isParentHighlighted,
    isBuildingVisible,
  } = useVisualizationStore(
    useShallow((state) => ({
      isBuildingHovered: state.hoveredEntityId === buildingId,
      isBuildingVisible:
        !state.hiddenBuildingIds.has(buildingId) &&
        !state.removedDistrictIds.has(buildingId),
      isParentHovered: state.hoveredEntityId === building?.parentDistrictId,
      isBuildingHighlighted: state.highlightedEntityIds.has(buildingId),
      isParentHighlighted: state.highlightedEntityIds.has(
        building?.parentDistrictId || ''
      ),
    }))
  );

  const sceneLayers = useVisualizationStore((state) => state.sceneLayers);

  const {
    buildingFootprint,
    buildingHeightMultiplier,
    buildingLabelFontSize,
    buildingLabelLength,
    buildingTextColor,
    heightMetric,
    labelOffset,
    labelRotation,
    showAllBuildingLabels,
    labelDistanceThreshold,
  } = useUserSettingsStore(
    useShallow((state) => ({
      buildingFootprint: state.visualizationSettings.buildingFootprint.value,
      buildingHeightMultiplier:
        state.visualizationSettings.buildingHeightMultiplier.value,
      buildingLabelFontSize:
        state.visualizationSettings.buildingLabelFontSize.value,
      buildingLabelLength:
        state.visualizationSettings.buildingLabelLength.value,
      buildingTextColor: state.visualizationSettings.buildingTextColor.value,
      heightMetric: state.visualizationSettings.buildingHeightMetric.value,
      labelOffset: state.visualizationSettings.labelOffset.value,
      labelRotation: state.visualizationSettings.buildingLabelOrientation.value,
      showAllBuildingLabels:
        state.visualizationSettings.showAllBuildingLabels.value,
      labelDistanceThreshold:
        state.visualizationSettings.labelDistanceThreshold.value,
    }))
  );

  const { centroidDistance } = useClusterStore(
    useShallow((state) => ({
      centroidDistance: state.getCentroidDistance(buildingId),
    }))
  );

  const getBuildingHeight = useCallback(
    (building: Building) => {
      const metricValue = building.metrics?.[heightMetric]?.current || 0;
      return (
        buildingFootprint +
        metricMappingMultipliers[heightMetric as MetricKey] *
          buildingHeightMultiplier *
          metricValue
      );
    },
    [buildingFootprint, buildingHeightMultiplier, heightMetric]
  );

  const [labelPosition, setLabelPosition] = useState<THREE.Vector3>(
    new THREE.Vector3(layout.center.x, layout.positionY, layout.center.z)
  );

  useEffect(() => {
    if (!building) return;

    const target = new THREE.Vector3(
      layout.center.x,
      layout.positionY + getBuildingHeight(building) + labelOffset,
      layout.center.z
    );

    const { enableAnimations, animationDuration } =
      useUserSettingsStore.getState().visualizationSettings;
    const animationEnabled = enableAnimations.value;
    const duration = animationDuration.value;

    if (animationEnabled) {
      const values = {
        x: labelPosition.x,
        y: labelPosition.y,
        z: labelPosition.z,
      };
      gsap.to(values, {
        x: target.x,
        y: target.y,
        z: target.z,
        duration,
        onUpdate: () =>
          setLabelPosition(new THREE.Vector3(values.x, values.y, values.z)),
      });
    } else {
      if (!labelPosition.equals(target)) {
        setLabelPosition(target.clone());
      }
    }
  }, [
    building,
    layout,
    heightMetric,
    buildingFootprint,
    buildingHeightMultiplier,
    labelOffset,
    getBuildingHeight,
  ]);

  const sizeMultiplier = 1.0 + layout.area / 10000.0;
  const isWithinSemanticZoomDistance = centroidDistance
    ? centroidDistance <= labelDistanceThreshold * sizeMultiplier
    : true;

  const shouldShowLabel =
    (showAllBuildingLabels ||
      isBuildingHovered ||
      isParentHovered ||
      isBuildingHighlighted ||
      isParentHighlighted) &&
    isWithinSemanticZoomDistance;

  if (!building) {
    return null;
  }

  return shouldShowLabel ? (
    <Text
      layers={sceneLayers.Label}
      key={buildingId + '-label'}
      name={'Code building label of ' + building.name}
      position={labelPosition}
      color={buildingTextColor}
      visible={isBuildingVisible}
      rotation={[1.5 * Math.PI, 0, labelRotation]}
      fontSize={
        buildingLabelFontSize * Math.min(layout.width, layout.depth) * 0.5
      }
      raycast={() => null}
    >
      {getTruncatedDisplayName(building.name, buildingId, buildingLabelLength)}
    </Text>
  ) : null;
}
