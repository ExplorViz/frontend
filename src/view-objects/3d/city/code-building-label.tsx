import { Text } from '@react-three/drei';
import { useClusterStore } from 'explorviz-frontend/src/stores/cluster-store';
import { useImmersiveViewStore } from 'explorviz-frontend/src/stores/immersive-view-store';
import { useLayoutStore } from 'explorviz-frontend/src/stores/layout-store';
import { useModelStore } from 'explorviz-frontend/src/stores/repos/model-repository';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import { getTruncatedDisplayName } from 'explorviz-frontend/src/utils/annotation-utils';
import {
  animateNumericProps,
  createBuildingLabelPosition,
  getImmersiveAnimationDuration,
} from 'explorviz-frontend/src/utils/city-rendering/immersive-building-animation';
import { Building } from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import BoxLayout from 'explorviz-frontend/src/utils/layout/box-layout';
import {
  computeMappedBuildingHeight,
  getCachedBuildingMetricBounds,
} from 'explorviz-frontend/src/utils/settings/building-metrics';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useShallow } from 'zustand/react/shallow';

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

  // Stay visible while immersive and while the building/label restore after exit.
  const isImmersiveLabelTarget = useImmersiveViewStore(
    (state) => state.immersiveLabelBuildingId === buildingId
  );

  const wantsToShowLabel =
    isImmersiveLabelTarget ||
    showAllBuildingLabels ||
    isBuildingHovered ||
    isParentHovered ||
    isBuildingHighlighted ||
    isParentHighlighted;

  const layout = useLayoutStore.getState().getBuildingLayouts().get(buildingId);
  const sizeMultiplier = 1.0 + (layout?.area ?? 0) / 10000.0;
  const threshold = labelDistanceThreshold * sizeMultiplier;

  const isWithinSemanticZoomDistance = useClusterStore((state) => {
    if (isImmersiveLabelTarget) {
      return true;
    }
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
  const immersiveBuildingHeight = useImmersiveViewStore((state) =>
    state.immersiveLabelBuildingId === buildingId
      ? state.immersiveBuildingHeight
      : null
  );
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
    createBuildingLabelPosition(
      layout.center.x,
      layout.center.z,
      layout.positionY,
      getBuildingHeight(building),
      labelOffset
    )
  );
  const labelTweenRef = useRef<{ x: number; y: number; z: number } | null>(
    null
  );

  useEffect(() => {
    const targetHeight =
      immersiveBuildingHeight ?? getBuildingHeight(building);
    const target = createBuildingLabelPosition(
      layout.center.x,
      layout.center.z,
      layout.positionY,
      targetHeight,
      labelOffset
    );
    const duration =
      immersiveBuildingHeight !== null
        ? getImmersiveAnimationDuration(animationDuration)
        : animationDuration;

    animateNumericProps({
      from: {
        x: labelPosition.x,
        y: labelPosition.y,
        z: labelPosition.z,
      },
      to: { x: target.x, y: target.y, z: target.z },
      duration,
      animate: enableAnimations,
      tweenRef: labelTweenRef,
      onUpdate: (values) =>
        setLabelPosition(new THREE.Vector3(values.x, values.y, values.z)),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    animationDuration,
    building,
    buildingFootprint,
    buildingHeightMultiplier,
    buildings,
    enableAnimations,
    heightMetric,
    immersiveBuildingHeight,
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
