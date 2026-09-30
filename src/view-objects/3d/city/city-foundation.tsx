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
import {
  getCityLabelFontSize,
  MIN_CITY_LABEL_MARGIN,
} from 'explorviz-frontend/src/utils/layout/label-utils';
import { getLabelRotation } from 'explorviz-frontend/src/view-objects/utils/label-utils';
import { gsap } from 'gsap';
import { useEffect, useState } from 'react';
import * as THREE from 'three';
import { useShallow } from 'zustand/react/shallow';

const DATABASE_HEIGHT_MULTIPLIER = 4;

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
    cityColorOverrides,
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
      cityColorOverrides: state.visualizationSettings.cityColorOverrides,
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
    const colorOverride = cityColorOverrides.value.modelType[city.type];

    const baseColor = isHighlighted
      ? getHighlightingColorForEntity(city.id)
      : colorOverride
        ? new THREE.Color(colorOverride)
        : new THREE.Color(foundationColor);

    if (enableHoverEffects && isHovered) {
      return calculateColorBrightness(baseColor, 1.1);
    } else {
      return baseColor;
    }
  };

  const meshPosition = foundationPosition.clone(); // Center around city's position

  const meshScale: [number, number, number] = [
    layout.width,
    layout.height,
    layout.depth,
  ];

  if (city.type === 'database') {
    // Round primitives default to radius 1 (diameter 2); multiply by 0.5 to match BoxGeometry's 1x1 footprint.
    meshScale[0] *= 0.5;
    meshScale[1] *= DATABASE_HEIGHT_MULTIPLIER;
    meshScale[2] *= 0.5;

    // Match base position of scaled cylinder to base of regular foundations
    meshPosition.y += layout.height * (DATABASE_HEIGHT_MULTIPLIER * 0.5 - 0.5);
  }

  // The label is a child of the foundation mesh, so it is removed together with
  // it. The mesh can be scaled non-uniformly, which would distort the label.
  // Therefore, the label is wrapped in a group with the inverse of the final
  // mesh scale (i.e., after the database adjustments above), and its position
  // is given in unscaled world units relative to the center of the mesh.
  const inverseScale: [number, number, number] = [
    meshScale[0] === 0 ? 1 : 1 / meshScale[0],
    meshScale[1] === 0 ? 1 : 1 / meshScale[1],
    meshScale[2] === 0 ? 1 : 1 / meshScale[2],
  ];

  // Half of the actual (scaled) mesh height, i.e., the top of the foundation
  const halfMeshHeight = meshScale[1] / 2;

  const getLabelPosition = (): [number, number, number] => {
    const halfMargin = cityLabelMargin / 2;
    const y = halfMeshHeight + labelOffset + 0.01 * layout.height;
    switch (districtLabelPlacement) {
      case 'top':
        return [0, y, -layout.depth / 2 + halfMargin];
      case 'left':
        return [-layout.width / 2 + halfMargin, y, 0];
      case 'right':
        return [layout.width / 2 - halfMargin, y, 0];
      case 'bottom':
      default:
        return [0, y, layout.depth / 2 - halfMargin];
    }
  };

  return (
    <mesh
      layers={sceneLayers.Foundation}
      castShadow={castShadows}
      name={'Foundation of ' + city.name}
      scale={meshScale}
      position={meshPosition}
      userData={{ explorvizEntity: { type: 'city', entityId: city.id } }}
      onClick={handleClickWithPrevent}
      onContextMenu={handleRightClickWithPrevent}
      onDoubleClick={handleDoubleClickWithPrevent}
      {...(enableHoverEffects && {
        onPointerOver: handleOnPointerOver,
        onPointerOut: handleOnPointerOut,
      })}
    >
      {city.type === 'database' ? (
        <meshStandardMaterial
          color={computeColor()}
          transparent={entityOpacity < 1.0}
          opacity={entityOpacity}
        />
      ) : (
        <meshBasicMaterial
          color={computeColor()}
          transparent={entityOpacity < 1.0}
          opacity={entityOpacity}
        />
      )}
      {city.type === 'database' ? <cylinderGeometry /> : <boxGeometry />}
      {cityLabelMargin > MIN_CITY_LABEL_MARGIN && (
        <group scale={inverseScale}>
          <Text
            layers={sceneLayers.Label}
            color={foundationTextColor}
            outlineColor={'white'}
            position={getLabelPosition()}
            rotation={getLabelRotation(districtLabelPlacement)}
            fontSize={getCityLabelFontSize(cityLabelMargin)}
            raycast={() => null}
          >
            {getEntityDisplayName(city.name, city.id)}
          </Text>
        </group>
      )}
    </mesh>
  );
}
