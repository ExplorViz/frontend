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
}: {
  component: Package;
  layout: BoxLayout;
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
      isOpen: state.componentData[component.id]
        ? state.componentData[component.id].isOpen
        : true,
      isVisible: state.componentData[component.id]
        ? state.componentData[component.id].isVisible
        : true,
    }))
  );

  const [labelPosition, setLabelPosition] = useState<THREE.Vector3>(
    new THREE.Vector3()
  );

  useEffect(() => {
    console.log(`Updating label position for component ${component.name}`);

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
      outlineColor={'white'}
      visible={isVisible}
      position={labelPosition}
      rotation={[1.5 * Math.PI, 0, 0]}
      fontSize={(packageLabelMargin * 10) / 20}
      raycast={() => null}
    >
      {component.name}
    </Text>
  );
}
