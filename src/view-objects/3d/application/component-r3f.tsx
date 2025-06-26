import { Instance, Text } from '@react-three/drei';
import { ThreeEvent } from '@react-three/fiber';
import { usePointerStop } from 'explorviz-frontend/src/hooks/pointer-stop';
import useClickPreventionOnDoubleClick from 'explorviz-frontend/src/hooks/useClickPreventionOnDoubleClick';
import { usePopupHandlerStore } from 'explorviz-frontend/src/stores/popup-handler';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import * as EntityManipulation from 'explorviz-frontend/src/utils/application-rendering/entity-manipulation';
import calculateColorBrightness from 'explorviz-frontend/src/utils/helpers/threejs-helpers';
import { Package } from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import BoxLayout from 'explorviz-frontend/src/view-objects/layout-models/box-layout';
import { gsap } from 'gsap';
import { useCallback, useEffect, useState } from 'react';
import * as THREE from 'three';
import { useShallow } from 'zustand/react/shallow';

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

  const { addPopup } = usePopupHandlerStore(
    useShallow((state) => ({
      addPopup: state.addPopup,
    }))
  );

  const handlePointerStop = (event: ThreeEvent<PointerEvent>) => {
    addPopup({
      model: component,
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
        isOpen: state.componentData[component.id]
          ? state.componentData[component.id].isOpen
          : true,
        isHighlighted: state.componentData[component.id]
          ? state.componentData[component.id].isHighlighted
          : false,
        isHovered: state.componentData[component.id]
          ? state.componentData[component.id].isHovered
          : false,
        isVisible: state.componentData[component.id]
          ? state.componentData[component.id].isVisible
          : true,
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

  const [labelPosition, setLabelPosition] = useState<THREE.Vector3>(
    new THREE.Vector3(0, 0.51, 0.5 - packageLabelMargin / layout.depth / 2)
  );

  // Open component using gsap animation system
  const openWithAnimation = useCallback(() => {
    const gsapValues = {
      height: componentHeight,
      positionY: componentPosition.y,
      labelPosZ: labelPosition.z,
    };
    gsap.to(gsapValues, {
      height: openedComponentHeight,
      positionY: layout.positionY,
      duration: 0.25,
      labelPosZ: 0.5 - packageLabelMargin / layout.depth / 2,
      onUpdate: () => {
        setComponentHeight(gsapValues.height);
        setComponentPosition(
          layout.position.clone().setY(gsapValues.positionY)
        );
        setLabelPosition(labelPosition.clone().setZ(gsapValues.labelPosZ));
      },
    });
  }, [componentHeight, openedComponentHeight, componentPosition, layout]);

  // Close component using gsap animation system
  const closeWithAnimation = useCallback(() => {
    const gsapValues = {
      height: componentHeight,
      positionY: componentPosition.y,
      labelPosZ: labelPosition.z,
    };
    gsap.to(gsapValues, {
      height: closedComponentHeight,
      positionY:
        layout.positionY + (closedComponentHeight - openedComponentHeight) / 2,
      duration: 0.25,
      labelPosZ: 0,
      onUpdate: () => {
        setComponentHeight(gsapValues.height);
        setComponentPosition(
          layout.position.clone().setY(gsapValues.positionY)
        );
        setLabelPosition(labelPosition.clone().setZ(gsapValues.labelPosZ));
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
        setLabelPosition(
          new THREE.Vector3(
            0,
            0.51,
            0.5 - packageLabelMargin / layout.depth / 2
          )
        );
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
        setLabelPosition(new THREE.Vector3(0, 0.51, 0));
      }
    }
  }, [layout, isOpen]);

  const handleClick = (/*event: any*/) => {
    // Prevent firing of event after landscape has been dragged
    updateComponentState(component.id, {
      isHighlighted: !isHighlighted,
    });

    // todo: propagate state to collaboration service
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

  const computeColor = () => {
    const baseColor = isHighlighted
      ? new THREE.Color(highlightedEntityColor)
      : new THREE.Color(
          layout.level % 2 === 0 ? componentEvenColor : componentOddColor
        );

    if (isHovered) {
      return calculateColorBrightness(baseColor, 1.1);
    } else {
      return baseColor;
    }
  };

  return (
    <>
      {isVisible && (
        <Instance
          color={computeColor()}
          scale={[layout.width, componentHeight, layout.depth]}
          position={componentPosition}
          rotation={[0, 0, 0]}
          onClick={handleClickWithPrevent}
          onDoubleClick={handleDoubleClickWithPrevent}
          onPointerOver={handleOnPointerOver}
          onPointerOut={handleOnPointerOut}
          {...pointerStopHandlers}
        >
          {packageLabelMargin > 1.5 && (
            <Text
              color={componentTextColor}
              outlineColor={'white'}
              position={labelPosition}
              rotation={[1.5 * Math.PI, 0, 0]}
              fontSize={(packageLabelMargin * 0.9) / layout.depth}
              raycast={() => null}
            >
              {component.name}
            </Text>
          )}
        </Instance>
      )}
    </>
  );
}
