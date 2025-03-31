import React, { useState } from 'react';

import Button from 'react-bootstrap/Button';
import { useRoomSerializerStore } from 'explorviz-frontend/src/stores/collaboration/room-serializer';
import PopupData from 'explorviz-frontend/src/components/visualization/rendering/popups/popup-data';
import { useAuthStore } from 'explorviz-frontend/src/stores/auth';
import {
  useSnapshotTokenStore,
  SnapshotToken,
} from 'explorviz-frontend/src/stores/snapshot-token';
import { LandscapeToken } from 'explorviz-frontend/src/stores/landscape-token';
import AnnotationData from 'explorviz-frontend/src/components/visualization/rendering/annotations/annotation-data';
import { useLocalUserStore } from 'explorviz-frontend/src/stores/collaboration/local-user';
import { useTimestampRepositoryStore } from 'explorviz-frontend/src/stores/repos/timestamp-repository';
import { LandscapeData } from 'explorviz-frontend/src/utils/landscape-schemes/landscape-data';

interface SnapshotProps {
  landscapeData: LandscapeData;
  popUpData: PopupData[];
  landscapeToken: LandscapeToken;
  annotationData: AnnotationData[];
  minimizedAnnotations: AnnotationData[];
}

export default function Snapshot({
  landscapeData,
  popUpData,
  landscapeToken,
  annotationData,
  minimizedAnnotations,
}: SnapshotProps) {
  const serializeRoom = useRoomSerializerStore((state) => state.serializeRoom);
  const getTimestampsForCommitId = useTimestampRepositoryStore(
    (state) => state.getTimestampsForCommitId
  );
  const authUser = useAuthStore((state) => state.user);
  const getLocalUserCamera = useLocalUserStore((state) => state.getCamera);
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

  const updateName = (event: React.FormEvent<HTMLInputElement>) => {
    const target: HTMLInputElement = event.currentTarget as HTMLInputElement;
    const newSnapshotName = target.value;
    setSnapshotName(newSnapshotName);
    setSaveSnaphotBtnDisabled(newSnapshotName === '');
  };

  const saveSnapshot = async () => {
    const allAnnotations = annotationData.concat(minimizedAnnotations);

    const createdAt: number = new Date().getTime();
    const saveRoom = serializeRoom(popUpData, allAnnotations, true);

    const timestamps = getTimestampsForCommitId('cross-commit');
    const localUserCamera = getLocalUserCamera();

    const content: SnapshotToken = {
      owner: authUser!.sub,
      createdAt: createdAt,
      name: snapshotName,
      landscapeToken: landscapeToken,
      structureData: {
        structureLandscapeData: landscapeData.structureLandscapeData,
        dynamicLandscapeData: landscapeData.dynamicLandscapeData,
      },
      serializedRoom: saveRoom,
      timestamps: { timestamps: timestamps },
      camera: {
        x: localUserCamera.position.x,
        y: localUserCamera.position.y,
        z: localUserCamera.position.z,
      },
      isShared: false,
      subscribedUsers: { subscriberList: [] },
      deleteAt: 0,
    };

    saveSnapshotToStore(content);
    reset();
  };

  const exportSnapshot = () => {
    const allAnnotations = annotationData.concat(minimizedAnnotations);

    const createdAt: number = new Date().getTime();
    const saveRoom = serializeRoom(popUpData, allAnnotations, true);

    const timestamps = getTimestampsForCommitId('cross-commit');
    const localUserCamera = getLocalUserCamera();

    const content: SnapshotToken = {
      owner: authUser!.sub,
      createdAt: createdAt,
      name: snapshotName,
      landscapeToken: landscapeToken,
      structureData: {
        structureLandscapeData: landscapeData.structureLandscapeData,
        dynamicLandscapeData: landscapeData.dynamicLandscapeData,
      },
      serializedRoom: saveRoom,
      timestamps: { timestamps: timestamps },
      camera: {
        x: localUserCamera.position.x,
        y: localUserCamera.position.y,
        z: localUserCamera.position.z,
      },
      isShared: false,
      subscribedUsers: { subscriberList: [] },
      deleteAt: 0,
    };
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
