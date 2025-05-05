import { ThreeElements } from '@react-three/fiber';
import useClickPreventionOnDoubleClick from 'explorviz-frontend/src/hooks/useClickPreventionOnDoubleClick';
import { useConfigurationStore } from 'explorviz-frontend/src/stores/configuration';
import { usePopupHandlerStore } from 'explorviz-frontend/src/stores/popup-handler';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import ClassCommunication from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/class-communication';
import { Application } from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import ClazzCommunicationMesh from 'explorviz-frontend/src/view-objects/3d/application/clazz-communication-mesh';
import ClazzCommuMeshDataModel from 'explorviz-frontend/src/view-objects/3d/application/utils/clazz-communication-mesh-data-model';
import CommunicationLayout from 'explorviz-frontend/src/view-objects/layout-models/communication-layout';
import { useMemo, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';

export default function CommunicationR3F({
  application,
  communicationModel,
  communicationLayout,
}: {
  application: Application;
  communicationModel: ClassCommunication;
  communicationLayout: CommunicationLayout;
}) {
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [isHighlighted, setIsHighlighted] = useState<boolean>(false);
  const meshRef = useRef<ClazzCommunicationMesh | null>(null);

  const {
    arrowColor,
    arrowOffset,
    arrowWidth,
    communicationColor,
    curveHeight,
    highlightedEntityColor,
  } = useUserSettingsStore(
    useShallow((state) => ({
      arrowColor: state.colors?.communicationArrowColor,
      arrowOffset: state.visualizationSettings.commArrowOffset.value,
      arrowWidth: state.visualizationSettings.commArrowSize.value,
      communicationColor: state.colors?.communicationColor,
      highlightedEntityColor: state.colors?.highlightedEntityColor,
      curveHeight: state.visualizationSettings.curvyCommHeight.value,
    }))
  );

  const { commCurveHeightDependsOnDistance, isVisible } = useConfigurationStore(
    useShallow((state) => ({
      commCurveHeightDependsOnDistance: state.commCurveHeightDependsOnDistance,
      isVisible: state.isCommRendered,
    }))
  );

  const popupHandlerActions = usePopupHandlerStore(
    useShallow((state) => ({
      addPopup: state.addPopup,
      removePopup: state.removePopup,
    }))
  );

  const handleOnPointerOver = (event: any) => {
    event.stopPropagation();
    setIsHovered(true);

    // popupHandlerActions.addPopup({
    //   mesh: meshRef.current,
    //   position: {
    //     x: event.clientX,
    //     y: event.clientY,
    //   },
    // });
  };

  const handleOnPointerOut = (event: any) => {
    event.stopPropagation();
    setIsHovered(false);

    // popupHandlerActions.removePopup(communicationModel.id);
  };

  const handleClick = (event: any) => {
    setIsHighlighted(!isHighlighted);
  };

  const handleDoubleClick = (event: any) => {};

  const [handleClickWithPrevent, handleDoubleClickWithPrevent] =
    useClickPreventionOnDoubleClick(handleClick, handleDoubleClick);

  const computeCurveHeight = () => {
    let baseCurveHeight = 20;
    if (commCurveHeightDependsOnDistance) {
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
      application,
      communicationModel,
      communicationModel.id
    );
    return [dataModel, communicationLayout];
  }, []);

  return (
    <clazzCommunicationMesh
      onPointerOver={handleOnPointerOver}
      onPointerOut={handleOnPointerOut}
      onClick={handleClickWithPrevent}
      onDoubleClick={handleDoubleClickWithPrevent}
      args={constructorArgs}
      arrowColor={arrowColor}
      arrowOffset={arrowOffset}
      arrowWidth={arrowWidth}
      curveHeight={computeCurveHeight()}
      defaultColor={communicationColor}
      highlighted={isHighlighted}
      highlightingColor={highlightedEntityColor}
      isHovered={isHovered}
      visible={isVisible}
      ref={meshRef}
    ></clazzCommunicationMesh>
  );
}
