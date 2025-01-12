import Service, { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import LocalUser from 'explorviz-frontend/services/collaboration/local-user';
import ForceGraph from 'explorviz-frontend/rendering/application/force-graph';
import UserSettings from 'explorviz-frontend/services/user-settings';
import * as THREE from 'three';
import Raycaster from 'react-lib/src/utils/raycaster';
import RemoteUser from 'explorviz-frontend/utils/collaboration/remote-user';
import CameraControls from 'react-lib/src/utils/application-rendering/camera-controls';
import { useMinimapStore } from 'react-lib/src/stores/minimap-service';

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

  @service('collaboration/local-user')
  private localUser!: LocalUser;

  @service('user-settings')
  settings!: UserSettings;

  // @tracked
  // makeFullsizeMinimap!: boolean;
  get makeFullsizeMinimap(): boolean {
    return useMinimapStore.getState().makeFullsizeMinimap;
  }

  set makeFullsizeMinimap(value) {
    useMinimapStore.setState({ makeFullsizeMinimap: value });
  }

  // @tracked
  // minimapSize!: number;
  get minimapSize(): number {
    return useMinimapStore.getState().minimapSize;
  }

  set minimapSize(value) {
    useMinimapStore.setState({ minimapSize: value });
  }

  // @tracked
  // minimapEnabled!: boolean;
  get minimapEnabled(): boolean {
    return useMinimapStore.getState().minimapEnabled;
  }

  set minimapEnabled(value) {
    useMinimapStore.setState({ minimapEnabled: value });
  }

  // cameraControls!: CameraControls;
  get cameraControls(): CameraControls {
    return useMinimapStore.getState().cameraControls!;
  }

  set cameraControls(value) {
    useMinimapStore.setState({ cameraControls: value });
  }

  // graph!: ForceGraph;
  get graph(): ForceGraph {
    return useMinimapStore.getState().graph!;
  }

  set graph(value) {
    useMinimapStore.setState({ graph: value });
  }

  // minimapUserMarkers: Map<string, THREE.Mesh> = new Map();
  get minimapUserMarkers(): Map<string, THREE.Mesh> {
    return useMinimapStore.getState().minimapUserMarkers;
  }

  set minimapUserMarkers(value) {
    useMinimapStore.setState({ minimapUserMarkers: value });
  }

  // userPosition!: THREE.Vector3;
  get userPosition(): THREE.Vector3 {
    return useMinimapStore.getState().userPosition;
  }

  set userPosition(value) {
    useMinimapStore.setState({ userPosition: value });
  }

  // distance!: number;
  get distance(): number {
    return useMinimapStore.getState().distance!;
  }

  set distance(value) {
    useMinimapStore.setState({ distance: value });
  }

  // raycaster!: Raycaster;
  get raycaster(): Raycaster {
    return useMinimapStore.getState().raycaster!;
  }

  set raycaster(value) {
    useMinimapStore.setState({ raycaster: value });
  }

  // scene!: THREE.Scene;
  get scene(): THREE.Scene {
    return useMinimapStore.getState().scene!;
  }

  set scene(value) {
    useMinimapStore.setState({ scene: value });
  }

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
    useMinimapStore.getState().initializeMinimap(scene, graph, cameraControls);
  }

  tick() {
    useMinimapStore.getState().getCurrentPosition();
    this.updateMinimapCamera();
    this.updateUserMinimapMarker(this.userPosition, 'localUser');
  }

  // TODO migrate updateUserMinimapMarker first
  // tick() {
  //   useMinimapStore.getState().tick();
  // }

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
    useMinimapStore
      .getState()
      .initializeUserMinimapMarker(userColor, position, name);
  }

  // TODO migrate RemoteUser first
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
    const position = useMinimapStore.getState().checkBoundingBox(intersection);
    const minimapMarker = this.minimapUserMarkers.get(name)!;
    minimapMarker.position.set(position.x, MARKER_HEIGHT, position.z);
  }

  /**
   * Function used for deleting the minimap marker of a user
   * @param name The name of the user
   */
  deleteUserMinimapMarker(name: string) {
    useMinimapStore.getState().deleteUserMinimapMarker(name);
  }

  /**
   * Checks wether the click event is inside the minimap
   * @param event MouseEvent of the click
   * @returns true if the click is inside the minimap
   */
  isClickInsideMinimap(event: MouseEvent): boolean {
    return useMinimapStore.getState().isClickInsideMinimap(event);
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
    useMinimapStore.getState().toggleFullsizeMinimap(value);
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
    return useMinimapStore
      .getState()
      .raycastForObjects(event, camera, raycastObjects);
  }

  /**
   * Function used for raycasting on the minimap markers
   * @param event MouseEvent of the click
   * @returns The objects that were hit
   */
  raycastForMarkers(event: MouseEvent) {
    return useMinimapStore.getState().raycastForMarkers(event);
  }

  /**
   * Function used for updating the minimap size
   * @param value The new minimap size
   */
  updateMinimapCamera() {
    useMinimapStore.getState().updateMinimapCamera();
  }

  calculateDistanceFactor(): number {
    return useMinimapStore.getState().calculateDistanceFactor();
  }

  updateSphereRadius() {
    useMinimapStore.getState().updateSphereRadius();
  }

  /**
   * Function used for getting the minimap size and position
   * @returns The minimap size, position and border width
   */
  minimap(): number[] {
    return useMinimapStore.getState().minimap();
  }
}
declare module '@ember/service' {
  interface Registry {
    minimapService: MinimapService;
  }
}
