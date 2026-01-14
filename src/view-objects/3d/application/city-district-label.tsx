import { Text } from '@react-three/drei';
import { useClusterStore } from 'explorviz-frontend/src/stores/cluster-store';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import { getEntityDisplayName } from 'explorviz-frontend/src/utils/annotation-utils';
import { Package } from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import BoxLayout from 'explorviz-frontend/src/utils/layout/box-layout';
import { getLabelRotation } from 'explorviz-frontend/src/view-objects/utils/label-utils';
import gsap from 'gsap';
import { useEffect, useState } from 'react';
import * as THREE from 'three';
import { useShallow } from 'zustand/react/shallow';

export default function CityDistrictLabel({
  component,
  layout,
}: {
  component: Package;
  layout: BoxLayout;
}) {
  const {
    labelOffset,
    componentTextColor,
    closedComponentHeight,
    packageLabelMargin,
    enableAnimations,
    animationDuration,
    componentLabelPlacement,
    labelDistanceThreshold,
  } = useUserSettingsStore(
    useShallow((state) => ({
      labelOffset: state.visualizationSettings.labelOffset.value,
      componentTextColor: state.visualizationSettings.componentTextColor.value,
      closedComponentHeight:
        state.visualizationSettings.closedComponentHeight.value,
      packageLabelMargin: state.visualizationSettings.packageLabelMargin.value,
      enableAnimations: state.visualizationSettings.enableAnimations.value,
      animationDuration: state.visualizationSettings.animationDuration.value,
      componentLabelPlacement:
        state.visualizationSettings.componentLabelPlacement.value,
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

  const { isOpen, isVisible } = useVisualizationStore(
    useShallow((state) => ({
      isOpen: !state.closedComponentIds.has(component.id),
      isVisible:
        !state.hiddenComponentIds.has(component.id) &&
        !state.removedComponentIds.has(component.id),
    }))
  );

  const [labelPosition, setLabelPosition] = useState<THREE.Vector3>(
    new THREE.Vector3()
  );

  // Track distance to cluster centroid for label visibility
  const [isWithinDistance, setIsWithinDistance] = useState<boolean>(true);

  const getFontSize = () => {
    return isOpen
      ? packageLabelMargin * 0.5
      : Math.max(layout.width * 0.1, packageLabelMargin * 0.5);
  };

  useEffect(() => {
    const distance = getCentroidDistance(component.id);
    if (distance !== undefined) {
      // Larger Labels of larger districts should be visible from a greater distance
      const sizeMultiplier =
        1.0 + layout.area / 100000.0 + getFontSize() / 10.0;
      const adjustedThreshold = labelDistanceThreshold * sizeMultiplier;
      setIsWithinDistance(distance <= adjustedThreshold);
    } else {
      // Default: show label
      setIsWithinDistance(true);
    }
  }, [
    centroidDistances,
    labelDistanceThreshold,
    getCentroidDistance,
    component.id,
    layout.area,
  ]);

  const getLabelPositionForPlacement = (
    placement: string,
    isOpen: boolean
  ): THREE.Vector3 => {
    const margin = packageLabelMargin / 2;
    const openedPosY = layout.positionY + layout.height + labelOffset + 0.01;
    const closedPosY =
      layout.positionY + closedComponentHeight + labelOffset + 0.01;
    switch (placement) {
      case 'top':
        return isOpen
          ? new THREE.Vector3(
              layout.center.x,
              openedPosY,
              layout.center.z - layout.depth / 2 + margin
            )
          : new THREE.Vector3(layout.center.x, closedPosY, layout.center.z);
      case 'bottom':
        return isOpen
          ? new THREE.Vector3(
              layout.center.x,
              openedPosY,
              layout.center.z + layout.depth / 2 - margin
            )
          : new THREE.Vector3(layout.center.x, closedPosY, layout.center.z);
      case 'left':
        return isOpen
          ? new THREE.Vector3(
              layout.center.x - layout.width / 2 + margin,
              openedPosY,
              layout.center.z
            )
          : new THREE.Vector3(layout.center.x, closedPosY, layout.center.z);
      case 'right':
        return isOpen
          ? new THREE.Vector3(
              layout.center.x + layout.width / 2 - margin,
              openedPosY,
              layout.center.z
            )
          : new THREE.Vector3(layout.center.x, closedPosY, layout.center.z);
      default:
        return new THREE.Vector3(0, 0, 0);
    }
  };

  useEffect(() => {
    const target = getLabelPositionForPlacement(
      componentLabelPlacement,
      isOpen
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
        onUpdate: () => {
          setLabelPosition(new THREE.Vector3(values.x, values.y, values.z));
        },
      });
    } else {
      setLabelPosition(target.clone());
    }
  }, [
    layout,
    isOpen,
    labelOffset,
    packageLabelMargin,
    closedComponentHeight,
    enableAnimations,
    animationDuration,
    componentLabelPlacement,
  ]);

  return isWithinDistance ? (
    <Text
      color={componentTextColor}
      name={'City district label of ' + component.name}
      visible={isVisible}
      position={labelPosition}
      rotation={getLabelRotation(componentLabelPlacement)}
      fontSize={getFontSize()}
      raycast={() => null}
    >
      {getEntityDisplayName(component.name, component.id)}
    </Text>
  ) : null;
}
