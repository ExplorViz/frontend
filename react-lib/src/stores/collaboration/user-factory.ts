import { create } from 'zustand';
import RemoteUser from 'explorviz-frontend/src/utils/collaboration/remote-user';
import * as THREE from 'three';
import { Color } from 'explorviz-frontend/src/utils/collaboration/web-socket-messages/types/color';
import { Position } from 'explorviz-frontend/src/utils/collaboration/web-socket-messages/types/position';
import { Quaternion } from 'explorviz-frontend/src/utils/collaboration/web-socket-messages/types/quaternion';
import { useLocalUserStore } from './local-user';
import { useHMDStore } from 'explorviz-frontend/src/stores/extended-reality/hmd';
import { useMinimapStore } from 'explorviz-frontend/src/stores/minimap-service';

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
    });
    useHMDStore
      .getState()
      .headsetModel.then((hmd) =>
        remoteUser.initCamera(hmd.clone(true), { position, quaternion })
      );
    return remoteUser;
  },
}));
