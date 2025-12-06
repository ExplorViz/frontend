import { Text } from '@react-three/drei';
import { ThreeEvent } from '@react-three/fiber';
import { usePointerStop } from 'explorviz-frontend/src/hooks/pointer-stop';
import useClickPreventionOnDoubleClick from 'explorviz-frontend/src/hooks/useClickPreventionOnDoubleClick';
import { usePopupHandlerStore } from 'explorviz-frontend/src/stores/popup-handler';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import calculateColorBrightness from 'explorviz-frontend/src/utils/helpers/threejs-helpers';
import { Application } from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import { getEntityDisplayName } from 'explorviz-frontend/src/utils/annotation-utils';
import BoxLayout from 'explorviz-frontend/src/view-objects/layout-models/box-layout';
import { gsap } from 'gsap';
import { useEffect, useState } from 'react';
import * as THREE from 'three';
import * as EntityManipulation from 'explorviz-frontend/src/utils/application-rendering/entity-manipulation';
import { useShallow } from 'zustand/react/shallow';
import { getLabelRotation } from 'explorviz-frontend/src/view-objects/utils/label-utils';
import {
  getHighlightingColorForEntity,
  toggleHighlightById,
} from 'explorviz-frontend/src/utils/application-rendering/highlighting';

export default function CityFoundation({
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

  const { isHighlighted, isHovered, setHoveredEntityId } =
    useVisualizationStore(
      useShallow((state) => ({
        isHighlighted: state.highlightedEntityIds.has(application.id),
        isHovered: state.hoveredEntityId === application.id,
        setHoveredEntityId: state.actions.setHoveredEntityId,
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
      entityId: application.id,
      entity: application,
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
    componentLabelPlacement,
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
      componentLabelPlacement:
        state.visualizationSettings.componentLabelPlacement.value,
    }))
  );

  const handleOnPointerOver = (event: any) => {
    event.stopPropagation();
      setHoveredEntityId(application.id);
  };

  const handleOnPointerOut = (event: any) => {
    event.stopPropagation();
      setHoveredEntityId(null);
  };

  const handleClick = (/*event: any*/) => {
    toggleHighlightById(application.id);
  };

  const handleDoubleClick = (/*event: any*/) => {
    EntityManipulation.closeAllComponentsInApplication(application);
  };

  const [handleClickWithPrevent, handleDoubleClickWithPrevent] =
    useClickPreventionOnDoubleClick(handleClick, handleDoubleClick);

  const computeColor = () => {
    const baseColor = isHighlighted
      ? getHighlightingColorForEntity(application.id)
      : new THREE.Color(foundationColor);

    if (enableHoverEffects && isHovered) {
      return calculateColorBrightness(baseColor, 1.1);
    } else {
      return baseColor;
    }
  };

  const getLabelPosition = (): [number, number, number] => {
    const margin = appLabelMargin / layout.depth / 2;
    const yPos = 0.51; // Just above the foundation
    switch (componentLabelPlacement) {
      case 'top':
        return [0, yPos, -0.5 + margin];
      case 'bottom':
        return [0, yPos, 0.5 - margin];
      case 'left':
        return [-0.5 + margin, yPos, 0];
      case 'right':
        return [0.5 - margin, yPos, 0];
      default:
        return [0, yPos, 0.5 - margin];
    }
  };

  return (
    <mesh
      castShadow={castShadows}
      scale={[layout.width, layout.height, layout.depth]}
      position={foundationPosition} // Center around application's position
      onClick={handleClickWithPrevent}
      onDoubleClick={handleDoubleClickWithPrevent}
      {...(enableHoverEffects && {
        onPointerOver: handleOnPointerOver,
        onPointerOut: handleOnPointerOut,
      })}
      {...pointerStopHandlers}
    >
      <meshLambertMaterial color={computeColor()} />
      <boxGeometry />
      {appLabelMargin > 1.5 && (
        <Text
          color={foundationTextColor}
          outlineColor={'white'}
          position={getLabelPosition()}
          rotation={getLabelRotation(componentLabelPlacement)}
          fontSize={(appLabelMargin * 0.9) / layout.depth}
          raycast={() => null}
        >
          {getEntityDisplayName(application.name, application.id)}
        </Text>
      )}
    </mesh>
  );
}
