import { createStore } from "zustand/vanilla";

import { LandscapeToken } from "react-lib/src/stores/landscape-token";
import { getCircularReplacer } from "react-lib/src/utils/circularReplacer";
import { StructureLandscapeData } from "react-lib/src/utils/landscape-schemes/structure-data";
import { DynamicLandscapeData } from "react-lib/src/utils/landscape-schemes/dynamic/dynamic-data";
import { SerializedRoom } from "react-lib/src/utils/collaboration/web-socket-messages/types/serialized-room";
import { Timestamp } from "react-lib/src/utils/landscape-schemes/timestamp";
import { reject } from "rsvp";

export type SnapshotToken = {
  owner: string;
  createdAt: number;
  name: string;
  landscapeToken: LandscapeToken;
  structureData: {
    structureLandscapeData: StructureLandscapeData;
    dynamicLandscapeData: DynamicLandscapeData;
  };
  serializedRoom: SerializedRoom;
  timestamps: { timestamps: Timestamp[] };
  camera: { x: number; y: number; z: number };
  isShared: boolean;
  subscribedUsers: { subscriberList: string[] };
  deleteAt: number;
};

export type TinySnapshot = {
  owner: string;
  createdAt: number;
  name: string;
  landscapeToken: LandscapeToken;
};

export type SnapshotInfo = {
  personalSnapshots: TinySnapshot[];
  sharedSnapshots: TinySnapshot[];
  subsricedSnapshots: TinySnapshot[];
};

// TODO read .env
// const { userServiceApi, shareSnapshot } = ENV.backendAddresses;

interface SnapshotTokenState {
  snapshotToken: SnapshotToken | null;
  snapshotSelected: boolean;
  latestSnapshotToken: SnapshotToken | null;
}

export const useSnapshotTokenStore = createStore<SnapshotTokenState>(
  (set, get) => ({
    snapshotToken: null,
    snapshotSelected: false,
    // Used in landscape selection to go back to last selected snapshot
    latestSnapshotToken: null,
    // TODO methods
  })
);
