import { ThreeElements } from '@react-three/fiber';
import { useHighlightingStore } from 'explorviz-frontend/src/stores/highlighting';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { Class } from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import ComponentMesh from 'explorviz-frontend/src/view-objects/3d/application/component-mesh';
import LabelMeshWrapper from 'explorviz-frontend/src/view-objects/3d/label-mesh-wrapper';
import BoxLayout from 'explorviz-frontend/src/view-objects/layout-models/box-layout';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useShallow } from 'zustand/react/shallow';

export default function ClassR3F({
  dataModel,
  appLayout,
  layout,
}: {
  dataModel: Class;
  appLayout: BoxLayout;
  layout: BoxLayout;
}) {
  const [classPosition, setClassPosition] = useState<THREE.Vector3>(
    new THREE.Vector3()
  );

  const highlightingActions = useHighlightingStore(
    useShallow((state) => ({
      toggleHighlight: state.toggleHighlight,
      updateHighlightingOnHover: state.updateHighlightingOnHover,
    }))
  );

  const { classColor, highlightedEntityColor } = useUserSettingsStore(
    useShallow((state) => ({
      classColor: state.colors?.clazzColor,
      highlightedEntityColor: state.colors?.highlightedEntityColor,
    }))
  );

  const opts = useMemo<ThreeElements['clazzMesh']['args'][0]>(() => {
    return {
      layout,
      clazz: dataModel,
      defaultColor: classColor || new THREE.Color(0x000000),
      highlightingColor: highlightedEntityColor || new THREE.Color(0x000000),
    };
  }, [dataModel, layout, classColor, highlightedEntityColor]);

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
    setClassPosition(position);
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
    <clazzMesh
      position={classPosition}
      onClick={handleClick}
      onPointerOver={handleOnPointerOver}
      onPointerOut={handleOnPointerOut}
      args={[opts]}
      ref={ref}
    >
      {/* <LabelMeshWrapper /> */}
    </clazzMesh>
  );
}
