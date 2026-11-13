import React, { useState } from 'react';

import AnnotationData from 'explorviz-frontend/src/components/visualization/rendering/annotations/annotation-data';
import { useAuthStore } from 'explorviz-frontend/src/stores/auth';
import { LandscapeToken } from 'explorviz-frontend/src/stores/landscape-token';
import { useToastHandlerStore } from 'explorviz-frontend/src/stores/toast-handler';
import { useSnapshotTokenStore } from 'explorviz-frontend/src/stores/snapshot-token';
import { LandscapeData } from 'explorviz-frontend/src/utils/landscape-schemes/landscape-data';
import { buildSnapshotToken } from 'explorviz-frontend/src/utils/snapshot/snapshot-helpers';
import Button from 'react-bootstrap/Button';

interface SnapshotProps {
  landscapeData: LandscapeData | null;
  landscapeToken: LandscapeToken | null;
  annotationData: AnnotationData[];
  minimizedAnnotations: AnnotationData[];
}

export default function Snapshot({ landscapeData, landscapeToken }: SnapshotProps) {
  const authUser = useAuthStore((state) => state.user);
  const saveSnapshotToStore = useSnapshotTokenStore((state) => state.saveSnapshot);
  const exportFile = useSnapshotTokenStore((state) => state.exportFile);

  const [saveSnapshotBtnDisabled, setSaveSnapshotBtnDisabled] = useState<boolean>(true);
  const [snapshotName, setSnapshotName] = useState<string>('');

  const reset = () => {
    setSnapshotName('');
    setSaveSnapshotBtnDisabled(true);
  };

  const updateName = (event: React.InputEvent<HTMLInputElement>) => {
    const target: HTMLInputElement = event.currentTarget;
    const newSnapshotName = target.value;
    setSnapshotName(newSnapshotName);
    setSaveSnapshotBtnDisabled(newSnapshotName === '');
  };

  const buildContent = () => {
    if (!authUser) {
      useToastHandlerStore.getState().showErrorToastMessage('You must be logged in to create a snapshot.');
      return null;
    }
    try {
      const content = buildSnapshotToken({
        name: snapshotName,
        owner: authUser.sub,
        landscapeToken,
        landscapeData,
      });
      if (content === null) {
        useToastHandlerStore.getState().showErrorToastMessage('Snapshot could not be created: no landscape selected.');
      }
      return content;
    } catch (error) {
      console.error('Cannot build snapshot token:', error);
      useToastHandlerStore.getState().showErrorToastMessage('Snapshot could not be created.');
      return null;
    }
  };

  const saveSnapshot = async () => {
    const content = buildContent();
    if (content === null) return;

    // Keep the entered name if saving failed so the user can retry.
    if (await saveSnapshotToStore(content)) {
      reset();
    }
  };

  const exportSnapshot = () => {
    const content = buildContent();
    if (content === null) return;

    exportFile(content);
    useToastHandlerStore.getState().showSuccessToastMessage(`Exported snapshot "${content.name}".`);
    reset();
  };

  return (
    <>
      <div className="flex justify-content-between mt-3">
        <h6 className="bold">Snapshot Name:</h6>
        <input id="name" className="form-control mr-2" onInput={updateName} value={snapshotName} />
      </div>
      <div className="flex mt-3">
        <Button
          className="mr-2"
          title="Save Snapshot"
          variant="outline-secondary"
          onClick={saveSnapshot}
          disabled={saveSnapshotBtnDisabled}
        >
          Create Snapshot
        </Button>
        <Button
          title="Export Snapshot"
          variant="outline-secondary"
          onClick={exportSnapshot}
          disabled={saveSnapshotBtnDisabled}
        >
          Export Snapshot
        </Button>
      </div>
    </>
  );
}
