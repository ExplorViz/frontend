import Service, { inject as service } from '@ember/service';
import LocalUser from 'collaborative-mode/services/local-user';
import { defaultScene, vrScene } from 'explorviz-frontend/utils/scene';
import * as THREE from 'three';

export default class SceneRepository extends Service.extend() {
  @service('local-user')
  localUser!: LocalUser;

  scene: THREE.Scene | undefined;

  getScene(createNew = false) {
    if (!this.scene || createNew) {
      this.scene = this.createScene();
    }

    return this.scene;
  }

  private createScene() {
    if (this.localUser.visualizationMode === 'vr') {
      return vrScene();
    } else {
      return defaultScene();
    }
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    'repos/scene-repository': SceneRepository;
  }
}
