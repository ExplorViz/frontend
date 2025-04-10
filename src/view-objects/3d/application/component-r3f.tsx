import { ThreeElements } from '@react-three/fiber';
import { useHighlightingStore } from 'explorviz-frontend/src/stores/highlighting';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { Package } from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import ComponentMesh from 'explorviz-frontend/src/view-objects/3d/application/component-mesh';
import LabelMeshWrapper from 'explorviz-frontend/src/view-objects/3d/label-mesh-wrapper';
import BoxLayout from 'explorviz-frontend/src/view-objects/layout-models/box-layout';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useShallow } from 'zustand/react/shallow';

export default function ComponentR3F({
  component,
  appLayout,
  layout,
}: {
  component: Package;
  appLayout: BoxLayout;
  layout: BoxLayout;
}) {
  const [componentPosition, setComponentPosition] = useState<THREE.Vector3>(
    new THREE.Vector3()
  );

  const highlightingActions = useHighlightingStore(
    useShallow((state) => ({
      toggleHighlight: state.toggleHighlight,
      updateHighlightingOnHover: state.updateHighlightingOnHover,
    }))
  );

  const { foundationColor: componentColor, highlightedEntityColor } =
    useUserSettingsStore(
      useShallow((state) => ({
        foundationColor: state.colors?.componentEvenColor,
        highlightedEntityColor: state.colors?.highlightedEntityColor,
      }))
    );

  const opts = useMemo<ThreeElements['componentMesh']['args'][0]>(() => {
    return {
      layout,
      component,
      defaultColor: componentColor || new THREE.Color(0x000000),
      highlightingColor: highlightedEntityColor || new THREE.Color(0x000000),
    };
  }, [component, layout, componentColor, highlightedEntityColor]);

  const ref = useRef<ComponentMesh>(null!);

  useEffect(() => {
    const layoutPosition = layout.position;

    // Box meshes origin is in the center
    const centerPoint = new THREE.Vector3(
      layoutPosition.x + layout.width / 2.0,
      layoutPosition.y + layout.height / 2.0,
      layoutPosition.z + layout.depth / 2.0
    );

    // Offset position with applications position
    const appLayoutPosition = new THREE.Vector3(
      appLayout.positionX,
      appLayout.positionY,
      appLayout.positionZ
    );

    const position = new THREE.Vector3()
      .copy(centerPoint)
      .sub(appLayoutPosition);
    setComponentPosition(position);
    console.log(new THREE.Vector3().copy(centerPoint).sub(appLayoutPosition));
  }, [layout]);

  const handleOnPointerOver = (event: any) => {
    event.stopPropagation();
    ref.current.applyHoverEffect();
  };

  const handleOnPointerOut = (event: any) => {
    event.stopPropagation();
    ref.current.resetHoverEffect();
  };

  const handleClick = (event: any) => {
    event.stopPropagation();
    highlightingActions.toggleHighlight(ref.current, { sendMessage: true });
  };

  return (
    <componentMesh
      position={componentPosition}
      onClick={handleClick}
      onPointerOver={handleOnPointerOver}
      onPointerOut={handleOnPointerOut}
      args={[opts]}
      ref={ref}
    >
      <LabelMeshWrapper />
    </componentMesh>
  );
}
