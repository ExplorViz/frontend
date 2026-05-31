import { useAnnotationHandlerStore } from 'explorviz-frontend/src/stores/annotation-handler';
import { useCameraControlsStore } from 'explorviz-frontend/src/stores/camera-controls-store';
import { useRoomSerializerStore } from 'explorviz-frontend/src/stores/collaboration/room-serializer';
import { useCommunicationStore } from 'explorviz-frontend/src/stores/communication-store';
import { useSnapshotTokenStore } from 'explorviz-frontend/src/stores/snapshot-token';
import { LandscapeToken } from 'explorviz-frontend/src/stores/landscape-token';
import { useReloadHandlerStore } from 'explorviz-frontend/src/stores/reload-handler';
import { useRenderingServiceStore } from 'explorviz-frontend/src/stores/rendering-service';
import { useTimestampRepositoryStore } from 'explorviz-frontend/src/stores/repos/timestamp-repository';
import {
  SnapshotToken,
  SnapshotStructureData,
} from 'explorviz-frontend/src/stores/snapshot-token';
import { useTimestampStore } from 'explorviz-frontend/src/stores/timestamp';
import { useTimestampPollingStore } from 'explorviz-frontend/src/stores/timestamp-polling';
import { usePopupHandlerStore } from 'explorviz-frontend/src/stores/popup-handler';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import { closeDistrictsByList } from 'explorviz-frontend/src/utils/city-rendering/entity-manipulation';
import { removeAllHighlighting } from 'explorviz-frontend/src/utils/city-rendering/highlighting';
import { SerializedRoom } from 'explorviz-frontend/src/utils/collaboration/web-socket-messages/types/serialized-room';
import { CROSS_COMMIT_IDENTIFIER } from 'explorviz-frontend/src/utils/evolution-schemes/evolution-data';
import { AggregatedBuildingCommunication } from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/aggregated-file-communication';
import { DynamicLandscapeData } from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/dynamic-data';
import { FlatLandscape } from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import { LandscapeData } from 'explorviz-frontend/src/utils/landscape-schemes/landscape-data';
import { Timestamp } from 'explorviz-frontend/src/utils/landscape-schemes/timestamp';

export function buildSnapshotStructureData(
  landscapeData: LandscapeData | null
): SnapshotStructureData {
  return {
    flatLandscapeData: landscapeData?.flatLandscapeData,
    aggregatedFileCommunication: landscapeData?.aggregatedFileCommunication,
    structureLandscapeData: landscapeData?.structureLandscapeData,
    dynamicLandscapeData: landscapeData?.dynamicLandscapeData ?? [],
  };
}

export function buildSnapshotToken(params: {
  name: string;
  owner: string;
  landscapeToken: LandscapeToken;
  landscapeData: LandscapeData | null;
  isShared?: boolean;
  deleteAt?: number;
}): SnapshotToken {
  const createdAt = Date.now();
  const serializedRoom = useRoomSerializerStore.getState().serializeRoom(true);
  const timestamps = useTimestampRepositoryStore
    .getState()
    .getTimestampsForCommitId(CROSS_COMMIT_IDENTIFIER, true);
  return {
    owner: params.owner,
    createdAt,
    name: params.name,
    landscapeToken: params.landscapeToken,
    structureData: buildSnapshotStructureData(params.landscapeData),
    serializedRoom,
    timestamps: { timestamps },
    camera: useCameraControlsStore.getState().captureSnapshotCamera(),
    isShared: params.isShared ?? false,
    subscribedUsers: { subscriberList: [] },
    deleteAt: params.deleteAt ?? 0,
  };
}

export function applySerializedRoomState(serializedRoom: SerializedRoom): void {
  if (serializedRoom.visualizationSettings) {
    useUserSettingsStore
      .getState()
      .updateSettings(serializedRoom.visualizationSettings);
  }

  useVisualizationStore.getState().actions.resetVisualizationState();

  if (serializedRoom.closedComponentIds?.length > 0) {
    closeDistrictsByList(serializedRoom.closedComponentIds, false, false);
  }

  removeAllHighlighting(false);

  for (const highlight of serializedRoom.highlightedEntities ?? []) {
    useVisualizationStore
      .getState()
      .actions.setHighlightedEntityId(highlight.entityId, true);
  }

  if (serializedRoom.popups?.length) {
    usePopupHandlerStore.getState().onRestorePopups(serializedRoom.popups);
  }

  if (serializedRoom.annotations?.length) {
    useAnnotationHandlerStore
      .getState()
      .onRestoreAnnotations(serializedRoom.annotations);
  }
}

function seedSnapshotTimestamps(timestamps: Timestamp[]): void {
  if (timestamps.length === 0) {
    return;
  }

  useTimestampRepositoryStore
    .getState()
    .addTimestamps(CROSS_COMMIT_IDENTIFIER, timestamps);

  const timelineHandler =
    useTimestampRepositoryStore.getState()._timelineDataObjectHandler;
  timelineHandler?.updateTimestampsForCommit(
    useTimestampRepositoryStore
      .getState()
      .getTimestampsForCommitId(CROSS_COMMIT_IDENTIFIER, true),
    CROSS_COMMIT_IDENTIFIER
  );
}

async function resolveSnapshotLandscapeData(
  snapshot: SnapshotToken
): Promise<{
  flat: FlatLandscape;
  dynamic: DynamicLandscapeData;
  aggregated: AggregatedBuildingCommunication;
} | null> {
  const { structureData } = snapshot;

  if (structureData.flatLandscapeData) {
    return {
      flat: structureData.flatLandscapeData,
      dynamic: structureData.dynamicLandscapeData ?? [],
      aggregated: structureData.aggregatedFileCommunication ?? {
        metrics: {},
        communications: [],
      },
    };
  }

  const epochNano = snapshot.serializedRoom?.landscape?.timestamp;
  if (epochNano) {
    try {
      const [flat, dynamic, aggregated] = await useReloadHandlerStore
        .getState()
        .loadLandscapeByTimestamp(epochNano);
      return { flat, dynamic, aggregated };
    } catch (error) {
      console.error('Failed to load snapshot landscape from service:', error);
    }
  }

  if (structureData.structureLandscapeData) {
    const [structure, dynamic] = await useReloadHandlerStore
      .getState()
      .loadLandscapeByTimestampSnapshot(
        structureData.structureLandscapeData,
        structureData.dynamicLandscapeData ?? []
      );
    if (structure) {
      console.warn(
        'Snapshot uses legacy structure format without flat landscape data; visualization may be incomplete.'
      );
    }
    void structure;
    void dynamic;
  }

  return null;
}

export async function restoreSnapshotFromToken(
  snapshot: SnapshotToken
): Promise<void> {
  if (snapshot.serializedRoom?.visualizationSettings) {
    useUserSettingsStore
      .getState()
      .updateSettings(snapshot.serializedRoom.visualizationSettings);
  }

  useTimestampPollingStore.getState().resetPolling();
  useRenderingServiceStore.getState().pauseVisualizationUpdating(true);

  seedSnapshotTimestamps(snapshot.timestamps?.timestamps ?? []);

  const selectedEpoch = snapshot.serializedRoom?.landscape?.timestamp;
  if (selectedEpoch) {
    useTimestampStore.getState().updateSelectedTimestamp(
      new Map([[CROSS_COMMIT_IDENTIFIER, [selectedEpoch]]])
    );
  }

  const landscape = await resolveSnapshotLandscapeData(snapshot);
  if (landscape) {
    useCommunicationStore.getState().setCommunications(landscape.aggregated);
    useRenderingServiceStore.getState().triggerRenderingForGivenLandscapeData(
      landscape.flat,
      landscape.dynamic,
      landscape.aggregated
    );
  }

  useRoomSerializerStore.getState().setSerializedRoom(snapshot.serializedRoom);

  queueSnapshotCameraRestore(snapshot.camera);
}

export function queueSnapshotCameraRestore(
  camera?: SnapshotToken['camera']
): void {
  const snapshotCamera =
    camera ?? useSnapshotTokenStore.getState().snapshotToken?.camera;

  if (!snapshotCamera || !useSnapshotTokenStore.getState().snapshotSelected) {
    return;
  }

  useCameraControlsStore.getState().applySnapshotCamera(snapshotCamera, false);
}

export function tryApplyPendingSerializedRoom(): void {
  const serializedRoom = useRoomSerializerStore.getState().serializedRoom;
  if (!serializedRoom) {
    return;
  }

  const landscapeData = useRenderingServiceStore.getState()._landscapeData;
  if (!landscapeData?.flatLandscapeData) {
    return;
  }

  applySerializedRoomState(serializedRoom);
  useRoomSerializerStore.getState().setSerializedRoom(undefined);
  queueSnapshotCameraRestore();
}
