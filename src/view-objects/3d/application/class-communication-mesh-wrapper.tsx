import { useLinkRendererStore } from 'explorviz-frontend/src/stores/link-renderer';
import ClassCommunication from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/class-communication';
import ClazzCommunicationMesh from 'explorviz-frontend/src/view-objects/3d/application/clazz-communication-mesh';
import { useEffect, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';

export default function ClassCommunicationMeshWrapper({
  communicationModel,
}: {
  communicationModel: ClassCommunication;
}) {
  const [communicationMesh, setCommunicationMesh] =
    useState<ClazzCommunicationMesh | null>(null);

  const linkActions = useLinkRendererStore(
    useShallow((state) => ({
      createMeshFromCommunication: state.createMeshFromCommunication,
      updateLinkPosition: state.updateLinkPosition,
    }))
  );

  const computeCommunicationMesh = async () => {
    const mesh = linkActions.createMeshFromCommunication(communicationModel);
    if (mesh) {
      // linkActions.updateLinkPosition(mesh);
      setCommunicationMesh(mesh);
    }
  };

  useEffect(() => {
    computeCommunicationMesh();
  }, [communicationModel]);

  const handleOnPointerOver = () => {
    communicationMesh?.applyHoverEffect();
  };

  const handleOnPointerOut = () => {
    communicationMesh?.resetHoverEffect();
  };

  const handleClick = () => {
    // TODO: Select active application
    // highlightingActions.toggleHighlight(communicationMesh!, {
    //   sendMessage: true,
    // });
  };

  return (
    <>
      {communicationMesh && (
        <primitive
          onPointerOver={handleOnPointerOver}
          onPointerOut={handleOnPointerOut}
          onClick={handleClick}
          object={communicationMesh}
        ></primitive>
      )}
    </>
  );
}
