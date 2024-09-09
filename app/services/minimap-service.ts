import Service, { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import LocalUser from 'collaboration/services/local-user';
import ForceGraph from 'explorviz-frontend/rendering/application/force-graph';
import UserSettings from 'explorviz-frontend/services/user-settings';
import * as THREE from 'three';
import Raycaster from 'explorviz-frontend/utils/raycaster';
import RemoteUser from 'collaboration/utils/remote-user';

export default class MinimapService extends Service {
  @service('user-settings')
  userSettings!: UserSettings;

  @service('local-user')
  private localUser!: LocalUser;

  @service('user-settings')
  settings!: UserSettings;

  minimapDistance!: number;

  @tracked
  makeFullsizeMinimap!: boolean;

  @tracked
  minimapSize!: number;

  graph!: ForceGraph;

  minimapUserMarkers: Map<string, THREE.Mesh> = new Map();

  intersection!: THREE.Vector3;

  distance!: number;

  raycaster!: Raycaster;

  scene!: THREE.Scene;

  initMinimap(scene: THREE.Scene, graph: ForceGraph) {
    this.localUser.minimapCamera = new THREE.OrthographicCamera(
      -1,
      1,
      1,
      -1,
      0.1,
      100
    );
    this.localUser.minimapCamera.position.set(0, 10, 0);
    this.localUser.minimapCamera.lookAt(new THREE.Vector3(0, -1, 0));
    this.localUser.minimapCamera.layers.disable(0); //default layer
    this.localUser.minimapCamera.layers.enable(1); //foundation layer
    this.localUser.minimapCamera.layers.enable(2); //component layer
    // this.localUser.minimapCamera.layers.enable(3);  //clazz layer
    this.localUser.minimapCamera.layers.enable(4); //communication layer
    this.localUser.minimapCamera.layers.enable(5); //ping layer
    this.localUser.minimapCamera.layers.enable(6); //minimapLabel layer
    this.localUser.minimapCamera.layers.enable(7); //minimapMarkerslayer

    this.intersection = new THREE.Vector3(0, 0, 0);

    this.makeFullsizeMinimap = false;
    this.minimapSize = 4;

    this.graph = graph;
    this.scene = scene;

    this.initializeUserMinimapMarker(
      new THREE.Color(0x808080),
      this.intersection,
      'localUser'
    );

    this.scene.add(this.minimapUserMarkers.get('localUser')!);
  }

  tick() {
    this.getCurrentFocus();
    this.updateMinimapCamera();
    this.updateUserMinimapMarker(this.intersection, 'localUser');
  }

  private getCurrentFocus() {
    let newPos = new THREE.Vector3();

    newPos = this.raycaster.raycastToGround(
      this.localUser.camera,
      this.graph.boundingBox,
      this.userSettings.applicationSettings.version2.value
    );
    this.intersection = newPos;
  }

  initializeUserMinimapMarker(
    userColor: THREE.Color,
    position: THREE.Vector3,
    name: string
  ) {
    const geometry = new THREE.SphereGeometry(
      this.calculateDistanceFactor(),
      32
    );
    const material = new THREE.MeshBasicMaterial({
      color: userColor,
    });
    const minimapMarker = new THREE.Mesh(geometry, material);
    minimapMarker.position.set(position.x, 0.5, position.z);
    minimapMarker.layers.enable(7);
    minimapMarker.layers.disable(0);
    minimapMarker.name = name;
    this.minimapUserMarkers.set(name, minimapMarker);
    this.scene.add(minimapMarker);
  }

  updateUserMinimapMarker(
    intersection: THREE.Vector3,
    name: string,
    remoteUser?: RemoteUser
  ) {
    if (!intersection) {
      return;
    }
    if (!this.minimapUserMarkers.has(name) && remoteUser) {
      this.initializeUserMinimapMarker(
        remoteUser.color,
        intersection,
        remoteUser.userId
      );
      return;
    }
    const minimapMarker = this.minimapUserMarkers.get(name)!;
    minimapMarker.position.set(intersection.x, 0.5, intersection.z);
  }

  deleteUserMinimapMarker(name: string) {
    const minimapMarker = this.minimapUserMarkers.get(name);
    if (minimapMarker) {
      this.minimapUserMarkers.delete(name);
    }
  }

  updateMinimapCamera() {
    // Call the new function to check and adjust minimap size
    const boundingBox = this.graph.boundingBox;

    // Calculate the size of the bounding box
    const size = boundingBox.getSize(new THREE.Vector3());
    const boundingBoxWidth = size.x;
    const boundingBoxHeight = size.z;

    this.distance = this.userSettings.applicationSettings.zoom.value;

    this.localUser.minimapCamera.left = -boundingBoxWidth / 2 / this.distance;
    this.localUser.minimapCamera.right = boundingBoxWidth / 2 / this.distance;
    this.localUser.minimapCamera.top = boundingBoxHeight / 2 / this.distance;
    this.localUser.minimapCamera.bottom =
      -boundingBoxHeight / 2 / this.distance;

    if (this.userSettings.applicationSettings.zoom.value != 1) {
      this.localUser.minimapCamera.position.set(
        this.intersection.x,
        1,
        this.intersection.z
      );
    } else {
      this.localUser.minimapCamera.position.set(0, 1, 0);
    }
    // Update the minimap camera's projection matrix
    this.localUser.minimapCamera.updateProjectionMatrix();

    // Check if the minimapMarker is outside the minimapCamera's view
    const markerPosition = this.minimapUserMarkers.get('localUser')!.position;
    const cameraLeft =
      this.localUser.minimapCamera.left +
      this.localUser.minimapCamera.position.x;
    const cameraRight =
      this.localUser.minimapCamera.right +
      this.localUser.minimapCamera.position.x;
    const cameraTop =
      this.localUser.minimapCamera.top +
      this.localUser.minimapCamera.position.z;
    const cameraBottom =
      this.localUser.minimapCamera.bottom +
      this.localUser.minimapCamera.position.z;

    const intersection = new THREE.Vector3();
    intersection.copy(this.intersection);
    if (markerPosition.x < cameraLeft) {
      intersection!.x = cameraLeft;
    }
    if (markerPosition.x > cameraRight) {
      intersection!.x = cameraRight;
    }
    if (markerPosition.z < cameraBottom) {
      intersection!.z = cameraBottom;
    }
    if (markerPosition.z > cameraTop) {
      intersection!.z = cameraTop;
    }
  }

  calculateDistanceFactor(): number {
    return 0.2 / this.settings.applicationSettings.zoom.value;
  }

  updateSphereRadius() {
    this.minimapUserMarkers.forEach((minimapMarker) => {
      const geometry = new THREE.SphereGeometry(this.calculateDistanceFactor());
      minimapMarker.geometry.dispose(); // Dispose of the old geometry
      minimapMarker.geometry = geometry; // Assign the new geometry
    });
  }

  minimap() {
    const borderWidth = 2;
    if (this.makeFullsizeMinimap) {
      const minimapSize = 0.9;

      const minimapHeight =
        Math.min(window.innerHeight, window.innerWidth) * minimapSize;
      const minimapWidth = minimapHeight;

      const minimapX = window.innerWidth / 2 - minimapWidth / 2;
      const minimapY = window.innerHeight / 2 - minimapHeight / 2 - 20;

      return [minimapHeight, minimapWidth, minimapX, minimapY, borderWidth];
    }
    const minimapHeight =
      Math.min(window.innerHeight, window.innerWidth) / this.minimapSize;
    const minimapWidth = minimapHeight;

    const marginSettingsSymbol = 55;
    const margin = 10;
    const minimapX =
      window.innerWidth - minimapWidth - margin - marginSettingsSymbol;
    const minimapY = window.innerHeight - minimapHeight - margin;

    return [minimapHeight, minimapWidth, minimapX, minimapY, borderWidth];
  }
}
declare module '@ember/service' {
  interface Registry {
    minimapService: MinimapService;
  }
}
