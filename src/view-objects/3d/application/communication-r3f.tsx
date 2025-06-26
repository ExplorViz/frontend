import { ThreeElements, ThreeEvent } from '@react-three/fiber';
import { usePointerStop } from 'explorviz-frontend/src/hooks/pointer-stop';
import useClickPreventionOnDoubleClick from 'explorviz-frontend/src/hooks/useClickPreventionOnDoubleClick';
import { useConfigurationStore } from 'explorviz-frontend/src/stores/configuration';
import { usePopupHandlerStore } from 'explorviz-frontend/src/stores/popup-handler';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import ClassCommunication from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/class-communication';
import ClazzCommunicationMesh from 'explorviz-frontend/src/view-objects/3d/application/clazz-communication-mesh';
import ClazzCommuMeshDataModel from 'explorviz-frontend/src/view-objects/3d/application/utils/clazz-communication-mesh-data-model';
import CommunicationLayout from 'explorviz-frontend/src/view-objects/layout-models/communication-layout';
import { useMemo, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import * as THREE from 'three';

export default function CommunicationR3F({
  communicationModel,
  communicationLayout,
}: {
  communicationModel: ClassCommunication;
  communicationLayout: CommunicationLayout | undefined;
}) {
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [isHighlighted, setIsHighlighted] = useState<boolean>(false);

  const {
    arrowColor,
    arrowOffset,
    arrowWidth,
    communicationColor,
    curveHeight,
    highlightedEntityColor,
    enableHoverEffects,
  } = useUserSettingsStore(
    useShallow((state) => ({
      arrowColor: state.visualizationSettings.communicationArrowColor.value,
      arrowOffset: state.visualizationSettings.commArrowOffset.value,
      arrowWidth: state.visualizationSettings.commArrowSize.value,
      communicationColor: state.visualizationSettings.communicationColor.value,
      highlightedEntityColor: state.colors?.highlightedEntityColor,
      curveHeight: state.visualizationSettings.curvyCommHeight.value,
      enableHoverEffects: state.visualizationSettings.enableHoverEffects.value,
    }))
  );

  const { commCurveHeightDependsOnDistance, isVisible } = useConfigurationStore(
    useShallow((state) => ({
      commCurveHeightDependsOnDistance: state.commCurveHeightDependsOnDistance,
      isVisible: state.isCommRendered,
    }))
  );

  const meshRef = useRef<ClazzCommunicationMesh | null>(null);

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

  const handleOnPointerOver = (event: any) => {
    event.stopPropagation();
    setIsHovered(true);
  };

  const handleOnPointerOut = (event: any) => {
    event.stopPropagation();
    setIsHovered(false);
  };

  const handleClick = (/*event*/) => {
    setIsHighlighted(!isHighlighted);
  };

  const handleDoubleClick = (/*event*/) => {};

  const [handleClickWithPrevent, handleDoubleClickWithPrevent] =
    useClickPreventionOnDoubleClick(handleClick, handleDoubleClick);

  const computeCurveHeight = () => {
    let baseCurveHeight = 20;
    if (communicationLayout && commCurveHeightDependsOnDistance) {
      const classDistance = Math.hypot(
        communicationLayout.endX - communicationLayout.startX,
        communicationLayout.endZ - communicationLayout.startZ
      );
      baseCurveHeight = classDistance * 0.5;
    }

    return baseCurveHeight * curveHeight;
  };

  const constructorArgs = useMemo<
    ThreeElements['clazzCommunicationMesh']['args']
  >(() => {
    const dataModel = new ClazzCommuMeshDataModel(
      communicationModel,
      communicationModel.id
    );
    return [dataModel];
  }, []);

  return (
    <clazzCommunicationMesh
      {...pointerStopHandlers}
      onPointerOver={handleOnPointerOver}
      onPointerOut={handleOnPointerOut}
      onClick={handleClickWithPrevent}
      onDoubleClick={handleDoubleClickWithPrevent}
      args={constructorArgs}
      arrowColor={new THREE.Color(arrowColor)}
      arrowOffset={arrowOffset}
      layout={communicationLayout}
      arrowWidth={arrowWidth}
      curveHeight={computeCurveHeight()}
      defaultColor={communicationColor}
      highlighted={isHighlighted}
      highlightingColor={highlightedEntityColor}
      isHovered={enableHoverEffects && isHovered}
      visible={isVisible}
      ref={meshRef}
    ></clazzCommunicationMesh>
  );
}
