import { createStore } from 'zustand/vanilla';

import { useUserSettingsStore } from 'react-lib/src/stores/user-settings';
import { useLocalUserStore } from 'react-lib/src/stores/collaboration/local-user';
import CameraControls from 'react-lib/src/utils/application-rendering/camera-controls';
import Raycaster from 'react-lib/src/utils/raycaster';
import * as THREE from 'three';
import Landscape3D from '../view-objects/3d/landscape/landscape-3d';

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

interface MinimapState {
  makeFullsizeMinimap: boolean;
  minimapSize: number;
  minimapEnabled: boolean;
  cameraControls?: CameraControls;
  landscape3D: Landscape3D;
  minimapUserMarkers: Map<string, THREE.Mesh>;
  userPosition: THREE.Vector3;
  distance?: number;
  raycaster?: Raycaster;
  scene?: THREE.Scene;
  initializeMinimap: (
    scene: THREE.Scene,
    landscape3D: Landscape3D,
    cameraControls: CameraControls
  ) => void;
  setupCamera: (cameraControls: CameraControls) => void;
  setupLocalUserMarker: () => void;
  // tick: () => void;
  getCurrentPosition: () => void;
  checkBoundingBox: (intersection: THREE.Vector3) => THREE.Vector3;
  initializeUserMinimapMarker: (
    userColor: THREE.Color,
    position: THREE.Vector3,
    name: string
  ) => void;
  deleteUserMinimapMarker: (name: string) => void;
  isMouseInsideMinimap: (event: MouseEvent) => boolean;
  // handleHit: (userHit: RemoteUser) => void;
  toggleFullsizeMinimap: (value: boolean) => void;
  raycastForObjects: (
    event: MouseEvent,
    camera: THREE.Camera,
    raycastObjects: THREE.Object3D | THREE.Object3D[]
  ) => THREE.Intersection | null;
  raycastForMarkers: (event: MouseEvent) => THREE.Intersection | null;
  updateMinimapCamera: () => void;
  calculateDistanceFactor: () => number;
  updateSphereRadius: () => void;
  minimap: () => number[];
  setMinimapEnabled: (value: boolean) => void;
}

export const useMinimapStore = createStore<MinimapState>((set, get) => ({
  makeFullsizeMinimap: false,
  minimapSize: 4,
  minimapEnabled:
    useUserSettingsStore.getState().visualizationSettings.minimap.value,
  cameraControls: undefined, // is set by browser-rendering / vr-rendering
  landscape3D: new Landscape3D(), // is set by browser-rendering / vr-rendering
  minimapUserMarkers: new Map(),
  userPosition: new THREE.Vector3(0, 0, 0),
  distance: undefined,
  raycaster: undefined,
  scene: undefined,

  /**
   * Initializes the minimap Service class
   * @param scene Scene containing all elements
   * @param Landscape3D Graph including the boundingbox used by the minimap
   * @param cameraControls CameraControls of the main camera
   */
  initializeMinimap: (
    scene: THREE.Scene,
    landscape3D: Landscape3D,
    cameraControls: CameraControls
  ) => {
    set({ landscape3D: landscape3D, scene: scene });
    get().setupCamera(cameraControls);
    get().setupLocalUserMarker();
  },

  /**
   * Sets up the camera for the minimap
   * @param cameraControls CameraControls of the main camera
   */
  setupCamera: (cameraControls: CameraControls) => {
    set({ cameraControls: cameraControls });

    const minimapCamera = new THREE.OrthographicCamera();
    minimapCamera.position.set(0, MINIMAP_HEIGHT, 0);
    minimapCamera.lookAt(new THREE.Vector3(0, -1, 0));

    minimapCamera.layers.disable(SceneLayers.Default);
    minimapCamera.layers.enable(SceneLayers.Foundation);
    minimapCamera.layers.enable(SceneLayers.Component);
    minimapCamera.layers.enable(SceneLayers.Clazz);
    minimapCamera.layers.enable(SceneLayers.Communication);
    minimapCamera.layers.enable(SceneLayers.Ping);
    minimapCamera.layers.enable(SceneLayers.MinimapLabel);
    minimapCamera.layers.enable(SceneLayers.MinimapMarkers);
    minimapCamera.layers.enable(SceneLayers.LocalMinimapMarker);

    useLocalUserStore.setState({
      minimapCamera: minimapCamera,
    });
  },

  /**
   * Sets up the local user marker for the minimap
   */
  setupLocalUserMarker: () => {
    get().initializeUserMinimapMarker(
      new THREE.Color(0x808080),
      get().userPosition,
      'localUser'
    );

    get()
      .minimapUserMarkers.get('localUser')!
      .layers.enable(SceneLayers.LocalMinimapMarker);
    get()
      .minimapUserMarkers.get('localUser')!
      .layers.disable(SceneLayers.MinimapMarkers);

    get().scene!.add(get().minimapUserMarkers.get('localUser')!);
  },

  // TODO migrate updateUserMinimapMarker first
  // tick() {
  //   get().getCurrentPosition();
  //   get().updateMinimapCamera();
  //   get().updateUserMinimapMarker(get().userPosition, "localUser");
  // },

  /**
   * Gets the current position of the user, either by camera position or camera target
   */
  // TODO private
  getCurrentPosition: () => {
    const userPosition = new THREE.Vector3();
    if (
      !useUserSettingsStore.getState().visualizationSettings.useCameraPosition
        .value
    ) {
      userPosition.copy(get().cameraControls!.perspectiveCameraControls.target);
    } else {
      userPosition.copy(useLocalUserStore.getState().getCamera().position);
    }
    set({ userPosition: get().checkBoundingBox(userPosition) });
  },

  /**
   * Checks if the user is inside the bounding box
   * @param intersection Intersection of the user
   */
  // TODO private
  checkBoundingBox: (intersection: THREE.Vector3) => {
    const boundingBox = new THREE.Box3().setFromObject(
      useMinimapStore.getState().landscape3D
    );
    if (boundingBox) {
      if (intersection.x > boundingBox.max.x) {
        intersection.x = boundingBox.max.x;
      } else if (intersection.x < boundingBox.min.x) {
        intersection.x = boundingBox.min.x;
      }
      if (intersection.z > boundingBox.max.z) {
        intersection.z = boundingBox.max.z;
      } else if (intersection.z < boundingBox.min.z) {
        intersection.z = boundingBox.min.z;
      }
    }
    return intersection;
  },

  /**
   * Function used for initializing a minimap marker for a user
   * @param userColor The color of the user
   * @param position The position of the user
   * @param name The name of the user
   */
  initializeUserMinimapMarker: (
    userColor: THREE.Color,
    position: THREE.Vector3,
    name: string
  ) => {
    const geometry = new THREE.SphereGeometry(
      get().calculateDistanceFactor(),
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
    get().minimapUserMarkers.set(name, minimapMarker);
    get().scene!.add(minimapMarker);
  },

  // TODO migrate RemoteUser first
  // /**
  //  * Function used for updating the minimap marker of a user
  //  * @param intersection The intersection of the user
  //  * @param name The name of the user
  //  * @param remoteUser The remote user object
  //  */
  // updateUserMinimapMarker: (
  //   intersection: THREE.Vector3,
  //   name: string,
  //   remoteUser?: RemoteUser
  // ) => {
  //   if (!intersection) {
  //     return;
  //   }
  //   if (!get().minimapUserMarkers.has(name) && remoteUser) {
  //     get().initializeUserMinimapMarker(
  //       remoteUser.color,
  //       intersection,
  //       remoteUser.userId
  //     );
  //     return;
  //   }
  //   const position = get().checkBoundingBox(intersection);
  //   const minimapMarker = get().minimapUserMarkers.get(name)!;
  //   minimapMarker.position.set(position.x, MARKER_HEIGHT, position.z);
  // },

  /**
   * Function used for deleting the minimap marker of a user
   * @param name The name of the user
   */
  deleteUserMinimapMarker: (name: string) => {
    const minimapMarker = get().minimapUserMarkers.get(name);
    if (minimapMarker) {
      get().scene!.remove(minimapMarker);
      get().minimapUserMarkers.delete(name);
    }
  },

  /**
   * Checks whether the click event is inside the minimap
   * @param event MouseEvent of the click
   * @returns true if the click is inside the minimap
   */
  isMouseInsideMinimap: (event: MouseEvent) => {
    // Avoid unnecessary computations
    if (!get().minimapEnabled) return false;

    const minimap = get().minimap();
    const minimapHeight = minimap[0];
    const minimapWidth = minimap[1];
    const minimapX = minimap[2];
    const minimapY = window.innerHeight - minimap[3] - minimapHeight;

    const xInBounds =
      event.clientX >= minimapX && event.clientX <= minimapX + minimapWidth;
    const yInBounds =
      event.clientY >= minimapY && event.clientY <= minimapY + minimapHeight;

    return xInBounds && yInBounds;
  },

  // /**
  //  * Function used for handling a hit on the minimap
  //  * @param userHit The user that was hit
  //  * @returns true if the user was hit
  //  */
  // handleHit: (userHit: RemoteUser) => {
  //   if (!userHit || userHit.camera?.model instanceof THREE.OrthographicCamera)
  //     return;
  //   useLocalUserStore
  //     .getState()
  //     .getCamera()
  //     .position.copy(userHit.camera!.model.position);
  //   useLocalUserStore
  //     .getState()
  //     .getCamera()
  //     .quaternion.copy(userHit.camera!.model.quaternion);
  //   get().cameraControls!.perspectiveCameraControls.target.copy(
  //     get().raycaster!.raycastToCameraTarget(
  //       useLocalUserStore.getState().minimapCamera,
  //       get().graph!.boundingBox
  //     )
  //   );
  // },

  /**
   * Function used to toggle the fullsize minimap
   * @param value true if the minimap should be fullsize
   */
  toggleFullsizeMinimap: (value: boolean) => {
    set({ makeFullsizeMinimap: value });
    const cameraControls = get().cameraControls;
    cameraControls!.enabled = !value;
    cameraControls!.perspectiveCameraControls.enabled = !value;
  },

  /**
   * Function used for raycasting on the minimap
   * @param event MouseEvent of the click
   * @param camera The camera used for the raycasting
   * @param raycastObjects The objects to raycast
   * @returns The objects that were hit
   */
  raycastForObjects: (
    event: MouseEvent,
    camera: THREE.Camera,
    raycastObjects: THREE.Object3D | THREE.Object3D[]
  ) => {
    const minimap = get().minimap();
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
    return get().raycaster!.raycasting(origin, camera, possibleObjects);
  },

  /**
   * Function used for raycasting on the minimap markers
   * @param event MouseEvent of the click
   * @returns The objects that were hit
   */
  raycastForMarkers: (event: MouseEvent) => {
    // Get the bounding rectangle of the minimap
    const minimap = get().minimap();
    const width = minimap[1];
    const height = minimap[0];
    const left = minimap[2];
    const top = window.innerHeight - minimap[3] - height;

    // Calculate normalized device coordinates (NDC) based on the minimap
    const x = ((event.clientX - left) / width) * 2 - 1;
    const y = -((event.clientY - top) / height) * 2 + 1;

    // Create a Vector2 for the raycasting origin
    const origin = new THREE.Vector2(x, y);

    return get().raycaster!.raycastMinimapMarkers(
      useLocalUserStore.getState().minimapCamera,
      origin,
      Array.from(get().minimapUserMarkers.values()!)
    );
  },

  /**
   * Function used for updating the minimap size
   * @param value The new minimap size
   */
  updateMinimapCamera: () => {
    // Call the new function to check and adjust minimap size
    const boundingBox = new THREE.Box3().setFromObject(
      useMinimapStore.getState().landscape3D
    );

    // Calculate the size of the bounding box
    const size = boundingBox.getSize(new THREE.Vector3());
    const boundingBoxWidth = size.x;
    const boundingBoxHeight = size.z;

    if (get().makeFullsizeMinimap) {
      set({ distance: 1 });
    } else {
      set({
        distance:
          useUserSettingsStore.getState().visualizationSettings.zoom.value,
      });
    }

    // TODO immutability? Use set for new camera instance?
    // Maybe use set and just pass the old reference?

    const minimapCamera = useLocalUserStore.getState().minimapCamera;
    const distance = get().distance!;

    // Compute angle such that landscape fits by default (+ distance modifier)
    const cameraAngle =
      Math.max(boundingBoxWidth, boundingBoxHeight) / 2 / distance;
    // Use same camera angle for all directions since minimap is a square
    minimapCamera.left = -cameraAngle;
    minimapCamera.right = cameraAngle;
    minimapCamera.top = cameraAngle;
    minimapCamera.bottom = -cameraAngle;

    if (
      useUserSettingsStore.getState().visualizationSettings.zoom.value != 1 &&
      !get().makeFullsizeMinimap
    ) {
      minimapCamera.position.set(
        get().userPosition.x,
        MINIMAP_HEIGHT,
        get().userPosition.z
      );
    } else {
      const center = new THREE.Vector3();
      boundingBox.getCenter(center);
      minimapCamera.position.set(center.x, MINIMAP_HEIGHT, center.z);
    }
    minimapCamera.updateProjectionMatrix();
  },

  calculateDistanceFactor: () => {
    return (
      0.2 / useUserSettingsStore.getState().visualizationSettings.zoom.value
    );
  },

  updateSphereRadius: () => {
    const distanceFactor = get().calculateDistanceFactor();
    get().minimapUserMarkers.forEach((minimapMarker) => {
      const geometry = new THREE.SphereGeometry(distanceFactor);
      minimapMarker.geometry.dispose();
      minimapMarker.geometry = geometry;
    });
  },

  /**
   * Function used for getting the minimap size and position
   * @returns The minimap size, position and border width
   */
  minimap() {
    const borderWidth = 2;
    if (get().makeFullsizeMinimap) {
      const minimapSize = 0.9;

      const minimapHeight =
        Math.min(window.innerHeight, window.innerWidth) * minimapSize;
      const minimapWidth = minimapHeight;

      const minimapX = window.innerWidth / 2 - minimapWidth / 2;
      const minimapY = window.innerHeight / 2 - minimapHeight / 2 - 20;

      return [minimapHeight, minimapWidth, minimapX, minimapY, borderWidth];
    }
    const minimapHeight =
      Math.min(window.innerHeight, window.innerWidth) / get().minimapSize;
    const minimapWidth = minimapHeight;

    const marginSettingsSymbol = 55;
    const margin = 10;
    const minimapX =
      window.innerWidth - minimapWidth - margin - marginSettingsSymbol;
    const minimapY = window.innerHeight - minimapHeight - margin;

    return [minimapHeight, minimapWidth, minimapX, minimapY, borderWidth];
  },

  setMinimapEnabled: (value: boolean) => set({ minimapEnabled: value }),
}));
