import Service, { inject as service } from '@ember/service';
import RemoteUser from 'collaborative-mode/utils/remote-user';
import * as THREE from 'three';
import HmdService from 'virtual-reality/services/hmd-service';
import LocalUser from './local-user';
import { Color } from 'collaborative-mode/utils/web-socket-messages/types/color';
import { Position } from 'collaborative-mode/utils/web-socket-messages/types/position';
import { Quaternion } from 'collaborative-mode/utils/web-socket-messages/types/quaternion';

export default class UserFactory extends Service.extend({}) {
  @service('hmd-service')
  hmdService!: HmdService;

  @service('local-user')
  localUser!: LocalUser;

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
