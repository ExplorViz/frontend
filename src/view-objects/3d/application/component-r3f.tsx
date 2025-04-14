import { ThreeElements } from '@react-three/fiber';
import useClickPreventionOnDoubleClick from 'explorviz-frontend/src/hooks/useClickPreventionOnDoubleClick';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import {
  closeComponentMesh,
  openComponentMesh,
} from 'explorviz-frontend/src/utils/application-rendering/entity-manipulation';
import { Package } from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import { getStoredNumberSetting } from 'explorviz-frontend/src/utils/settings/local-storage-settings';
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

  const { isOpen, isSelected, isVisible, updateComponentState } =
    useVisualizationStore(
      useShallow((state) => ({
        isOpen: state.componentData[component.id].isOpen,
        isSelected: state.componentData[component.id].isSelected,
        isVisible: state.componentData[component.id].isVisible,
        updateComponentState: state.actions.updateComponentState,
      }))
    );

  const handleClick = (event: any) => {
    updateComponentState(component.id, {
      isSelected: !isSelected,
    });
    // todo: propagate state to collab service
    // highlightingActions.toggleHighlight(ref.current, { sendMessage: true });
  };

  const handleDoubleClick = (event: any) => {
    if (!isOpen) {
      openComponentMesh(ref.current);
      const yPos = layout.positionY + layout.height / 2 - appLayout.positionY;

      ref.current.height = OPENED_COMPONENT_HEIGHT;
      setComponentPosition(
        new THREE.Vector3(componentPosition.x, yPos, componentPosition.z)
      );
    } else {
      closeComponentMesh(component.id, component);
      const yPos =
        layout.positionY + CLOSED_COMPONENT_HEIGHT / 2 - appLayout.positionY;
      ref.current.height = CLOSED_COMPONENT_HEIGHT;
      setComponentPosition(
        new THREE.Vector3(componentPosition.x, yPos, componentPosition.z)
      );
    }
    /*     updateComponentState(component.id, {
      isOpen: !visualizationState.isOpen,
    }); */
    // todo: propagate state to collab service
  };

  const OPENED_COMPONENT_HEIGHT = getStoredNumberSetting(
    'openedComponentHeight'
  );
  const CLOSED_COMPONENT_HEIGHT = getStoredNumberSetting(
    'closedComponentHeight'
  );

  const ref = useRef<ComponentMesh>(null!);

  const [handleClickWithPrevent, handleDoubleClickWithPrevent] =
    useClickPreventionOnDoubleClick(handleClick, handleDoubleClick);

  const { componentEvenColor, componentOddColor, highlightedEntityColor } =
    useUserSettingsStore(
      useShallow((state) => ({
        highlightedEntityColor:
          state.visualizationSettings.highlightedEntityColor.value,
        componentEvenColor:
          state.visualizationSettings.componentEvenColor.value,
        componentOddColor: state.visualizationSettings.componentOddColor.value,
      }))
    );

  const opts = useMemo<ThreeElements['componentMesh']['args'][0]>(() => {
    return {
      layout,
      component,
      defaultColor:
        component.level % 2 === 0
          ? new THREE.Color(componentEvenColor)
          : new THREE.Color(componentOddColor),
      highlightingColor: new THREE.Color(highlightedEntityColor),
    };
  }, [
    component,
    layout,
    componentEvenColor,
    componentOddColor,
    highlightedEntityColor,
  ]);

  useEffect(() => {
    setComponentPosition(layout.position);
  }, [layout]);

  const handleOnPointerOver = (event: any) => {
    event.stopPropagation();
    ref.current.applyHoverEffect();
    updateComponentState(component.id, {
      isHovered: true,
    });
  };

  const handleOnPointerOut = (event: any) => {
    event.stopPropagation();
    ref.current.resetHoverEffect();
    updateComponentState(component.id, {
      isHovered: false,
    });
  };

  return (
    <componentMesh
      position={layout.position}
      highlighted={isSelected}
      opened={isOpen}
      visible={isVisible}
      onClick={handleClickWithPrevent}
      onDoubleClick={handleDoubleClickWithPrevent}
      onPointerOver={handleOnPointerOver}
      onPointerOut={handleOnPointerOut}
      args={[opts]}
      ref={ref}
    >
      <LabelMeshWrapper />
    </componentMesh>
  );
}
