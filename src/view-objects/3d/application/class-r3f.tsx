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
      position={layout.position}
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
