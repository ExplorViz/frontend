import { Text } from '@react-three/drei';
import { useIsWithinCentroidDistance } from 'explorviz-frontend/src/stores/cluster-store';
import { useImmersiveViewStore } from 'explorviz-frontend/src/stores/immersive-view-store';
import { useBuildingLayout } from 'explorviz-frontend/src/stores/layout-store';
import { useModelStore } from 'explorviz-frontend/src/stores/repos/model-repository';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import { useHighlights } from 'explorviz-frontend/src/utils/collaboration/highlights';
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
import { memo, Suspense, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useShallow } from 'zustand/react/shallow';

// Memoized: rendered once per building, so a re-rendering city (e.g. while its
// position animates) must not re-render every label.
export default memo(CodeBuildingLabel);

function CodeBuildingLabel({ buildingId }: { buildingId: string }) {
  const building = useModelStore.getState().getBuilding(buildingId);

  const { isBuildingHovered, isParentHovered } = useVisualizationStore(
    useShallow((state) => ({
      isBuildingHovered: state.hoveredEntityId === buildingId,
      isParentHovered:
        state.hoveredEntityId === building?.parentDistrictId ||
        (!building?.parentDistrictId && state.hoveredEntityId === building?.parentCityId),
    }))
  );
  const isBuildingHighlighted = useHighlights((ids) => ids.has(buildingId));
  const isParentHighlighted = useHighlights((ids) =>
    ids.has(building?.parentDistrictId || (!building?.parentDistrictId ? building?.parentCityId || '' : ''))
  );

  const { showAllBuildingLabels, labelDistanceThreshold, enableClustering } = useUserSettingsStore(
    useShallow((state) => ({
      showAllBuildingLabels: state.visualizationSettings.showAllBuildingLabels.value,
      labelDistanceThreshold: state.visualizationSettings.labelDistanceThreshold.value,
      enableClustering: state.visualizationSettings.enableClustering.value,
    }))
  );

  // Stay visible while immersive and while the building/label restore after exit.
  const isImmersiveLabelTarget = useImmersiveViewStore((state) => state.immersiveLabelBuildingId === buildingId);

  const wantsToShowLabel =
    isImmersiveLabelTarget ||
    showAllBuildingLabels ||
    isBuildingHovered ||
    isParentHovered ||
    isBuildingHighlighted ||
    isParentHighlighted;

  const layout = useBuildingLayout(buildingId);
  const sizeMultiplier = 1.0 + (layout?.area ?? 0) / 10000.0;
  const threshold = labelDistanceThreshold * sizeMultiplier;

  const isWithinLabelDistance = useIsWithinCentroidDistance(
    buildingId,
    threshold,
    !enableClustering,
    wantsToShowLabel && !isImmersiveLabelTarget
  );
  const isWithinSemanticZoomDistance = isImmersiveLabelTarget || isWithinLabelDistance;

  if (!building || !wantsToShowLabel || !isWithinSemanticZoomDistance) {
    return null;
  }

  // The text waits for its font in a boundary of its own (see CityFoundation).
  return (
    <Suspense>
      <CodeBuildingLabelContent buildingId={buildingId} building={building} layout={layout ?? EMPTY_LAYOUT} />
    </Suspense>
  );
}

const EMPTY_LAYOUT = new BoxLayout();

function CodeBuildingLabelContent({
  buildingId,
  building,
  layout,
}: {
  buildingId: string;
  building: Building;
  layout: BoxLayout;
}) {
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
      buildingHeightMultiplier: state.visualizationSettings.buildingHeightMultiplier.value,
      metricMapping: state.visualizationSettings.buildingMetricMapping.value,
      metricBuckets: state.visualizationSettings.buildingMetricBuckets.value,
      buildingLabelFontSize: state.visualizationSettings.buildingLabelFontSize.value,
      buildingLabelLength: state.visualizationSettings.buildingLabelLength.value,
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
    state.immersiveLabelBuildingId === buildingId ? state.immersiveBuildingHeight : null
  );
  const heightMetricBounds = getCachedBuildingMetricBounds(buildings, heightMetric);

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
  const labelTweenRef = useRef<{ x: number; y: number; z: number } | null>(null);

  useEffect(() => {
    const targetHeight = immersiveBuildingHeight ?? getBuildingHeight(building);
    const target = createBuildingLabelPosition(
      layout.center.x,
      layout.center.z,
      layout.positionY,
      targetHeight,
      labelOffset
    );
    const duration =
      immersiveBuildingHeight !== null ? getImmersiveAnimationDuration(animationDuration) : animationDuration;

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
      onUpdate: (values) => setLabelPosition(new THREE.Vector3(values.x, values.y, values.z)),
    });
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
      fontSize={buildingLabelFontSize * Math.min(layout.width, layout.depth) * 0.5}
      raycast={() => null}
    >
      {getTruncatedDisplayName(building.name, buildingId, buildingLabelLength)}
    </Text>
  );
}
