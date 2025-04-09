import { useHighlightingStore } from 'explorviz-frontend/src/stores/highlighting';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { Application } from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import FoundationMesh from 'explorviz-frontend/src/view-objects/3d/application/foundation-mesh';
import LabelMeshWrapper from 'explorviz-frontend/src/view-objects/3d/label-mesh-wrapper';
import BoxLayout from 'explorviz-frontend/src/view-objects/layout-models/box-layout';
import { useEffect, useState } from 'react';
import * as THREE from 'three';
import { useShallow } from 'zustand/react/shallow';

export default function FoundationMeshWrapper({
  application,
  boxLayout,
}: {
  application: Application;
  boxLayout: BoxLayout;
}) {
  const [foundationMesh, setFoundationMesh] = useState<FoundationMesh | null>(
    null
  );
  const [foundationPositon, setFoundationPosition] = useState<THREE.Vector3>(
    new THREE.Vector3()
  );

  const highlightingActions = useHighlightingStore(
    useShallow((state) => ({
      toggleHighlight: state.toggleHighlight,
      updateHighlightingOnHover: state.updateHighlightingOnHover,
    }))
  );

  const computeFoundation = async () => {
    setFoundationMesh(
      new FoundationMesh(
        boxLayout,
        application,
        useUserSettingsStore.getState().colors!.foundationColor,
        useUserSettingsStore.getState().colors!.highlightedEntityColor
      )
    );
  };

  useEffect(() => {
    computeFoundation();
  }, [application, boxLayout]);

  useEffect(() => {
    const layoutPosition = boxLayout.position;

    // Box meshes origin is in the center
    const centerPoint = new THREE.Vector3(
      layoutPosition.x + boxLayout.width / 2.0,
      layoutPosition.y + boxLayout.height / 2.0,
      layoutPosition.z + boxLayout.depth / 2.0
    );

    // Offset position with applications position
    const appLayoutPosition = new THREE.Vector3(
      boxLayout.positionX,
      boxLayout.positionY,
      boxLayout.positionZ
    );

    setFoundationPosition(
      new THREE.Vector3().copy(centerPoint).sub(appLayoutPosition)
    );
  }, []);

  const handleOnPointerOver = () => {
    foundationMesh?.applyHoverEffect();
  };

  const handleOnPointerOut = () => {
    foundationMesh?.resetHoverEffect();
  };

  const handleClick = () => {
    // TODO: Select active application
    highlightingActions.toggleHighlight(foundationMesh!, { sendMessage: true });
  };

  return (
    <>
      {foundationMesh && (
        <primitive
          position={foundationPositon}
          onPointerOver={handleOnPointerOver}
          onPointerOut={handleOnPointerOut}
          onClick={handleClick}
          object={foundationMesh}
        >
          <LabelMeshWrapper parent={foundationMesh} />
        </primitive>
      )}
    </>
  );
}
