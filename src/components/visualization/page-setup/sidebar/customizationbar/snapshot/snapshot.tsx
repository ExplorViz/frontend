import React, { useState } from 'react';

import AnnotationData from 'explorviz-frontend/src/components/visualization/rendering/annotations/annotation-data';
import { useAuthStore } from 'explorviz-frontend/src/stores/auth';
import { LandscapeToken } from 'explorviz-frontend/src/stores/landscape-token';
import { useSnapshotTokenStore } from 'explorviz-frontend/src/stores/snapshot-token';
import { LandscapeData } from 'explorviz-frontend/src/utils/landscape-schemes/landscape-data';
import { buildSnapshotToken } from 'explorviz-frontend/src/utils/snapshot/snapshot-helpers';
import Button from 'react-bootstrap/Button';

interface SnapshotProps {
  landscapeData: LandscapeData;
  landscapeToken: LandscapeToken;
  annotationData: AnnotationData[];
  minimizedAnnotations: AnnotationData[];
}

export default function Snapshot({
  landscapeData,
  landscapeToken,
}: SnapshotProps) {
  const authUser = useAuthStore((state) => state.user);
  const saveSnapshotToStore = useSnapshotTokenStore(
    (state) => state.saveSnapshot
  );
  const exportFile = useSnapshotTokenStore((state) => state.exportFile);

  const [saveSnaphotBtnDisabled, setSaveSnaphotBtnDisabled] =
    useState<boolean>(true);
  const [snapshotName, setSnapshotName] = useState<string>('');

  const reset = () => {
    setSnapshotName('');
    setSaveSnaphotBtnDisabled(true);
  };

  const updateName = (event: React.InputEvent<HTMLInputElement>) => {
    const target: HTMLInputElement = event.currentTarget;
    const newSnapshotName = target.value;
    setSnapshotName(newSnapshotName);
    setSaveSnaphotBtnDisabled(newSnapshotName === '');
  };

  const saveSnapshot = async () => {
    const content = buildSnapshotToken({
      name: snapshotName,
      owner: authUser!.sub,
      landscapeToken,
      landscapeData,
    });

    await saveSnapshotToStore(content);
    reset();
  };

  const exportSnapshot = () => {
    const content = buildSnapshotToken({
      name: snapshotName,
      owner: authUser!.sub,
      landscapeToken,
      landscapeData,
    });
    exportFile(content);
    reset();
  };

  return (
    <>
      <div className="flex justify-content-between mt-3">
        <h6 className="bold">Snapshot Name:</h6>
        <input
          id="name"
          className="form-control mr-2"
          onInput={updateName}
          value={snapshotName}
        />
      </div>
      <div className="flex mt-3">
        <Button
          className="mr-2"
          title="Save Snapshot"
          variant="outline-secondary"
          onClick={saveSnapshot}
          disabled={saveSnaphotBtnDisabled}
        >
          Create Snapshot
        </Button>
        <Button
          title="Export Snapshot"
          variant="outline-secondary"
          onClick={exportSnapshot}
          disabled={saveSnaphotBtnDisabled}
        >
          Export Snapshot
        </Button>
      </div>
    </>
  );
}
