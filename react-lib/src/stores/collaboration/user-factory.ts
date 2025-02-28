import { create } from 'zustand';
import RemoteUser from 'react-lib/src/utils/collaboration/remote-user';
import * as THREE from 'three';
import { Color } from 'react-lib/src/utils/collaboration/web-socket-messages/types/color';
import { Position } from 'react-lib/src/utils/collaboration/web-socket-messages/types/position';
import { Quaternion } from 'react-lib/src/utils/collaboration/web-socket-messages/types/quaternion';
import { useLocalUserStore } from './local-user';
import { useHMDStore } from 'react-lib/src/stores/extended-reality/hmd';
import { useMinimapStore } from 'react-lib/src/stores/minimap-service';

// TODO this could probably just be a utility
// TODO wait until RemoteUser is migrated

interface UserFactoryState {
  createUser: ({
    userName,
    userId,
    color,
    position,
    quaternion,
  }: {
    userName: string;
    userId: string;
    color: Color;
    position: Position;
    quaternion: Quaternion;
  }) => RemoteUser;
}

export const useUserFactoryStore = create<UserFactoryState>((set, get) => ({
  createUser: ({
    userName,
    userId,
    color,
    position,
    quaternion,
  }: {
    userName: string;
    userId: string;
    color: Color;
    position: Position;
    quaternion: Quaternion;
  }) => {
    const remoteUser = new RemoteUser({
      userName,
      userId,
      color: new THREE.Color(color.red, color.green, color.blue),
      state: 'online',
      // TODO: local-user and minimap-service should not be passed as arguments
      // in RemoteUser constructor. CHANGE THIS
      localUser: useLocalUserStore,
      minimapService: useMinimapStore,
    });
    useHMDStore
      .getState()
      .headsetModel.then((hmd) =>
        remoteUser.initCamera(hmd.clone(true), { position, quaternion })
      );
    return remoteUser;
  },
}));
