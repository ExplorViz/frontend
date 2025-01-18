import Service, { inject as service } from '@ember/service';
import RemoteUser from 'explorviz-frontend/utils/collaboration/remote-user';
import * as THREE from 'three';
// import HmdService from 'explorviz-frontend/services/extended-reality/hmd-service';
import LocalUser from './local-user';
import { Color } from 'react-lib/src/utils/collaboration/web-socket-messages/types/color';
import { Position } from 'react-lib/src/utils/collaboration/web-socket-messages/types/position';
import { Quaternion } from 'react-lib/src/utils/collaboration/web-socket-messages/types/quaternion';
import MinimapService from 'explorviz-frontend/services/minimap-service';
import { useHMDStore } from 'react-lib/src/stores/extended-reality/hmd';

export default class UserFactory extends Service.extend({}) {
  // @service('extended-reality/hmd-service')
  // hmdService!: HmdService;

  @service('collaboration/local-user')
  localUser!: LocalUser;

  @service('minimap-service')
  minimapService!: MinimapService;

  createUser({
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
  }): RemoteUser {
    const remoteUser = new RemoteUser({
      userName,
      userId,
      color: new THREE.Color(color.red, color.green, color.blue),
      state: 'online',
      localUser: this.localUser,
      minimapService: this.minimapService,
    });
    useHMDStore
      .getState()
      .headsetModel.then((hmd) =>
        remoteUser.initCamera(hmd.clone(true), { position, quaternion })
      );
    return remoteUser;
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    'collaboration/user-factory': UserFactory;
  }
}
