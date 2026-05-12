import { Text } from '@react-three/drei';
import { ThreeEvent } from '@react-three/fiber';
import useClickPreventionOnDoubleClick from 'explorviz-frontend/src/hooks/useClickPreventionOnDoubleClick';
import { usePopupHandlerStore } from 'explorviz-frontend/src/stores/popup-handler';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import { getEntityDisplayName } from 'explorviz-frontend/src/utils/annotation-utils';
import * as EntityManipulation from 'explorviz-frontend/src/utils/city-rendering/entity-manipulation';
import { getHighlightingColorForEntity } from 'explorviz-frontend/src/utils/city-rendering/highlighting';
import { emitContextMenuFromWorld } from 'explorviz-frontend/src/utils/context-menu-bridge';
import calculateColorBrightness from 'explorviz-frontend/src/utils/helpers/threejs-helpers';
import { City } from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import BoxLayout from 'explorviz-frontend/src/utils/layout/box-layout';
import { getLabelRotation } from 'explorviz-frontend/src/view-objects/utils/label-utils';
import { gsap } from 'gsap';
import { useEffect, useState } from 'react';
import * as THREE from 'three';
import { useShallow } from 'zustand/react/shallow';

export default function CityFoundation({
  city,
  layout,
}: {
  city: City;
  layout: BoxLayout;
}) {
  const [foundationPosition, setFoundationPosition] = useState<THREE.Vector3>(
    new THREE.Vector3(layout.width / 2, layout.positionY, layout.depth / 2)
  );

  const sceneLayers = useVisualizationStore((state) => state.sceneLayers);

  useEffect(() => {
    if (enableAnimations) {
      const gsapValues = {
        positionX: foundationPosition.x,
        positionY: foundationPosition.y,
        positionZ: foundationPosition.z,
      };
      gsap.to(gsapValues, {
        positionX: layout.width / 2,
        positionY: layout.center.y,
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
      const target = new THREE.Vector3(
        layout.width / 2,
        layout.center.y,
        layout.depth / 2
      );
      if (!foundationPosition.equals(target)) {
        setFoundationPosition(target);
      }
    }
  }, [layout.width, layout.positionY, layout.depth]);

  const { isHighlighted, isHovered, setHoveredEntityId } =
    useVisualizationStore(
      useShallow((state) => ({
        isHighlighted: state.highlightedEntityIds.has(city.id),
        isHovered: state.hoveredEntityId === city.id,
        setHoveredEntityId: state.actions.setHoveredEntityId,
      }))
    );

  const { addPopup } = usePopupHandlerStore(
    useShallow((state) => ({
      addPopup: state.addPopup,
    }))
  );

  const {
    cityLabelMargin,
    labelOffset,
    castShadows,
    enableAnimations,
    enableHoverEffects,
    foundationColor,
    foundationTextColor,
    districtLabelPlacement,
    entityOpacity,
  } = useUserSettingsStore(
    useShallow((state) => ({
      cityLabelMargin: state.visualizationSettings.cityLabelMargin.value,
      labelOffset: state.visualizationSettings.labelOffset.value,
      castShadows: state.visualizationSettings.castShadows.value,
      enableAnimations: state.visualizationSettings.enableAnimations.value,
      foundationColor: state.visualizationSettings.foundationColor.value,
      enableHoverEffects: state.visualizationSettings.enableHoverEffects.value,
      foundationTextColor:
        state.visualizationSettings.foundationTextColor.value,
      districtLabelPlacement:
        state.visualizationSettings.districtLabelPlacement.value,
      entityOpacity: state.visualizationSettings.entityOpacity.value,
    }))
  );

  const handleOnPointerOver = (event: any) => {
    event.stopPropagation();
    setHoveredEntityId(city.id);
  };

  const handleOnPointerOut = (event: any) => {
    event.stopPropagation();
    setHoveredEntityId(null);
  };

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    addPopup({
      entityId: city.id,
      entity: city,
      position: {
        x: event.clientX,
        y: event.clientY,
      },
    });
  };

  const handleDoubleClick = (/*event: any*/) => {
    EntityManipulation.closeAllDistrictsInCity(city);
  };

  const handleRightClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    emitContextMenuFromWorld(
      { kind: 'city', cityId: city.id },
      event.nativeEvent
    );
  };

  const [
    handleClickWithPrevent,
    handleDoubleClickWithPrevent,
    handleRightClickWithPrevent,
  ] = useClickPreventionOnDoubleClick(handleClick, handleDoubleClick, {
    onRightClick: handleRightClick,
  });

  const computeColor = () => {
    const baseColor = isHighlighted
      ? getHighlightingColorForEntity(city.id)
      : new THREE.Color(foundationColor);

    if (enableHoverEffects && isHovered) {
      return calculateColorBrightness(baseColor, 1.1);
    } else {
      return baseColor;
    }
  };

  const getLabelPosition = (): [number, number, number] => {
    const margin = cityLabelMargin / layout.depth / 2;
    // Convert world-space label offset to local mesh-space because foundation is scaled.
    const normalizedLabelOffset =
      layout.height === 0 ? 0 : labelOffset / layout.height;
    const yPos = 0.51 + normalizedLabelOffset; // Just above the foundation + global label offset
    switch (districtLabelPlacement) {
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
      layers={sceneLayers.Foundation}
      castShadow={castShadows}
      name={'Foundation of ' + city.name}
      scale={[layout.width, layout.height, layout.depth]}
      position={foundationPosition} // Center around city's position
      userData={{ explorvizEntity: { type: 'city', entityId: city.id } }}
      onClick={handleClickWithPrevent}
      onContextMenu={handleRightClickWithPrevent}
      onDoubleClick={handleDoubleClickWithPrevent}
      {...(enableHoverEffects && {
        onPointerOver: handleOnPointerOver,
        onPointerOut: handleOnPointerOut,
      })}
    >
      <meshBasicMaterial
        color={computeColor()}
        transparent={entityOpacity < 1.0}
        opacity={entityOpacity}
      />
      <boxGeometry />
      {cityLabelMargin > 1.5 && (
        <Text
          layers={sceneLayers.Label}
          color={foundationTextColor}
          outlineColor={'white'}
          position={getLabelPosition()}
          rotation={getLabelRotation(districtLabelPlacement)}
          fontSize={(cityLabelMargin * 0.9) / layout.depth}
          raycast={() => null}
        >
          {getEntityDisplayName(city.name, city.id)}
        </Text>
      )}
    </mesh>
  );
}
