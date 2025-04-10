import { useHighlightingStore } from 'explorviz-frontend/src/stores/highlighting';
import { useLinkRendererStore } from 'explorviz-frontend/src/stores/link-renderer';
import ClassCommunication from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/class-communication';
import ClazzCommunicationMesh from 'explorviz-frontend/src/view-objects/3d/application/clazz-communication-mesh';
import { useEffect, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';

export default function CommunicationR3F({
  communicationModel,
}: {
  communicationModel: ClassCommunication;
}) {
  const [communicationMesh, setCommunicationMesh] =
    useState<ClazzCommunicationMesh | null>(null);

  const highlightingActions = useHighlightingStore(
    useShallow((state) => ({
      toggleHighlight: state.toggleHighlight,
    }))
  );

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

  const handleOnPointerOver = (event: any) => {
    event.stopPropagation();
    communicationMesh?.applyHoverEffect();
  };

  const handleOnPointerOut = (event: any) => {
    event.stopPropagation();
    communicationMesh?.resetHoverEffect();
  };

  const handleClick = (event: any) => {
    event.stopPropagation();
    highlightingActions.toggleHighlight(communicationMesh!, {
      sendMessage: true,
    });
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
