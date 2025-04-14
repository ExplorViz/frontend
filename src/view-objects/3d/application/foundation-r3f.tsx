import { ThreeElements } from '@react-three/fiber';
import { useHighlightingStore } from 'explorviz-frontend/src/stores/highlighting';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { Application } from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import FoundationMesh from 'explorviz-frontend/src/view-objects/3d/application/foundation-mesh';
import LabelMeshWrapper from 'explorviz-frontend/src/view-objects/3d/label-mesh-wrapper';
import BoxLayout from 'explorviz-frontend/src/view-objects/layout-models/box-layout';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useShallow } from 'zustand/react/shallow';

export default function FoundationR3F({
  application,
  boxLayout,
}: {
  application: Application;
  boxLayout: BoxLayout;
}) {
  const [foundationPosition, setFoundationPosition] = useState<THREE.Vector3>(
    new THREE.Vector3()
  );

  const highlightingActions = useHighlightingStore(
    useShallow((state) => ({
      toggleHighlight: state.toggleHighlight,
      updateHighlightingOnHover: state.updateHighlightingOnHover,
    }))
  );

  const { foundationColor, highlightedEntityColor } = useUserSettingsStore(
    useShallow((state) => ({
      foundationColor: state.colors?.foundationColor,
      highlightedEntityColor: state.colors?.highlightedEntityColor,
    }))
  );

  const opts = useMemo<ThreeElements['foundationMesh']['args'][0]>(() => {
    return {
      foundation: application,
      layout: boxLayout,
      defaultColor: foundationColor || new THREE.Color(0x000000),
      highlightingColor: highlightedEntityColor || new THREE.Color(0x000000),
    };
  }, [application, boxLayout, foundationColor, highlightedEntityColor]);

  const ref = useRef<FoundationMesh>(null!);

  useEffect(() => {
    setFoundationPosition(
      new THREE.Vector3(
        boxLayout.width / 2,
        boxLayout.positionY,
        boxLayout.depth / 2
      )
    );
  }, [boxLayout]);

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
    // TODO: Select active application for heatmap

    highlightingActions.toggleHighlight(ref.current, { sendMessage: true });
  };

  return (
    <foundationMesh
      position={foundationPosition}
      onClick={handleClick}
      onPointerOver={handleOnPointerOver}
      onPointerOut={handleOnPointerOut}
      args={[opts]}
      ref={ref}
    >
      <LabelMeshWrapper />
    </foundationMesh>
  );
}
