import { Text } from '@react-three/drei';
import { useClusterStore } from 'explorviz-frontend/src/stores/cluster-store';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import { getEntityDisplayName } from 'explorviz-frontend/src/utils/annotation-utils';
import { isDistrictOpen } from 'explorviz-frontend/src/utils/city-rendering/district-close-state';
import { District } from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import BoxLayout from 'explorviz-frontend/src/utils/layout/box-layout';
import { getLabelRotation } from 'explorviz-frontend/src/view-objects/utils/label-utils';
import gsap from 'gsap';
import { useEffect, useState } from 'react';
import * as THREE from 'three';
import { useShallow } from 'zustand/react/shallow';

function computeDistrictLabelPosition(
  placement: string,
  isOpen: boolean,
  layout: BoxLayout,
  openedDistrictHeight: number,
  closedDistrictHeight: number,
  labelOffset: number,
  districtLabelMargin: number
): THREE.Vector3 {
  const margin = districtLabelMargin / 2;
  const openedPosY =
    layout.positionY + openedDistrictHeight + labelOffset + 0.01;
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
}

export default function CityDistrictLabel({
  district,
  layout,
}: {
  district: District;
  layout: BoxLayout;
}) {
  const { districtLabelMargin, labelDistanceThreshold, enableClustering } =
    useUserSettingsStore(
      useShallow((state) => ({
        districtLabelMargin:
          state.visualizationSettings.districtLabelMargin.value,
        labelDistanceThreshold:
          state.visualizationSettings.labelDistanceThreshold.value,
        enableClustering: state.visualizationSettings.enableClustering.value,
      }))
    );

  const isOpen = useVisualizationStore((state) =>
    isDistrictOpen(district.id, state.closedDistrictIds)
  );

  const fontSize = isOpen
    ? districtLabelMargin * 0.5
    : Math.max(layout.width * 0.1, districtLabelMargin * 0.5);

  // Larger labels of larger districts should be visible from a greater distance
  const sizeMultiplier = 1.0 + layout.area / 100000.0 + fontSize / 10.0;
  const adjustedThreshold = labelDistanceThreshold * sizeMultiplier;

  const isWithinDistance = useClusterStore((state) => {
    const distance = state.getCentroidDistance(district.id);
    return distance !== undefined
      ? distance <= adjustedThreshold
      : !enableClustering;
  });

  if (!isWithinDistance) {
    return null;
  }

  return (
    <CityDistrictLabelContent
      district={district}
      layout={layout}
      isOpen={isOpen}
      fontSize={fontSize}
    />
  );
}

function CityDistrictLabelContent({
  district,
  layout,
  isOpen,
  fontSize,
}: {
  district: District;
  layout: BoxLayout;
  isOpen: boolean;
  fontSize: number;
}) {
  const {
    labelOffset,
    districtTextColor,
    closedDistrictHeight,
    openedDistrictHeight,
    districtLabelMargin,
    enableAnimations,
    animationDuration,
    districtLabelPlacement,
  } = useUserSettingsStore(
    useShallow((state) => ({
      labelOffset: state.visualizationSettings.labelOffset.value,
      districtTextColor: state.visualizationSettings.districtTextColor.value,
      closedDistrictHeight:
        state.visualizationSettings.closedDistrictHeight.value,
      openedDistrictHeight:
        state.visualizationSettings.openedDistrictHeight.value,
      districtLabelMargin:
        state.visualizationSettings.districtLabelMargin.value,
      enableAnimations: state.visualizationSettings.enableAnimations.value,
      animationDuration: state.visualizationSettings.animationDuration.value,
      districtLabelPlacement:
        state.visualizationSettings.districtLabelPlacement.value,
    }))
  );

  const sceneLayers = useVisualizationStore((state) => state.sceneLayers);

  // Computed synchronously (not a zero-vector) because this component can
  // mount/unmount as the label crosses the semantic zoom distance threshold;
  // starting from the real target position avoids an animated "pop in from
  // the origin" every time the label becomes eligible again.
  const [labelPosition, setLabelPosition] = useState<THREE.Vector3>(() =>
    computeDistrictLabelPosition(
      districtLabelPlacement,
      isOpen,
      layout,
      openedDistrictHeight,
      closedDistrictHeight,
      labelOffset,
      districtLabelMargin
    )
  );

  useEffect(() => {
    const target = computeDistrictLabelPosition(
      districtLabelPlacement,
      isOpen,
      layout,
      openedDistrictHeight,
      closedDistrictHeight,
      labelOffset,
      districtLabelMargin
    );

    if (
      labelPosition.x === target.x &&
      labelPosition.y === target.y &&
      labelPosition.z === target.z
    ) {
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
        onUpdate: () => {
          setLabelPosition(new THREE.Vector3(values.x, values.y, values.z));
        },
      });
    } else {
      setLabelPosition(target.clone());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isOpen,
    enableAnimations,
    animationDuration,
    districtLabelPlacement,
    layout,
    openedDistrictHeight,
    closedDistrictHeight,
    labelOffset,
    districtLabelMargin,
  ]);

  return (
    <Text
      layers={sceneLayers.Label}
      color={districtTextColor}
      name={'City district label of ' + district.name}
      position={labelPosition}
      rotation={getLabelRotation(districtLabelPlacement)}
      fontSize={fontSize}
      raycast={() => null}
    >
      {getEntityDisplayName(district.name, district.id)}
    </Text>
  );
}
