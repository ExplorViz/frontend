import { Text } from '@react-three/drei';
import { useClusterStore } from 'explorviz-frontend/src/stores/cluster-store';
import { useEvolutionDataRepositoryStore } from 'explorviz-frontend/src/stores/repos/evolution-data-repository';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { useVisibilityServiceStore } from 'explorviz-frontend/src/stores/visibility-service';
import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import { getTruncatedDisplayName } from 'explorviz-frontend/src/utils/annotation-utils';
import {
  Application,
  Class,
} from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import BoxLayout from 'explorviz-frontend/src/utils/layout/box-layout';
import {
  MetricKey,
  metricMappingMultipliers,
} from 'explorviz-frontend/src/utils/settings/default-settings';
import gsap from 'gsap';
import { useEffect, useState } from 'react';
import * as THREE from 'three';
import { useShallow } from 'zustand/react/shallow';

export default function CodeBuildingLabel({
  dataModel,
  layout,
  application,
}: {
  dataModel: Class;
  layout: BoxLayout;
  application: Application;
}) {
  const {
    isBuildingHovered,
    isParentHovered,
    isBuildingHighlighted,
    isParentHighlighted,
    isBuildingVisible,
  } = useVisualizationStore(
    useShallow((state) => ({
      isBuildingHovered: state.hoveredEntityId === dataModel.id,
      isBuildingVisible:
        !state.hiddenBuildingIds.has(dataModel.id) &&
        !state.removedDistrictIds.has(dataModel.id),
      isParentHovered: state.hoveredEntityId === dataModel.parent.id,
      isBuildingHighlighted: state.highlightedEntityIds.has(dataModel.id),
      isParentHighlighted: state.highlightedEntityIds.has(dataModel.parent.id),
    }))
  );

  const sceneLayers = useVisualizationStore((state) => state.sceneLayers);

  const getMetricForBuilding = useEvolutionDataRepositoryStore(
    (state) => state.getMetricForClass
  );

  const { evoConfig } = useVisibilityServiceStore(
    useShallow((state) => ({
      evoConfig: state._evolutionModeRenderingConfiguration,
    }))
  );

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
      centroidDistance: state.getCentroidDistance(dataModel.id),
    }))
  );

  const getbuildingHeight = () => {
    return (
      buildingFootprint +
      metricMappingMultipliers[heightMetric as MetricKey] *
        buildingHeightMultiplier *
        getMetricForBuilding(
          dataModel,
          application.name,
          heightMetric,
          evoConfig.renderOnlyDifferences
        )
    );
  };

  const [labelPosition, setLabelPosition] = useState<THREE.Vector3>(
    new THREE.Vector3(layout.center.x, layout.positionY, layout.center.z)
  );

  useEffect(() => {
    const target = new THREE.Vector3(
      layout.center.x,
      layout.positionY + getbuildingHeight() + labelOffset,
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
    layout,
    heightMetric,
    buildingFootprint,
    buildingHeightMultiplier,
    labelOffset,
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

  return shouldShowLabel ? (
    <Text
      layers={sceneLayers.Label}
      key={dataModel.id + '-label'}
      name={'Code building label of ' + dataModel.name}
      position={labelPosition}
      color={buildingTextColor}
      visible={isBuildingVisible}
      rotation={[1.5 * Math.PI, 0, labelRotation]}
      fontSize={
        buildingLabelFontSize * Math.min(layout.width, layout.depth) * 0.5
      }
      raycast={() => null}
    >
      {getTruncatedDisplayName(
        dataModel.name,
        dataModel.id,
        buildingLabelLength
      )}
    </Text>
  ) : null;
}
