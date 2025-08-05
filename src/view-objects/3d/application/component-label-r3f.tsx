import { Text } from '@react-three/drei';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import { Package } from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import BoxLayout from 'explorviz-frontend/src/view-objects/layout-models/box-layout';
import { useEffect, useState } from 'react';
import * as THREE from 'three';
import { useShallow } from 'zustand/react/shallow';

export default function ComponentLabelR3F({
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
  } = useUserSettingsStore(
    useShallow((state) => ({
      labelOffset: state.visualizationSettings.labelOffset.value,
      componentTextColor: state.visualizationSettings.componentTextColor.value,
      closedComponentHeight:
        state.visualizationSettings.closedComponentHeight.value,
      packageLabelMargin: state.visualizationSettings.packageLabelMargin.value,
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

  useEffect(() => {
    if (isOpen) {
      setLabelPosition(
        labelPosition
          .clone()
          .setX(layout.positionX)
          .setY(layout.positionY + layout.height / 2 + labelOffset + 0.01)
          .setZ(layout.positionZ + layout.depth / 2 - packageLabelMargin / 2)
      );
    } else {
      setLabelPosition(
        labelPosition
          .clone()
          .setY(
            layout.positionY -
              layout.height / 2 +
              closedComponentHeight +
              labelOffset +
              0.01
          )
          .setZ(layout.positionZ)
      );
    }
  }, [layout, isOpen, labelOffset]);

  return (
    <Text
      color={componentTextColor}
      visible={isVisible && (isCameraZoomedIn || !isOpen)}
      position={labelPosition}
      rotation={[1.5 * Math.PI, 0, 0]}
      sdfGlyphSize={16}
      fontSize={
        isOpen
          ? packageLabelMargin * 0.5
          : Math.max(layout.width * 0.1, packageLabelMargin * 0.5)
      }
      raycast={() => null}
    >
      {component.name}
    </Text>
  );
}
