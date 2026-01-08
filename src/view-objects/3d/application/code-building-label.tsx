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
    isClassHovered,
    isParentHovered,
    isClassHighlighted,
    isParentHighlighted,
    isClassVisible,
  } = useVisualizationStore(
    useShallow((state) => ({
      isClassHovered: state.hoveredEntityId === dataModel.id,
      isClassVisible:
        !state.hiddenClassIds.has(dataModel.id) &&
        !state.removedComponentIds.has(dataModel.id),
      isParentHovered: state.hoveredEntityId === dataModel.parent.id,
      isClassHighlighted: state.highlightedEntityIds.has(dataModel.id),
      isParentHighlighted: state.highlightedEntityIds.has(dataModel.parent.id),
    }))
  );

  const getMetricForClass = useEvolutionDataRepositoryStore(
    (state) => state.getMetricForClass
  );

  const { evoConfig } = useVisibilityServiceStore(
    useShallow((state) => ({
      evoConfig: state._evolutionModeRenderingConfiguration,
    }))
  );

  const {
    classFootprint,
    classHeightMultiplier,
    classLabelFontSize,
    classLabelLength,
    classTextColor,
    heightMetric,
    labelOffset,
    labelRotation,
    showAllClassLabels,
    labelDistanceThreshold,
  } = useUserSettingsStore(
    useShallow((state) => ({
      classFootprint: state.visualizationSettings.classFootprint.value,
      classHeightMultiplier:
        state.visualizationSettings.classHeightMultiplier.value,
      classLabelFontSize: state.visualizationSettings.classLabelFontSize.value,
      classLabelLength: state.visualizationSettings.classLabelLength.value,
      classTextColor: state.visualizationSettings.classTextColor.value,
      heightMetric: state.visualizationSettings.classHeightMetric.value,
      labelOffset: state.visualizationSettings.labelOffset.value,
      labelRotation: state.visualizationSettings.classLabelOrientation.value,
      showAllClassLabels: state.visualizationSettings.showAllClassLabels.value,
      labelDistanceThreshold:
        state.visualizationSettings.labelDistanceThreshold.value,
    }))
  );

  const { centroidDistances, getCentroidDistance } = useClusterStore(
    useShallow((state) => ({
      centroidDistances: state.centroidDistances,
      getCentroidDistance: state.getCentroidDistance,
    }))
  );

  const getClassHeight = () => {
    return (
      classFootprint +
      metricMappingMultipliers[heightMetric as MetricKey] *
        classHeightMultiplier *
        getMetricForClass(
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

  // Track distance to cluster centroid for label visibility
  const [isWithinDistance, setIsWithinDistance] = useState<boolean>(true);

  useEffect(() => {
    const distance = getCentroidDistance(dataModel.id);
    if (distance !== undefined) {
      // Larger Labels of larger districts should be visible from a greater distance
      const sizeMultiplier = 1.0 + layout.area / 10000.0;
      setIsWithinDistance(distance <= labelDistanceThreshold * sizeMultiplier);
    } else {
      // Show label by default
      setIsWithinDistance(true);
    }
  }, [
    centroidDistances,
    labelDistanceThreshold,
    getCentroidDistance,
    dataModel.id,
  ]);

  useEffect(() => {
    const target = new THREE.Vector3(
      layout.center.x,
      layout.positionY + getClassHeight() + labelOffset,
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
      setLabelPosition(target.clone());
    }
  }, [
    layout,
    heightMetric,
    classFootprint,
    classHeightMultiplier,
    labelOffset,
  ]);

  const shouldShowLabel =
    (showAllClassLabels ||
      isClassHovered ||
      isParentHovered ||
      isClassHighlighted ||
      isParentHighlighted) &&
    isWithinDistance;

  return shouldShowLabel ? (
    <Text
      key={dataModel.id + '-label'}
      position={labelPosition}
      color={classTextColor}
      visible={isClassVisible}
      rotation={[1.5 * Math.PI, 0, labelRotation]}
      fontSize={classLabelFontSize * Math.min(layout.width, layout.depth) * 0.5}
      raycast={() => null}
    >
      {getTruncatedDisplayName(dataModel.name, dataModel.id, classLabelLength)}
    </Text>
  ) : null;
}
