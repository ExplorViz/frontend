import Service, { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import LocalUser from 'collaboration/services/local-user';
import ForceGraph from 'explorviz-frontend/rendering/application/force-graph';
import UserSettings from 'explorviz-frontend/services/user-settings';
import * as THREE from 'three';
import Raycaster from 'explorviz-frontend/utils/raycaster';
import RemoteUser from 'collaboration/utils/remote-user';
import CameraControls from 'explorviz-frontend/utils/application-rendering/camera-controls';

export enum SceneLayers {
  Default = 0,
  Foundation = 1,
  Component = 2,
  Clazz = 3,
  Communication = 4,
  Ping = 5,
  MinimapLabel = 6,
  MinimapMarkers = 7,
  LocalMinimapMarker = 8,
}

const MARKER_HEIGHT = 101;

const MINIMAP_HEIGHT = 102;

export default class MinimapService extends Service {
  @service('user-settings')
  userSettings!: UserSettings;

  @service('local-user')
  private localUser!: LocalUser;

  @service('user-settings')
  settings!: UserSettings;

  @tracked
  makeFullsizeMinimap!: boolean;

  @tracked
  minimapSize!: number;

  @tracked
  minimapEnabled!: boolean;

  cameraControls!: CameraControls;

  graph!: ForceGraph;

  minimapUserMarkers: Map<string, THREE.Mesh> = new Map();

  userPosition!: THREE.Vector3;

  distance!: number;

  raycaster!: Raycaster;

  scene!: THREE.Scene;

  /**
   * Initializes the minimap Service class
   * @param scene Scene containing all elements
   * @param graph Graph including the boundingbox used by the minimap
   * @param cameraControls CameraControls of the main camera
   */
  initializeMinimap(
    scene: THREE.Scene,
    graph: ForceGraph,
    cameraControls: CameraControls
  ) {
    this.minimapEnabled = this.settings.applicationSettings.minimap.value;
    this.userPosition = new THREE.Vector3(0, 0, 0);
    this.makeFullsizeMinimap = false;
    this.minimapSize = 4;
    this.graph = graph;
    this.scene = scene;

    this.setupCamera(cameraControls);
    this.setupLocalUserMarker();
  }
  /**
   * Sets up the camera for the minimap
   * @param cameraControls CameraControls of the main camera
   */
  setupCamera(cameraControls: CameraControls) {
    this.cameraControls = cameraControls;
    this.localUser.minimapCamera = new THREE.OrthographicCamera();
    this.localUser.minimapCamera.position.set(0, MINIMAP_HEIGHT, 0);
    this.localUser.minimapCamera.lookAt(new THREE.Vector3(0, -1, 0));

    this.localUser.minimapCamera.layers.disable(SceneLayers.Default);
    this.localUser.minimapCamera.layers.enable(SceneLayers.Foundation);
    this.localUser.minimapCamera.layers.enable(SceneLayers.Component);
    this.localUser.minimapCamera.layers.enable(SceneLayers.Clazz);
    this.localUser.minimapCamera.layers.enable(SceneLayers.Communication);
    this.localUser.minimapCamera.layers.enable(SceneLayers.Ping);
    this.localUser.minimapCamera.layers.enable(SceneLayers.MinimapLabel);
    this.localUser.minimapCamera.layers.enable(SceneLayers.MinimapMarkers);
    this.localUser.minimapCamera.layers.enable(SceneLayers.LocalMinimapMarker);
  }

  /**
   * Sets up the local user marker for the minimap
   */
  setupLocalUserMarker() {
    this.initializeUserMinimapMarker(
      new THREE.Color(0x808080),
      this.userPosition,
      'localUser'
    );

    this.minimapUserMarkers
      .get('localUser')!
      .layers.enable(SceneLayers.LocalMinimapMarker);
    this.minimapUserMarkers
      .get('localUser')!
      .layers.disable(SceneLayers.MinimapMarkers);

    this.scene.add(this.minimapUserMarkers.get('localUser')!);
  }

  tick() {
    this.getCurrentPosition();
    this.updateMinimapCamera();
    this.updateUserMinimapMarker(this.userPosition, 'localUser');
  }

  /**
   * Gets the current position of the user, either by camera position or camera target
   */
  private getCurrentPosition() {
    const userPosition = new THREE.Vector3();
    if (!this.settings.applicationSettings.version2.value) {
      userPosition.copy(this.cameraControls.perspectiveCameraControls.target);
    } else {
      userPosition.copy(this.localUser.camera.position);
    }
    this.userPosition = this.checkBoundingBox(userPosition);
  }

  /**
   * Checks if the user is inside the bounding box
   * @param intersection Intersection of the user
   */
  private checkBoundingBox(intersection: THREE.Vector3): THREE.Vector3 {
    if (this.graph.boundingBox) {
      if (intersection.x > this.graph.boundingBox.max.x) {
        intersection.x = this.graph.boundingBox.max.x;
      } else if (intersection.x < this.graph.boundingBox.min.x) {
        intersection.x = this.graph.boundingBox.min.x;
      }
      if (intersection.z > this.graph.boundingBox.max.z) {
        intersection.z = this.graph.boundingBox.max.z;
      } else if (intersection.z < this.graph.boundingBox.min.z) {
        intersection.z = this.graph.boundingBox.min.z;
      }
    }
    return intersection;
  }

  /**
   * Function used for initializing a minimap marker for a user
   * @param userColor The color of the user
   * @param position The position of the user
   * @param name The name of the user
   */
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
    minimapMarker.position.set(position.x, MARKER_HEIGHT, position.z);
    minimapMarker.layers.enable(SceneLayers.MinimapMarkers);
    minimapMarker.layers.disable(SceneLayers.Default);
    minimapMarker.name = name;
    this.minimapUserMarkers.set(name, minimapMarker);
    this.scene.add(minimapMarker);
  }

  /**
   * Function used for updating the minimap marker of a user
   * @param intersection The intersection of the user
   * @param name The name of the user
   * @param remoteUser The remote user object
   */
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
    const position = this.checkBoundingBox(intersection);
    const minimapMarker = this.minimapUserMarkers.get(name)!;
    minimapMarker.position.set(position.x, MARKER_HEIGHT, position.z);
  }

  /**
   * Function used for deleting the minimap marker of a user
   * @param name The name of the user
   */
  deleteUserMinimapMarker(name: string) {
    const minimapMarker = this.minimapUserMarkers.get(name);
    if (minimapMarker) {
      this.scene.remove(minimapMarker);
      this.minimapUserMarkers.delete(name);
    }
  }

  /**
   * Checks wether the click event is inside the minimap
   * @param event MouseEvent of the click
   * @returns true if the click is inside the minimap
   */
  isClickInsideMinimap(event: MouseEvent) {
    const minimap = this.minimap();
    const minimapHeight = minimap[0];
    const minimapWidth = minimap[1];
    const minimapX = minimap[2];
    const minimapY = window.innerHeight - minimap[3] - minimapHeight;

    const xInBounds =
      event.clientX >= minimapX && event.clientX <= minimapX + minimapWidth;
    const yInBounds =
      event.clientY >= minimapY && event.clientY <= minimapY + minimapHeight;

    return xInBounds && yInBounds;
  }

  /**
   * Function used for handling a hit on the minimap
   * @param userHit The user that was hit
   * @returns true if the user was hit
   */
  handleHit(userHit: RemoteUser) {
    if (!userHit || userHit.camera?.model instanceof THREE.OrthographicCamera)
      return;
    this.localUser.camera.position.copy(userHit.camera!.model.position);
    this.localUser.camera.quaternion.copy(userHit.camera!.model.quaternion);
    this.cameraControls.perspectiveCameraControls.target.copy(
      this.raycaster.raycastToCameraTarget(
        this.localUser.minimapCamera,
        this.graph.boundingBox
      )
    );
  }

  /**
   * Function used to toggle the fullsize minimap
   * @param value true if the minimap should be fullsize
   */
  toggleFullsizeMinimap(value: boolean) {
    this.makeFullsizeMinimap = value;
    this.cameraControls.enabled = !value;
    this.cameraControls.perspectiveCameraControls.enabled = !value;
    if (this.cameraControls.orthographicCameraControls) {
      this.cameraControls.orthographicCameraControls.enabled = !value;
    }
  }

  /**
   * Function used for raycasting on the minimap
   * @param event MouseEvent of the click
   * @param camera The camera used for the raycasting
   * @param raycastObjects The objects to raycast
   * @returns The objects that were hit
   */
  raycastForObjects(
    event: MouseEvent,
    camera: THREE.Camera,
    raycastObjects: THREE.Object3D | THREE.Object3D[]
  ) {
    const minimap = this.minimap();
    const width = minimap[1];
    const height = minimap[0];
    const left = minimap[2];
    const top = window.innerHeight - minimap[3] - height;

    const x = ((event.x - left) / width) * 2 - 1;
    const y = -((event.y - top) / height) * 2 + 1;

    const origin = new THREE.Vector2(x, y);
    const possibleObjects =
      raycastObjects instanceof THREE.Object3D
        ? [raycastObjects]
        : raycastObjects;
    return this.raycaster.raycasting(origin, camera, possibleObjects);
  }

  /**
   * Function used for raycasting on the minimap markers
   * @param event MouseEvent of the click
   * @returns The objects that were hit
   */
  raycastForMarkers(event: MouseEvent) {
    // Get the bounding rectangle of the minimap
    const minimap = this.minimap();
    const width = minimap[1];
    const height = minimap[0];
    const left = minimap[2];
    const top = window.innerHeight - minimap[3] - height;

    // Calculate normalized device coordinates (NDC) based on the minimap
    const x = ((event.clientX - left) / width) * 2 - 1;
    const y = -((event.clientY - top) / height) * 2 + 1;

    // Create a Vector2 for the raycasting origin
    const origin = new THREE.Vector2(x, y);

    return this.raycaster.raycastMinimapMarkers(
      this.localUser.minimapCamera,
      origin,
      Array.from(this.minimapUserMarkers.values()!)
    );
  }

  /**
   * Function used for updating the minimap size
   * @param value The new minimap size
   */
  updateMinimapCamera() {
    // Call the new function to check and adjust minimap size
    const boundingBox = this.graph.boundingBox;

    // Calculate the size of the bounding box
    const size = boundingBox.getSize(new THREE.Vector3());
    const boundingBoxWidth = size.x;
    const boundingBoxHeight = size.z;

    if (this.makeFullsizeMinimap) {
      this.distance = 1;
    } else {
      this.distance = this.userSettings.applicationSettings.zoom.value;
    }

    this.localUser.minimapCamera.left = -boundingBoxWidth / 2 / this.distance;
    this.localUser.minimapCamera.right = boundingBoxWidth / 2 / this.distance;
    this.localUser.minimapCamera.top = boundingBoxHeight / 2 / this.distance;
    this.localUser.minimapCamera.bottom =
      -boundingBoxHeight / 2 / this.distance;

    if (
      this.userSettings.applicationSettings.zoom.value != 1 &&
      !this.makeFullsizeMinimap
    ) {
      this.localUser.minimapCamera.position.set(
        this.userPosition.x,
        MINIMAP_HEIGHT,
        this.userPosition.z
      );
    } else {
      const center = new THREE.Vector3();
      boundingBox.getCenter(center);
      this.localUser.minimapCamera.position.set(
        center.x,
        MINIMAP_HEIGHT,
        center.z
      );
    }
    this.localUser.minimapCamera.updateProjectionMatrix();
  }

  calculateDistanceFactor(): number {
    return 0.2 / this.settings.applicationSettings.zoom.value;
  }

  updateSphereRadius() {
    this.minimapUserMarkers.forEach((minimapMarker) => {
      const geometry = new THREE.SphereGeometry(this.calculateDistanceFactor());
      minimapMarker.geometry.dispose();
      minimapMarker.geometry = geometry;
    });
  }

  /**
   * Function used for getting the minimap size and position
   * @returns The minimap size, position and border width
   */
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
