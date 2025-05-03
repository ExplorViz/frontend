import { ThreeElements } from '@react-three/fiber';
import { useHighlightingStore } from 'explorviz-frontend/src/stores/highlighting';
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

  const { communicationColor, highlightedEntityColor } = useUserSettingsStore(
    useShallow((state) => ({
      communicationColor: state.colors?.communicationColor,
      highlightedEntityColor: state.colors?.highlightedEntityColor,
    }))
  );

  const highlightingActions = useHighlightingStore(
    useShallow((state) => ({
      toggleHighlight: state.toggleHighlight,
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
    highlightingActions.toggleHighlight(event.object!, {
      sendMessage: true,
    });
  };

  const constructorArgs = useMemo<
    ThreeElements['clazzCommunicationMesh']['args']
  >(
    () => [
      new ClazzCommuMeshDataModel(
        application,
        communicationModel,
        communicationModel.id
      ),
      communicationLayout,
    ],
    []
  );

  return (
    <clazzCommunicationMesh
      onPointerOver={handleOnPointerOver}
      onPointerOut={handleOnPointerOut}
      onClick={handleClick}
      defaultColor={communicationColor}
      highlightingColor={highlightedEntityColor}
      isHovered={isHovered}
      args={constructorArgs}
      // layout={communicationLayout}
    ></clazzCommunicationMesh>
  );
}
