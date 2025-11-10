import { useHMDStore } from 'explorviz-frontend/src/stores/extended-reality/hmd';
import RemoteUser from 'explorviz-frontend/src/utils/collaboration/remote-user';
import { Color } from 'explorviz-frontend/src/utils/collaboration/web-socket-messages/types/color';
import { Position } from 'explorviz-frontend/src/utils/collaboration/web-socket-messages/types/position';
import { Quaternion } from 'explorviz-frontend/src/utils/collaboration/web-socket-messages/types/quaternion';
import * as THREE from 'three';
import { create } from 'zustand';

// TODO this could probably just be a utility

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
      color: new THREE.Color().setRGB(
        color.red / 255,
        color.green / 255,
        color.blue / 255
      ),
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
