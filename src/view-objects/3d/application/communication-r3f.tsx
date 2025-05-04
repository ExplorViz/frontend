import { ThreeElements } from '@react-three/fiber';
import { useConfigurationStore } from 'explorviz-frontend/src/stores/configuration';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import ClassCommunication from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/class-communication';
import { Application } from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import ClazzCommuMeshDataModel from 'explorviz-frontend/src/view-objects/3d/application/utils/clazz-communication-mesh-data-model';
import CommunicationLayout from 'explorviz-frontend/src/view-objects/layout-models/communication-layout';
import { useMemo, useState } from 'react';
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

  const handleOnPointerOver = (event: any) => {
    event.stopPropagation();
    setIsHovered(true);
  };

  const handleOnPointerOut = (event: any) => {
    event.stopPropagation();
    setIsHovered(false);
  };

  const handleClick = (event: any) => {
    event.stopPropagation();
    setIsHighlighted(!isHighlighted);
    // highlightingActions.toggleHighlight(event.object!, {
    //   sendMessage: true,
    // });
  };

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
      onClick={handleClick}
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
    ></clazzCommunicationMesh>
  );
}
