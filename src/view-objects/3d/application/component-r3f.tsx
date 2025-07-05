import { Helper, Instance, Text } from '@react-three/drei';
import { ThreeEvent } from '@react-three/fiber';
import { usePointerStop } from 'explorviz-frontend/src/hooks/pointer-stop';
import useClickPreventionOnDoubleClick from 'explorviz-frontend/src/hooks/useClickPreventionOnDoubleClick';
import { usePopupHandlerStore } from 'explorviz-frontend/src/stores/popup-handler';
import { useEvolutionDataRepositoryStore } from 'explorviz-frontend/src/stores/repos/evolution-data-repository';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { useVisibilityServiceStore } from 'explorviz-frontend/src/stores/visibility-service';
import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import * as EntityManipulation from 'explorviz-frontend/src/utils/application-rendering/entity-manipulation';
import calculateColorBrightness from 'explorviz-frontend/src/utils/helpers/threejs-helpers';
import {
  Application,
  Package,
  TypeOfAnalysis,
} from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import BoxLayout from 'explorviz-frontend/src/view-objects/layout-models/box-layout';
import { gsap } from 'gsap';
import { useCallback, useEffect, useState } from 'react';
import * as THREE from 'three';
import { useShallow } from 'zustand/react/shallow';
import ComponentMesh from 'explorviz-frontend/src/view-objects/3d/application/component-mesh';
import { useRef } from 'react';

export default function ComponentR3F({
  component,
  layout,
  application,
}: {
  component: Package;
  layout: BoxLayout;
  application: Application;
}) {
  const meshRef = useRef<ComponentMesh>(null!);
  const [componentPosition, setComponentPosition] = useState<THREE.Vector3>(
    layout.position.clone()
  );
  const [componentWidth, setComponentWidth] = useState<number>(layout.width);
  const [componentHeight, setComponentHeight] = useState<number>(layout.height);
  const [componentDepth, setComponentDepth] = useState<number>(layout.depth);

  const { addPopup } = usePopupHandlerStore(
    useShallow((state) => ({
      addPopup: state.addPopup,
    }))
  );

  useEffect(() => {
    if (enableAnimations) {
      const gsapValues = { width: componentWidth, depth: componentDepth };
      gsap.to(gsapValues, {
        width: layout.width,
        depth: layout.depth,
        duration: 0.25,
        onUpdate: () => {
          setComponentWidth(gsapValues.width);
          setComponentDepth(gsapValues.depth);
        },
      });
    } else {
      setComponentWidth(layout.width);
      setComponentDepth(layout.depth);
    }
  }, [layout.width, layout.depth]);

  const commitComparison = useEvolutionDataRepositoryStore
    .getState()
    .getCommitComparisonByAppName(application.name);

  const { evoConfig } = useVisibilityServiceStore(
    useShallow((state) => ({
      evoConfig: state._evolutionModeRenderingConfiguration,
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
    castShadows,
    closedComponentHeight,
    componentEvenColor,
    componentOddColor,
    componentTextColor,
    enableAnimations,
    enableHoverEffects,
    highlightedEntityColor,
    openedComponentHeight,
    packageLabelMargin,
    addedComponentColor,
    removedComponentColor,
    unChangedComponentColor,
  } = useUserSettingsStore(
    useShallow((state) => ({
      castShadows: state.visualizationSettings.castShadows.value,
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
      enableHoverEffects: state.visualizationSettings.enableHoverEffects.value,
      componentTextColor: state.visualizationSettings.componentTextColor.value,
      addedComponentColor:
        state.visualizationSettings.addedComponentColor.value,
      removedComponentColor:
        state.visualizationSettings.removedComponentColor.value,
      unChangedComponentColor:
        state.visualizationSettings.unchangedComponentColor.value,
    }))
  );

  const [labelPosition, setLabelPosition] = useState<THREE.Vector3>(
    new THREE.Vector3(0, 0.51, 0.5 - packageLabelMargin / layout.depth / 2)
  );

  // Open component using gsap animation system
  const openWithAnimation = useCallback(() => {
    const gsapValues = {
      height: componentHeight,
      positionX: componentPosition.x,
      positionY: componentPosition.y,
      positionZ: componentPosition.z,
      labelPosZ: labelPosition.z,
    };
    gsap.to(gsapValues, {
      height: openedComponentHeight,
      positionX: layout.positionX,
      positionY: layout.positionY,
      positionZ: layout.positionZ,
      duration: 0.25,
      labelPosZ: 0.5 - packageLabelMargin / layout.depth / 2,
      onUpdate: () => {
        setComponentHeight(gsapValues.height);
        setComponentPosition(
          new THREE.Vector3(
            gsapValues.positionX,
            gsapValues.positionY,
            gsapValues.positionZ
          )
        );
        setLabelPosition(labelPosition.clone().setZ(gsapValues.labelPosZ));
      },
    });
  }, [componentHeight, openedComponentHeight, componentPosition, layout]);

  // Close component using gsap animation system
  const closeWithAnimation = useCallback(() => {
    const gsapValues = {
      height: componentHeight,
      positionX: componentPosition.x,
      positionY: componentPosition.y,
      positionZ: componentPosition.z,
      labelPosZ: labelPosition.z,
    };
    gsap.to(gsapValues, {
      height: closedComponentHeight,
      positionX: layout.positionX,
      positionY:
        layout.positionY + (closedComponentHeight - openedComponentHeight) / 2,
      positionZ: layout.positionZ,
      duration: 0.25,
      labelPosZ: 0,
      onUpdate: () => {
        setComponentHeight(gsapValues.height);
        setComponentPosition(
          new THREE.Vector3(
            gsapValues.positionX,
            gsapValues.positionY,
            gsapValues.positionZ
          )
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
    if (evoConfig.renderOnlyDifferences && commitComparison && component.fqn) {
      if (commitComparison.addedPackageFqns.includes(component.fqn)) {
        return new THREE.Color(addedComponentColor);
      } else if (commitComparison.deletedPackageFqns.includes(component.fqn)) {
        return new THREE.Color(removedComponentColor);
      } else {
        return new THREE.Color(unChangedComponentColor);
      }
    }

    const baseColor = isHighlighted
      ? new THREE.Color(highlightedEntityColor)
      : new THREE.Color(
          layout.level % 2 === 0 ? componentEvenColor : componentOddColor
        );

    if (enableHoverEffects && isHovered) {
      return calculateColorBrightness(baseColor, 1.1);
    } else {
      return baseColor;
    }
  };

  // Check if component should be displayed
  if (
    (component.originOfData === TypeOfAnalysis.Static &&
      !evoConfig.renderStatic) ||
    (component.originOfData === TypeOfAnalysis.Dynamic &&
      !evoConfig.renderDynamic)
  ) {
    return null;
  }

  return (
    <>
      {isVisible && (
        <Instance
          castShadow={castShadows}
          color={computeColor()}
          scale={[componentWidth, componentHeight, componentDepth]}
          position={componentPosition}
          onClick={handleClickWithPrevent}
          onDoubleClick={handleDoubleClickWithPrevent}
          onPointerOver={handleOnPointerOver}
          onPointerOut={handleOnPointerOut}
          ref={meshRef}
          {...pointerStopHandlers}
        >
          {packageLabelMargin > 1.5 && (
            <Text
              color={componentTextColor}
              outlineColor={'white'}
              position={labelPosition}
              rotation={[1.5 * Math.PI, 0, 0]}
              fontSize={
                isOpen
                  ? (packageLabelMargin * 0.9) / layout.depth
                  : Math.max(
                      layout.width * 0.0003,
                      (packageLabelMargin * 0.9) / layout.depth
                    )
              }
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
