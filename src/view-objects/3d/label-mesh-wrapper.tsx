import useTraceUpdate from 'explorviz-frontend/src/hooks/trace-update';
import { useFontRepositoryStore } from 'explorviz-frontend/src/stores/repos/font-repository';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { getBoxLabelWithData } from 'explorviz-frontend/src/utils/application-rendering/labeler';
import FoundationMesh from 'explorviz-frontend/src/view-objects/3d/application/foundation-mesh';
import LabelMesh from 'explorviz-frontend/src/view-objects/3d/label-mesh';
import { useEffect, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';

export default function LabelMeshWrapper({
  parent,
}: {
  parent: FoundationMesh;
}) {
  useTraceUpdate({ parent });
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
      getBoxLabelWithData(
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
