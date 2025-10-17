import { Text } from '@react-three/drei';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import { Package } from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import { getEntityDisplayName } from 'explorviz-frontend/src/utils/annotation-utils';
import BoxLayout from 'explorviz-frontend/src/view-objects/layout-models/box-layout';
import { getLabelRotation } from 'explorviz-frontend/src/view-objects/utils/label-utils';
import gsap from 'gsap';
import { useEffect, useState } from 'react';
import * as THREE from 'three';
import { useShallow } from 'zustand/react/shallow';

export default function CityDistrictLabel({
  component,
  layout,
  isCameraZoomedIn,
}: {
  component: Package;
  layout: BoxLayout;
  isCameraZoomedIn: boolean;
}) {
  const {
    labelOffset,
    componentTextColor,
    closedComponentHeight,
    packageLabelMargin,
    enableAnimations,
    animationDuration,
    componentLabelPlacement,
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
    }))
  );

  const { isOpen, isVisible } = useVisualizationStore(
    useShallow((state) => ({
      isOpen: !state.closedComponentIds.has(component.id),
      isVisible: !state.hiddenComponentIds.has(component.id),
    }))
  );

  const [labelPosition, setLabelPosition] = useState<THREE.Vector3>(
    new THREE.Vector3()
  );

  const getLabelPositionForPlacement = (
    placement: string,
    isOpen: boolean
  ): THREE.Vector3 => {
    const margin = packageLabelMargin / 2;
    const openedPosY =
      layout.positionY + layout.height / 2 + labelOffset + 0.01;
    const closedPosY =
      layout.positionY -
      layout.height / 2 +
      closedComponentHeight +
      labelOffset +
      0.01;
    switch (placement) {
      case 'top':
        return isOpen
          ? new THREE.Vector3(
              layout.positionX,
              openedPosY,
              layout.positionZ - layout.depth / 2 + margin
            )
          : new THREE.Vector3(layout.positionX, closedPosY, layout.positionZ);
      case 'bottom':
        return isOpen
          ? new THREE.Vector3(
              layout.positionX,
              openedPosY,
              layout.positionZ + layout.depth / 2 - margin
            )
          : new THREE.Vector3(layout.positionX, closedPosY, layout.positionZ);
      case 'left':
        return isOpen
          ? new THREE.Vector3(
              layout.positionX - layout.width / 2 + margin,
              openedPosY,
              layout.positionZ
            )
          : new THREE.Vector3(layout.positionX, closedPosY, layout.positionZ);
      case 'right':
        return isOpen
          ? new THREE.Vector3(
              layout.positionX + layout.width / 2 - margin,
              openedPosY,
              layout.positionZ
            )
          : new THREE.Vector3(layout.positionX, closedPosY, layout.positionZ);
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

  return (
    <Text
      color={componentTextColor}
      visible={isVisible && (isCameraZoomedIn || !isOpen)}
      position={labelPosition}
      rotation={getLabelRotation(componentLabelPlacement)}
      fontSize={
        isOpen
          ? packageLabelMargin * 0.5
          : Math.max(layout.width * 0.1, packageLabelMargin * 0.5)
      }
      raycast={() => null}
    >
      {getEntityDisplayName(component.name, component.id)}
    </Text>
  );
}
