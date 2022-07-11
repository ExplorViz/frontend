import { action } from '@ember/object';
import Service, { inject as service } from '@ember/service';
import Configuration from 'explorviz-frontend/services/configuration';
import CommunicationArrowMesh from 'explorviz-frontend/view-objects/3d/application/communication-arrow-mesh';
import BaseMesh from 'explorviz-frontend/view-objects/3d/base-mesh';
import THREE from 'three';

export default class EntityManipulation extends Service.extend({
  // anything which *must* be merged to prototype here
}) {
  @service('configuration')
  private configuration!: Configuration;

  @action
  updateColors(scene: THREE.Scene) {
    scene.traverse((object3D) => {
      if (object3D instanceof BaseMesh) {
        object3D.updateColor();
        // Special case because communication arrow is no base mesh
      } else if (object3D instanceof CommunicationArrowMesh) {
        object3D.updateColor(this.configuration.applicationColors.communicationArrowColor);
      }
    });
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    'entity-manipulation': EntityManipulation;
  }
}
