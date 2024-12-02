import Service, { inject as service } from '@ember/service';
import RemoteUser from 'explorviz-frontend/utils/collaboration/remote-user';
import * as THREE from 'three';
import HmdService from 'extended-reality/services/hmd-service';
import LocalUser from './local-user';
import { Color } from 'explorviz-frontend/utils/collaboration/web-socket-messages/types/color';
import { Position } from 'explorviz-frontend/utils/collaboration/web-socket-messages/types/position';
import { Quaternion } from 'explorviz-frontend/utils/collaboration/web-socket-messages/types/quaternion';
import MinimapService from 'explorviz-frontend/services/minimap-service';

export default class UserFactory extends Service.extend({}) {
  @service('hmd-service')
  hmdService!: HmdService;

  @service('local-user')
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
    this.hmdService.headsetModel.then((hmd) =>
      remoteUser.initCamera(hmd.clone(true), { position, quaternion })
    );
    return remoteUser;
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    'user-factory': UserFactory;
  }
}
