import * as THREE from 'three';
import Configuration from './configuration';
import BaseMesh from '../view-objects/3d/base-mesh';
import CommunicationArrowMesh from '../view-objects/3d/application/communication-arrow-mesh';

export default class EntityManipulation {
  private configuration!: Configuration;

  updateColors(scene: THREE.Scene) {
    scene.traverse((object3D) => {
      if (object3D instanceof BaseMesh) {
        object3D.updateColor();
        // Special case because communication arrow is no base mesh
      } else if (object3D instanceof CommunicationArrowMesh) {
        object3D.updateColor(
          this.configuration.applicationColors.communicationArrowColor
        );
      }
    });
  }
}
