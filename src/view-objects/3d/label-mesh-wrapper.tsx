import { useFontRepositoryStore } from 'explorviz-frontend/src/stores/repos/font-repository';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { getBoxLabel } from 'explorviz-frontend/src/utils/application-rendering/labeler';
import LabelMesh from 'explorviz-frontend/src/view-objects/3d/label-mesh';
import { useEffect, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import ComponentMesh from './application/component-mesh';
import FoundationMesh from './application/foundation-mesh';
import K8sMesh from './k8s/k8s-mesh';
import * as THREE from 'three';

export default function LabelMeshWrapper() {
  const ref = useRef<LabelMesh>(null);

  const fontStore = useFontRepositoryStore(
    useShallow((state) => ({
      font: state.font,
    }))
  );

  const [labelMesh, setLabelMesh] = useState<LabelMesh | null | undefined>(
    null
  );

  const computeLabel = async (
    parent: ComponentMesh | FoundationMesh | K8sMesh
  ) => {
    const font = fontStore.font;
    if (!font) return;
    setLabelMesh(
      getBoxLabel(
        parent,
        font,
        useUserSettingsStore.getState().colors!.foundationTextColor
        // minHeight = 1.5,
        // minLength = 4
      )
    );
  };

  useEffect(() => {
    if (!ref || !ref.current || !ref.current.parent) return;
    const { parent } = ref.current;
    if (
      !(parent instanceof ComponentMesh) &&
      !(parent instanceof FoundationMesh) &&
      !(parent instanceof K8sMesh)
    ) {
      throw new Error('LabelMeshWrapper: parent is not a valid mesh');
    }
    computeLabel(parent);
  }, [ref]);

  // TODO: substitute with react-three-fiber compatible labelMesh component
  return labelMesh ? (
    <primitive object={labelMesh} ref={ref} />
  ) : (
    <primitive object={new THREE.Object3D()} ref={ref} />
  );
}
