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
  const { hoveredEntity } = useVisualizationStore(
    useShallow((state) => ({
      hoveredEntity: state.hoveredEntity,
    }))
  );

  const { componentTextColor, packageLabelMargin } = useUserSettingsStore(
    useShallow((state) => ({
      componentTextColor: state.visualizationSettings.componentTextColor.value,
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
    new THREE.Vector3(
      layout.positionX,
      layout.positionY + layout.height / 2 + 0.1,
      layout.positionZ
    )
  );

  useEffect(() => {
    if (isOpen) {
      setLabelPosition(labelPosition.clone().setZ(layout.positionZ));
    } else {
      setLabelPosition(new THREE.Vector3(0, 0.51, 0));
    }
  }, [layout, isOpen]);

  return (
    <Text
      color={componentTextColor}
      outlineColor={'white'}
      visible={isVisible}
      position={labelPosition}
      rotation={[1.5 * Math.PI, 0, 0]}
      fontSize={
        isOpen
          ? (packageLabelMargin * 10) / layout.depth
          : Math.max(
              layout.width * 0.0003,
              (packageLabelMargin * 0.9) / layout.depth
            )
      }
      raycast={() => null}
    >
      {component.name}
    </Text>
  );
}
