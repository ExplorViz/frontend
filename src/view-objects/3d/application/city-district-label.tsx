import { Text } from '@react-three/drei';
import { useClusterStore } from 'explorviz-frontend/src/stores/cluster-store';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import { getEntityDisplayName } from 'explorviz-frontend/src/utils/annotation-utils';
import { Package } from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import BoxLayout from 'explorviz-frontend/src/utils/layout/box-layout';
import { getLabelRotation } from 'explorviz-frontend/src/view-objects/utils/label-utils';
import gsap from 'gsap';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
    districtTextColor,
    closedDistrictHeight,
    districtLabelMargin,
    enableAnimations,
    animationDuration,
    districtLabelPlacement,
    labelDistanceThreshold,
  } = useUserSettingsStore(
    useShallow((state) => ({
      labelOffset: state.visualizationSettings.labelOffset.value,
      districtTextColor: state.visualizationSettings.districtTextColor.value,
      closedDistrictHeight:
        state.visualizationSettings.closedDistrictHeight.value,
      districtLabelMargin:
        state.visualizationSettings.districtLabelMargin.value,
      enableAnimations: state.visualizationSettings.enableAnimations.value,
      animationDuration: state.visualizationSettings.animationDuration.value,
      districtLabelPlacement:
        state.visualizationSettings.districtLabelPlacement.value,
      labelDistanceThreshold:
        state.visualizationSettings.labelDistanceThreshold.value,
    }))
  );

  const sceneLayers = useVisualizationStore((state) => state.sceneLayers);

  const { centroidDistance } = useClusterStore(
    useShallow((state) => ({
      centroidDistance: state.getCentroidDistance(component.id),
    }))
  );

  const { isOpen, isVisible } = useVisualizationStore(
    useShallow((state) => ({
      isOpen: !state.closedDistrictIds.has(component.id),
      isVisible:
        !state.hiddenDistrictIds.has(component.id) &&
        !state.removedDistrictIds.has(component.id),
    }))
  );

  const [labelPosition, setLabelPosition] = useState<THREE.Vector3>(
    new THREE.Vector3()
  );

  const getFontSize = useCallback(() => {
    return isOpen
      ? districtLabelMargin * 0.5
      : Math.max(layout.width * 0.1, districtLabelMargin * 0.5);
  }, [isOpen, districtLabelMargin, layout.width]);

  // Track distance to cluster centroid for label visibility
  const isWithinDistance = useMemo(() => {
    if (centroidDistance !== undefined) {
      // Larger Labels of larger districts should be visible from a greater distance
      const sizeMultiplier =
        1.0 + layout.area / 100000.0 + getFontSize() / 10.0;
      const adjustedThreshold = labelDistanceThreshold * sizeMultiplier;
      return centroidDistance <= adjustedThreshold;
    }
    // Default: show label
    return true;
  }, [centroidDistance, layout.area, labelDistanceThreshold, getFontSize]);

  const getLabelPositionForPlacement = (
    placement: string,
    isOpen: boolean
  ): THREE.Vector3 => {
    const margin = districtLabelMargin / 2;
    const openedPosY = layout.positionY + layout.height + labelOffset + 0.01;
    const closedPosY =
      layout.positionY + closedDistrictHeight + labelOffset + 0.01;
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
    const target = getLabelPositionForPlacement(districtLabelPlacement, isOpen);

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
    districtLabelMargin,
    closedDistrictHeight,
    enableAnimations,
    animationDuration,
    districtLabelPlacement,
    getLabelPositionForPlacement,
    labelPosition.x,
    labelPosition.y,
    labelPosition.z,
  ]);

  return isWithinDistance ? (
    <Text
      layers={sceneLayers.Label}
      color={districtTextColor}
      name={'City district label of ' + component.name}
      visible={isVisible}
      position={labelPosition}
      rotation={getLabelRotation(districtLabelPlacement)}
      fontSize={getFontSize()}
      raycast={() => null}
    >
      {getEntityDisplayName(component.name, component.id)}
    </Text>
  ) : null;
}
