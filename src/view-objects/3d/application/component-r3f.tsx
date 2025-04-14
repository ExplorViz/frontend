import { ThreeElements } from '@react-three/fiber';
import useClickPreventionOnDoubleClick from 'explorviz-frontend/src/hooks/useClickPreventionOnDoubleClick';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import * as EntityManipulation from 'explorviz-frontend/src/utils/application-rendering/entity-manipulation';
import { Package } from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import LabelMeshWrapper from 'explorviz-frontend/src/view-objects/3d/label-mesh-wrapper';
import BoxLayout from 'explorviz-frontend/src/view-objects/layout-models/box-layout';
import { useCallback, useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { useShallow } from 'zustand/react/shallow';
import { gsap } from 'gsap';

export default function ComponentR3F({
  component,
  layout,
}: {
  component: Package;
  layout: BoxLayout;
}) {
  const [componentPosition, setComponentPosition] = useState<THREE.Vector3>(
    layout.position.clone()
  );
  const [componentHeight, setComponentHeight] = useState<number>(layout.height);

  const { isOpen, isHighlighted, isVisible, updateComponentState } =
    useVisualizationStore(
      useShallow((state) => ({
        isOpen: state.componentData[component.id].isOpen,
        isHighlighted: state.componentData[component.id].isHighlighted,
        isVisible: state.componentData[component.id].isVisible,
        updateComponentState: state.actions.updateComponentState,
      }))
    );

  const {
    closedComponentHeight,
    componentEvenColor,
    componentOddColor,
    enableAnimations,
    highlightedEntityColor,
    openedComponentHeight,
  } = useUserSettingsStore(
    useShallow((state) => ({
      highlightedEntityColor:
        state.visualizationSettings.highlightedEntityColor.value,
      componentEvenColor: state.visualizationSettings.componentEvenColor.value,
      componentOddColor: state.visualizationSettings.componentOddColor.value,
      closedComponentHeight:
        state.visualizationSettings.closedComponentHeight.value,
      openedComponentHeight:
        state.visualizationSettings.openedComponentHeight.value,
      enableAnimations: state.visualizationSettings.enableAnimations.value,
    }))
  );

  // Open component using gsap animation system
  const openWithAnimation = useCallback(() => {
    const gsapValues = {
      height: componentHeight,
      positionY: componentPosition.y,
    };
    gsap.to(gsapValues, {
      height: openedComponentHeight,
      positionY: layout.positionY,
      duration: 0.25,
      onUpdate: () => {
        setComponentHeight(gsapValues.height);
        setComponentPosition(
          layout.position.clone().setY(gsapValues.positionY)
        );
      },
    });
  }, [componentHeight, openedComponentHeight, componentPosition, layout]);

  // Close component using gsap animation system
  const closeWithAnimation = useCallback(() => {
    const gsapValues = {
      height: componentHeight,
      positionY: componentPosition.y,
    };
    gsap.to(gsapValues, {
      height: closedComponentHeight,
      positionY:
        layout.positionY + (closedComponentHeight - openedComponentHeight) / 2,
      duration: 0.25,
      onUpdate: () => {
        setComponentHeight(gsapValues.height);
        setComponentPosition(
          layout.position.clone().setY(gsapValues.positionY)
        );
      },
    });
  }, [
    closedComponentHeight,
    componentHeight,
    openedComponentHeight,
    componentPosition,
    layout,
  ]);

  useEffect(() => {
    if (isOpen) {
      if (enableAnimations) {
        openWithAnimation();
      } else {
        setComponentPosition(layout.position);
        setComponentHeight(openedComponentHeight);
      }
    } else {
      if (enableAnimations) {
        closeWithAnimation();
      } else {
        const closedPosition = layout.position.clone();
        // Y-Position of layout is center of opened component
        closedPosition.y =
          layout.positionY +
          (closedComponentHeight - openedComponentHeight) / 2;
        setComponentPosition(closedPosition);
        setComponentHeight(closedComponentHeight);
      }
    }
  }, [
    isOpen,
    layout,
    closeWithAnimation,
    openWithAnimation,
    openedComponentHeight,
    closedComponentHeight,
    enableAnimations,
  ]);

  const handleClick = (/*event: any*/) => {
    updateComponentState(component.id, {
      isHighlighted: !isHighlighted,
    });
    // todo: propagate state to collab service
    // highlightingActions.toggleHighlight(ref.current, { sendMessage: true });
  };

  const handleDoubleClick = (/*event: any*/) => {
    if (!isOpen) {
      EntityManipulation.openComponent(component);
    } else {
      EntityManipulation.closeComponent(component);
    }
  };

  const [handleClickWithPrevent, handleDoubleClickWithPrevent] =
    useClickPreventionOnDoubleClick(handleClick, handleDoubleClick);

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

  const handleOnPointerOver = (event: any) => {
    event.stopPropagation();
    event.object.applyHoverEffect();
    updateComponentState(component.id, {
      isHovered: true,
    });
  };

  const handleOnPointerOut = (event: any) => {
    event.stopPropagation();
    event.object.resetHoverEffect();
    updateComponentState(component.id, {
      isHovered: false,
    });
  };

  return (
    <componentMesh
      position={componentPosition}
      highlighted={isHighlighted}
      height={componentHeight}
      opened={isOpen}
      visible={isVisible}
      onClick={handleClickWithPrevent}
      onDoubleClick={handleDoubleClickWithPrevent}
      onPointerOver={handleOnPointerOver}
      onPointerOut={handleOnPointerOut}
      args={[opts]}
    >
      <LabelMeshWrapper />
    </componentMesh>
  );
}
