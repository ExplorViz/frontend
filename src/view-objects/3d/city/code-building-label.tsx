import { Text } from '@react-three/drei';
import { useClusterStore } from 'explorviz-frontend/src/stores/cluster-store';
import { useLayoutStore } from 'explorviz-frontend/src/stores/layout-store';
import { useModelStore } from 'explorviz-frontend/src/stores/repos/model-repository';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import { getTruncatedDisplayName } from 'explorviz-frontend/src/utils/annotation-utils';
import { isBuildingVisible } from 'explorviz-frontend/src/utils/city-rendering/building-visibility';
import { Building } from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import BoxLayout from 'explorviz-frontend/src/utils/layout/box-layout';
import { computeMappedBuildingHeight } from 'explorviz-frontend/src/utils/settings/building-metrics';
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
  const layout =
    useLayoutStore.getState().getBuildingLayouts().get(buildingId) ||
    new BoxLayout();

  const {
    isBuildingHovered,
    isParentHovered,
    isBuildingHighlighted,
    isParentHighlighted,
    isCurrentBuildingVisible,
  } = useVisualizationStore(
    useShallow((state) => ({
      isBuildingHovered: state.hoveredEntityId === buildingId,
      isCurrentBuildingVisible: isBuildingVisible({
        buildingId,
        building,
        hiddenBuildingIds: state.hiddenBuildingIds,
        removedDistrictIds: state.removedDistrictIds,
        hiddenLanguages: state.hiddenLanguages,
      }),
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

  const sceneLayers = useVisualizationStore((state) => state.sceneLayers);
  const {
    buildingFootprint,
    buildingHeightMultiplier,
    metricMapping,
    buildingLabelFontSize,
    buildingLabelLength,
    buildingTextColor,
    heightMetric,
    labelOffset,
    labelRotation,
    showAllBuildingLabels,
    labelDistanceThreshold,
    enableClustering,
    enableAnimations,
    animationDuration,
  } = useUserSettingsStore(
    useShallow((state) => ({
      buildingFootprint: state.visualizationSettings.buildingFootprint.value,
      buildingHeightMultiplier:
        state.visualizationSettings.buildingHeightMultiplier.value,
      metricMapping: state.visualizationSettings.buildingMetricMapping.value,
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
      enableClustering: state.visualizationSettings.enableClustering.value,
      enableAnimations: state.visualizationSettings.enableAnimations.value,
      animationDuration: state.visualizationSettings.animationDuration.value,
    }))
  );

  const { centroidDistance } = useClusterStore(
    useShallow((state) => ({
      centroidDistance: state.getCentroidDistance(buildingId),
    }))
  );

  const buildings = useModelStore((state) => state.buildings);

  function getBuildingHeight(targetBuilding: Building) {
    return computeMappedBuildingHeight(
      targetBuilding,
      heightMetric,
      metricMapping,
      buildingFootprint,
      buildingHeightMultiplier,
      buildings
    );
  }

  const [labelPosition, setLabelPosition] = useState<THREE.Vector3>(() => {
    if (!building) {
      return new THREE.Vector3(
        layout.center.x,
        layout.positionY,
        layout.center.z
      );
    }

    return (
      createLabelPosition(layout, labelOffset, getBuildingHeight(building)) ??
      new THREE.Vector3(layout.center.x, layout.positionY, layout.center.z)
    );
  });

  useEffect(() => {
    if (!building) {
      return;
    }

    const target = createLabelPosition(
      layout,
      labelOffset,
      getBuildingHeight(building)
    );
    if (!target) {
      return;
    }

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
    } else {
      setLabelPosition(target);
    }
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
  ]);

  useEffect(() => {
    if (!building) {
      return;
    }

    const target = createLabelPosition(
      layout,
      labelOffset,
      getBuildingHeight(building)
    );
    if (!target) {
      return;
    }

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
      setLabelPosition(target.clone());
    }
  }, [animationDuration, building, enableAnimations, labelOffset, layout]);

  const sizeMultiplier = 1.0 + layout.area / 10000.0;
  const isWithinSemanticZoomDistance =
    centroidDistance !== undefined
      ? centroidDistance <= labelDistanceThreshold * sizeMultiplier
      : !enableClustering;

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
      visible={isCurrentBuildingVisible}
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
