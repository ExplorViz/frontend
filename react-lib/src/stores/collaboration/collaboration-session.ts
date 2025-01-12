import { createStore } from "zustand/vanilla";

import * as THREE from "three";
import { SELF_DISCONNECTED_EVENT } from "./web-socket";
import {
  SELF_CONNECTED_EVENT,
  SelfConnectedMessage,
} from "react-lib/src/utils/collaboration/web-socket-messages/receivable/self-connected";
import {
  USER_CONNECTED_EVENT,
  UserConnectedMessage,
} from "react-lib/src/utils/collaboration/web-socket-messages/receivable/user-connected";
import {
  USER_DISCONNECTED_EVENT,
  UserDisconnectedMessage,
} from "react-lib/src/utils/collaboration/web-socket-messages/receivable/user-disconnect";
import {
  USER_POSITIONS_EVENT,
  UserPositionsMessage,
} from "react-lib/src/utils/extended-reality/vr-web-wocket-messages/sendable/user-positions";
import {
  CONTROLLER_1_ID,
  CONTROLLER_2_ID,
} from "react-lib/src/utils/collaboration/web-socket-messages/types/controller-id";
import { ForwardedMessage } from "react-lib/src/utils/collaboration/web-socket-messages/receivable/forwarded";
import {
  USER_KICK_EVENT,
  UserKickEvent,
} from "react-lib/src/utils/collaboration/web-socket-messages/sendable/kick-user";

export type ConnectionStatus = "offline" | "connecting" | "online";

// TODO migrate RemoteUser first

interface CollaborationSessionState {
  // idToRemoteUser: Map<string, RemoteUser>;
  readonly remoteUserGroup: THREE.Group;
  connectionStatus: ConnectionStatus;
  currentRoomId: string | null;
  previousRoomId: string | null;

  //   getUserCount: () => number;
}

export const useCollaborationSessionStore =
  createStore<CollaborationSessionState>((set, get) => ({
    // idToRemoteUser: new Map(),
    remoteUserGroup: new THREE.Group(),
    connectionStatus: "offline",
    currentRoomId: null,
    previousRoomId: null,

    // getUserCount: () => {
    //   return get().idToRemoteUser.size + 1;
    // },
  }));
