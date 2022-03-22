import Service, { inject as service } from '@ember/service';
import debugLogger from 'ember-debug-logger';
import ApplicationRenderer from 'explorviz-frontend/services/application-renderer';
import Configuration from 'explorviz-frontend/services/configuration';
import LandscapeRenderer from 'explorviz-frontend/services/landscape-renderer';
import VrApplicationRenderer from 'explorviz-frontend/services/vr-application-renderer';
import THREE from 'three';
import {
  APPLICATION_ENTITY_TYPE, CLASS_COMMUNICATION_ENTITY_TYPE, CLASS_ENTITY_TYPE,
  COMPONENT_ENTITY_TYPE, EntityType, NODE_ENTITY_TYPE,
} from 'virtual-reality/utils/vr-message/util/entity_type';
import FloorMesh from '../utils/view-objects/vr/floor-mesh';

const FLOOR_SIZE = 1000;

export default class VrSceneService extends Service {
  @service('configuration')
  private configuration!: Configuration;

  @service('application-renderer')
  private applicationRenderer!: ApplicationRenderer;

  @service('landscape-renderer')
  private landscapeRenderer!: LandscapeRenderer;

  scene: THREE.Scene;

  readonly floor: FloorMesh;

  light: THREE.AmbientLight

  spotLight: THREE.SpotLight;

  skyLight: THREE.SpotLight;

  private debug = debugLogger('LandscapeRenderer');

  constructor(properties?: object) {
    super(properties);

    // Initialize sceene.
    this.debug('Scene initializing')
    this.scene = new THREE.Scene();
    this.scene.background = this.configuration.landscapeColors.backgroundColor;
    this.debug('Scene initialized')

    // Initilize floor.
    this.floor = new FloorMesh(FLOOR_SIZE, FLOOR_SIZE);
    // this.scene.add(this.floor);

    // Initialize lights.
    this.light = new THREE.AmbientLight(new THREE.Color(0.65, 0.65, 0.65));
    // this.scene.add(light);

    this.spotLight = new THREE.SpotLight(0xffffff, 0.5, 2000);
    this.spotLight.position.set(-200, 100, 100);
    this.spotLight.castShadow = true;
    this.spotLight.angle = 0.3;
    this.spotLight.penumbra = 0.2;
    this.spotLight.decay = 2;

    // this.addSpotlight();

    // Add a light that illuminates the sky box if the user dragged in a backgound image.
    this.skyLight = new THREE.SpotLight(0xffffff, 0.5, 1000, Math.PI, 0, 0);
    this.skyLight.castShadow = false;
    // this.addSkylight();
  }

  addFloor() {
    this.scene.add(this.floor);
  }

  addLight() {
    this.scene.add(this.light);
  }

  addSpotlight() {
    this.scene.add(this.spotLight);
  }

  removeSpotlight() {
    this.scene.remove(this.spotLight);
  }

  addSkylight() {
    this.scene.add(this.skyLight);
  }

  removeSkylight() {
    this.scene.remove(this.skyLight);
  }

  /**
   * Handles the visibility of all lights other than the ambient light.
   * This includes spotlights which might cause reflections.
   */
  setAuxiliaryLightVisibility(visible: boolean) {
    if (visible) {
      this.addSkylight();
      this.addSpotlight();
    } else {
      this.removeSkylight();
      this.removeSpotlight();
    }
  }

  /**
   * Removes the floor and sets a transparent background.
   * Landscape and application models are unaffected.
   */
  setSceneTransparent() {
    this.scene.remove(this.floor);
    this.scene.background = null;
  }

  findMeshByModelId(entityType: EntityType, id: string) {
    switch (entityType) {
      case NODE_ENTITY_TYPE:
      case APPLICATION_ENTITY_TYPE:
        return this.landscapeRenderer.landscapeObject3D.getMeshbyModelId(id);

      case COMPONENT_ENTITY_TYPE:
      case CLASS_ENTITY_TYPE:
        return this.getBoxMeshByModelId(id);

      case CLASS_COMMUNICATION_ENTITY_TYPE:
        return this.getCommunicationMeshById(id);

      default:
        return null;
    }
  }

  private getCommunicationMeshById(id: string) {
    const openApplications = this.applicationRenderer.getOpenApplications();
    for (let i = 0; i < openApplications.length; i++) {
      const application = openApplications[i];
      const mesh = application.getCommMeshByModelId(id);
      if (mesh) return mesh;
    }
    return null;
  }

  private getBoxMeshByModelId(id: string) {
    const openApplications = this.applicationRenderer.getOpenApplications();

    for (let i = 0; i < openApplications.length; i++) {
      const application = openApplications[i];
      const mesh = application.getBoxMeshbyModelId(id);
      if (mesh) return mesh;
    }
    return null;
  }
}

declare module '@ember/service' {
  interface Registry {
    'vr-scene': VrSceneService;
  }
}
