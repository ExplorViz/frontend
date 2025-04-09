import { useApplicationRendererStore } from 'explorviz-frontend/src/stores/application-renderer';
import { useFontRepositoryStore } from 'explorviz-frontend/src/stores/repos/font-repository';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import ApplicationData from 'explorviz-frontend/src/utils/application-data';
import { getBoxLabel } from 'explorviz-frontend/src/utils/application-rendering/labeler';
import ApplicationObject3D from 'explorviz-frontend/src/view-objects/3d/application/application-object-3d';
import FoundationMesh from 'explorviz-frontend/src/view-objects/3d/application/foundation-mesh';
import FoundationMeshWrapper from 'explorviz-frontend/src/view-objects/3d/application/foundation-mesh-wrapper';
import LabelMesh from 'explorviz-frontend/src/view-objects/3d/label-mesh';
import { useEffect, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';

export default function LabelMeshWrapper({
  parent,
}: {
  parent: FoundationMesh;
}) {
  const fontStore = useFontRepositoryStore(
    useShallow((state) => ({
      font: state.font,
    }))
  );

  const [labelMesh, setLabelMesh] = useState<LabelMesh | null | undefined>(
    null
  );

  const computeLabel = async () => {
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
    computeLabel();
  }, [parent]);

  return <>{labelMesh && <primitive object={labelMesh} />}</>;
}
