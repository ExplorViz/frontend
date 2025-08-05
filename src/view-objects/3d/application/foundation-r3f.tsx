import { Text } from '@react-three/drei';
import { ThreeEvent } from '@react-three/fiber';
import { usePointerStop } from 'explorviz-frontend/src/hooks/pointer-stop';
import useClickPreventionOnDoubleClick from 'explorviz-frontend/src/hooks/useClickPreventionOnDoubleClick';
import { usePopupHandlerStore } from 'explorviz-frontend/src/stores/popup-handler';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import calculateColorBrightness from 'explorviz-frontend/src/utils/helpers/threejs-helpers';
import { Application } from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import BoxLayout from 'explorviz-frontend/src/view-objects/layout-models/box-layout';
import { gsap } from 'gsap';
import { useEffect, useState } from 'react';
import * as THREE from 'three';
import * as EntityManipulation from 'explorviz-frontend/src/utils/application-rendering/entity-manipulation';
import { useShallow } from 'zustand/react/shallow';

export default function FoundationR3F({
  application,
  layout,
}: {
  application: Application;
  layout: BoxLayout;
}) {
  const [foundationPosition, setFoundationPosition] = useState<THREE.Vector3>(
    new THREE.Vector3(layout.width / 2, layout.positionY, layout.depth / 2)
  );

  useEffect(() => {
    if (enableAnimations) {
      const gsapValues = {
        positionX: foundationPosition.x,
        positionY: foundationPosition.y,
        positionZ: foundationPosition.z,
      };
      gsap.to(gsapValues, {
        positionX: layout.width / 2,
        positionY: layout.positionY,
        positionZ: layout.depth / 2,
        duration: 0.25,
        onUpdate: () => {
          setFoundationPosition(
            new THREE.Vector3(
              gsapValues.positionX,
              gsapValues.positionY,
              gsapValues.positionZ
            )
          );
        },
      });
    } else {
      setFoundationPosition(
        new THREE.Vector3(layout.width / 2, layout.positionY, layout.depth / 2)
      );
    }
  }, [layout.width, layout.positionY, layout.depth]);

  const { isHighlighted, isHovered, updateFoundationState } =
    useVisualizationStore(
      useShallow((state) => ({
        isHighlighted: state.foundationData[application.id]
          ? state.foundationData[application.id].isHighlighted
          : false,
        isHovered: state.foundationData[application.id]
          ? state.foundationData[application.id].isHovered
          : false,
        updateFoundationState: state.actions.updateFoundationState,
      }))
    );

  const { addPopup } = usePopupHandlerStore(
    useShallow((state) => ({
      addPopup: state.addPopup,
    }))
  );

  const handlePointerStop = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    addPopup({
      model: application,
      applicationId: application.id,
      position: {
        x: event.clientX,
        y: event.clientY,
      },
    });
  };

  const pointerStopHandlers = usePointerStop(handlePointerStop);

  const {
    appLabelMargin,
    castShadows,
    enableAnimations,
    enableHoverEffects,
    foundationColor,
    foundationTextColor,
    highlightedEntityColor,
  } = useUserSettingsStore(
    useShallow((state) => ({
      appLabelMargin: state.visualizationSettings.appLabelMargin.value,
      castShadows: state.visualizationSettings.castShadows.value,
      enableAnimations: state.visualizationSettings.enableAnimations.value,
      foundationColor: state.visualizationSettings.foundationColor.value,
      highlightedEntityColor:
        state.visualizationSettings.highlightedEntityColor.value,
      enableHoverEffects: state.visualizationSettings.enableHoverEffects.value,
      foundationTextColor:
        state.visualizationSettings.foundationTextColor.value,
    }))
  );

  const handleOnPointerOver = (event: any) => {
    event.stopPropagation();
    if (enableHoverEffects) {
      updateFoundationState(application.id, { isHovered: true });
    }
  };

  const handleOnPointerOut = (event: any) => {
    event.stopPropagation();
    updateFoundationState(application.id, { isHovered: false });
  };

  const handleClick = (/*event: any*/) => {
    updateFoundationState(application.id, { isHighlighted: !isHighlighted });
  };

  const handleDoubleClick = (/*event: any*/) => {
    EntityManipulation.closeAllComponentsInApplication(application);
  };

  const [handleClickWithPrevent, handleDoubleClickWithPrevent] =
    useClickPreventionOnDoubleClick(handleClick, handleDoubleClick);

  const computeColor = () => {
    const baseColor = isHighlighted
      ? new THREE.Color(highlightedEntityColor)
      : new THREE.Color(foundationColor);

    if (enableHoverEffects && isHovered) {
      return calculateColorBrightness(baseColor, 1.1);
    } else {
      return baseColor;
    }
  };

  return (
    <mesh
      castShadow={castShadows}
      scale={[layout.width, layout.height, layout.depth]}
      position={foundationPosition} // Center around application's position
      onClick={handleClickWithPrevent}
      onDoubleClick={handleDoubleClickWithPrevent}
      onPointerOver={handleOnPointerOver}
      onPointerOut={handleOnPointerOut}
      {...pointerStopHandlers}
    >
      <meshLambertMaterial color={computeColor()} />
      <boxGeometry />
      {appLabelMargin > 1.5 && (
        <Text
          color={foundationTextColor}
          outlineColor={'white'}
          position={[0, 0.51, 0.5 - appLabelMargin / layout.depth / 2]}
          rotation={[1.5 * Math.PI, 0, 0]}
          fontSize={(appLabelMargin * 0.9) / layout.depth}
          raycast={() => null}
        >
          {application.name}
        </Text>
      )}
    </mesh>
  );
}
