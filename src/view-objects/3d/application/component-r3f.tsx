import { ThreeElements, ThreeEvent } from '@react-three/fiber';
import useClickPreventionOnDoubleClick from 'explorviz-frontend/src/hooks/useClickPreventionOnDoubleClick';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import * as EntityManipulation from 'explorviz-frontend/src/utils/application-rendering/entity-manipulation';
import { Package } from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import BoxLayout from 'explorviz-frontend/src/view-objects/layout-models/box-layout';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useShallow } from 'zustand/react/shallow';
import { gsap } from 'gsap';
import { usePointerStop } from 'explorviz-frontend/src/hooks/pointer-stop';
import { usePopupHandlerStore } from 'explorviz-frontend/src/stores/popup-handler';
import ComponentMesh from 'explorviz-frontend/src/view-objects/3d/application/component-mesh';
import { Text } from '@react-three/drei';

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

  const meshRef = useRef<ComponentMesh | null>(null);

  const { addPopup } = usePopupHandlerStore(
    useShallow((state) => ({
      addPopup: state.addPopup,
    }))
  );

  const handlePointerStop = (event: ThreeEvent<PointerEvent>) => {
    addPopup({
      mesh: meshRef.current,
      position: {
        x: event.clientX,
        y: event.clientY,
      },
    });
  };

  const pointerStopHandlers = usePointerStop(handlePointerStop);

  const { isOpen, isHighlighted, isHovered, isVisible, updateComponentState } =
    useVisualizationStore(
      useShallow((state) => ({
        isOpen: state.componentData[component.id]?.isOpen,
        isHighlighted: state.componentData[component.id]?.isHighlighted,
        isHovered: state.componentData[component.id]?.isHovered,
        isVisible: state.componentData[component.id]?.isVisible,
        updateComponentState: state.actions.updateComponentState,
      }))
    );

  const {
    closedComponentHeight,
    componentEvenColor,
    componentOddColor,
    componentTextColor,
    enableAnimations,
    highlightedEntityColor,
    openedComponentHeight,
    packageLabelMargin,
  } = useUserSettingsStore(
    useShallow((state) => ({
      packageLabelMargin: state.visualizationSettings.packageLabelMargin.value,
      highlightedEntityColor:
        state.visualizationSettings.highlightedEntityColor.value,
      componentEvenColor: state.visualizationSettings.componentEvenColor.value,
      componentOddColor: state.visualizationSettings.componentOddColor.value,
      closedComponentHeight:
        state.visualizationSettings.closedComponentHeight.value,
      openedComponentHeight:
        state.visualizationSettings.openedComponentHeight.value,
      enableAnimations: state.visualizationSettings.enableAnimations.value,
      componentTextColor: state.visualizationSettings.componentTextColor.value,
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
  }, [layout, isOpen]);

  const handleClick = (/*event: any*/) => {
    // Prevent firing of event after landscape has been dragged

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

  const constructorArgs = useMemo<
    ThreeElements['componentMesh']['args'][0]
  >(() => {
    return {
      component,
    };
  }, []);

  const handleOnPointerOver = (event: any) => {
    event.stopPropagation();
    updateComponentState(component.id, {
      isHovered: true,
    });
  };

  const handleOnPointerOut = (event: any) => {
    event.stopPropagation();
    updateComponentState(component.id, {
      isHovered: false,
    });
  };

  return (
    <componentMesh
      {...pointerStopHandlers}
      args={[constructorArgs]}
      defaultColor={
        layout.level % 2 === 0 ? componentEvenColor : componentOddColor
      }
      height={componentHeight}
      highlighted={isHighlighted}
      isHovered={isHovered}
      highlightingColor={highlightedEntityColor}
      layout={layout}
      opened={isOpen}
      position={componentPosition}
      visible={isVisible}
      onClick={handleClickWithPrevent}
      onDoubleClick={handleDoubleClickWithPrevent}
      onPointerOver={handleOnPointerOver}
      onPointerOut={handleOnPointerOut}
      ref={meshRef}
    >
      {packageLabelMargin > 1.5 && (
        <Text
          color={componentTextColor}
          outlineColor={'white'}
          position={[0, 0.51, 0.5 - packageLabelMargin / layout.depth / 2]}
          rotation={[1.5 * Math.PI, 0, 0]}
          fontSize={(packageLabelMargin * 0.9) / layout.depth}
          raycast={() => null}
        >
          {component.name}
        </Text>
      )}
    </componentMesh>
  );
}
