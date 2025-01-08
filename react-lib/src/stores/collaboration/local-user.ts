import { createStore } from "zustand/vanilla";

import * as THREE from "three";

export type VisualizationMode = "browser" | "ar" | "vr";

interface LocalUserState {
  userId: string;
  userName: string;
  color: THREE.Color;
  defaultCamera: THREE.PerspectiveCamera;
  minimapCamera: THREE.OrthographicCamera;
  visualizationMode: VisualizationMode;
  // mousePing: MousePing;
  userGroup: THREE.Group;
  task: any;
  // controller1: VRController | undefined;
  // controller2: VRController | undefined;
  panoramaSphere: THREE.Object3D | undefined;
  animationMixer: THREE.AnimationMixer;
  xr?: THREE.WebXRManager;
  isHost: boolean;
  getCamera: () => THREE.PerspectiveCamera;
  tick: (delta: number) => void;
  sendPositions: () => void;
  connected: ({
    id,
    name,
    color,
  }: {
    id: string;
    name: string;
    color: THREE.Color;
  }) => void;
  // setController1: (controller1: VRController) => void;
  // setController2: (controller2: VRController) => void;
  setPanoramaSphere: (panoramaSphere: THREE.Object3D) => void;
  updateControllers: (delta: number) => void;
  updateCameraAspectRatio: (width: number, height: number) => void;
  pingByModelId: (
    modelId: string,
    appId: string,
    options?: { durationInMs?: number; nonrestartable?: boolean }
  ) => void;
  // pingNonRestartable: (
  //   obj: EntityMesh | null,
  //   pingPosition: THREE.Vector3,
  //   durationInMs: number
  // ) => void;
  ping: (
    obj: THREE.Object3D,
    pingPosition: THREE.Vector3,
    durationInMs: number
  ) => void;
  pingReplay: (
    userId: string,
    modelId: string,
    position: number[],
    durationInMs: number,
    replay: boolean
  ) => void;
  teleportToPosition: (position: THREE.Vector3) => void;
  getCameraWorldPosition: () => THREE.Vector3;
  getCameraHeight: () => number;
  setCameraHeight: (cameraHeight: number) => void;
  moveInCameraDirection: (
    direction: THREE.Vector3,
    {
      enableX,
      enableY,
      enableZ,
    }: { enableX?: boolean; enableY?: boolean; enableZ?: boolean }
  ) => void;
  rotateCamera: (x: number, y: number) => void;
  resetPositionAndRotation: () => void;
  // reset: () => void;
  // resetController: (controller: VRController | undefined) => void;
}

export const useLocalUserStore = createStore<LocalUserState>((set, get) => {
  const initUserGroup = new THREE.Group();
  // Initialize camera. The default aspect ratio is not known at this point
  // and must be updated when the canvas is inserted.
  const initDefaultCamera = new THREE.PerspectiveCamera();
  // initDefaultCamera.position.set(0, 1, 2);
  initUserGroup.add(initDefaultCamera);
  const initAnimationMixer = new THREE.AnimationMixer(initUserGroup);

  return {
    userId: "unknown",
    userName: "You",
    color: new THREE.Color("red"),
    defaultCamera: initDefaultCamera,
    minimapCamera: new THREE.OrthographicCamera(),
    visualizationMode: "browser",
    // mousePing: new MousePing(new THREE.Color('red'), initAnimationMixer),
    userGroup: initUserGroup,
    task: undefined,
    // controller1: undefined,
    // controller2: undefined,
    panoramaSphere: undefined,
    animationMixer: initAnimationMixer,
    xr: undefined,
    isHost: false,

    getCamera: () => {
      const state = get();
      if (state.xr?.isPresenting) {
        return state.xr.getCamera();
      }
      return state.defaultCamera;
    },

    tick: (delta: number) => {
      get().animationMixer.update(delta);
      get().sendPositions();
    },

    sendPositions: () => {
      // TODO implement me!
    },

    connected: ({
      id,
      name,
      color,
    }: {
      id: string;
      name: string;
      color: THREE.Color;
    }) => {
      // TODO implement me!
    },

    // setController1: (controller1: VRController) => {
    //   // TODO implement me!
    // }

    // setController2: (controller2: VRController) => {
    //   // TODO implement me!
    // }

    setPanoramaSphere: (panoramaSphere: THREE.Object3D) => {
      // Remove panorama sphere from userGroup
      const prevPanoramaSphere = get().panoramaSphere;
      if (prevPanoramaSphere) {
        get().userGroup.remove(prevPanoramaSphere);
      }

      set({ panoramaSphere: panoramaSphere }); // TODO copy object attributes instead? panoramaSphere is not @tracked.
      get().userGroup.add(panoramaSphere);
    },

    updateControllers: (delta: number) => {
      // TODO implement me!
    },

    updateCameraAspectRatio: (width: number, height: number) => {
      // TODO implement me!
    },

    pingByModelId: (
      modelId: string,
      appId: string,
      options?: { durationInMs?: number; nonrestartable?: boolean }
    ) => {
      // TODO implement me!
    },

    // pingNonRestartable: (
    //   obj: EntityMesh | null,
    //   pingPosition: THREE.Vector3,
    //   durationInMs: number = 5000
    // ) => {},

    ping: (
      obj: THREE.Object3D,
      pingPosition: THREE.Vector3,
      durationInMs: number = 5000
    ) => {
      // TODO implement me!
    },

    pingReplay: (
      userId: string,
      modelId: string,
      position: number[],
      durationInMs: number,
      replay: boolean = true
    ) => {
      // TODO implement me!
    },

    /*
     *  This method is used to adapt the users view to
     *  the new position
     */
    teleportToPosition: (position: THREE.Vector3) => {
      const worldPos = get()
        .xr?.getCamera()
        .getWorldPosition(new THREE.Vector3());

      if (!(worldPos?.x || worldPos?.z)) {
        return;
      }

      const offsetPosition = {
        x: position.x - worldPos.x,
        y: position.y,
        z: position.z - worldPos.z,
        w: 1,
      };
      const offsetRotation = new THREE.Quaternion();
      const transform = new XRRigidTransform(offsetPosition, offsetRotation)
        .inverse;
      const teleportSpaceOffset = get()
        .xr?.getReferenceSpace()
        ?.getOffsetReferenceSpace(transform);

      if (teleportSpaceOffset) get().xr?.setReferenceSpace(teleportSpaceOffset);
    },

    getCameraWorldPosition: () => {
      return get().getCamera().getWorldPosition(new THREE.Vector3());
    },

    getCameraHeight: () => {
      return get().userGroup.position.y;
    },

    setCameraHeight: (cameraHeight: number) => {
      // TODO non-mutating instead?
      get().userGroup.position.y = cameraHeight;
    },

    /**
     * Moves the user group in the given direction relative to the default camera.
     */
    moveInCameraDirection: (
      direction: THREE.Vector3,
      {
        enableX = true,
        enableY = true,
        enableZ = true,
      }: { enableX?: boolean; enableY?: boolean; enableZ?: boolean }
    ) => {
      // Convert direction from the camera's object space to world coordinates.
      const distance = direction.length();
      const worldDirection = direction
        .clone()
        .normalize()
        .transformDirection(get().defaultCamera.matrix);

      // Remove disabled components.
      if (!enableX) worldDirection.x = 0;
      if (!enableY) worldDirection.y = 0;
      if (!enableZ) worldDirection.z = 0;

      // Convert the direction back to object space before applying the translation.
      const localDirection = worldDirection
        .normalize()
        .transformDirection(get().userGroup.matrix.clone().invert());
      get().userGroup.translateOnAxis(localDirection, distance);
    },

    /**
     * Rotates the camera around the local x and world y axis.
     */
    rotateCamera: (x: number, y: number) => {
      const xAxis = new THREE.Vector3(1, 0, 0);
      const yAxis = new THREE.Vector3(0, 1, 0);
      get().getCamera().rotateOnAxis(xAxis, x);
      get().getCamera().rotateOnWorldAxis(yAxis, y);
    },

    /*
     * This method is used to adapt the users view to the initial position
     */
    resetPositionAndRotation: () => {
      get().teleportToPosition(new THREE.Vector3(0, 0, 0));
      get().defaultCamera.rotation.set(0, 0, 0);
    },

    // TODO: Check if this works with get() or if we need
    // two methods (one for each controller)
    // reset: () => {
    //   get().resetPositionAndRotation();

    //   get().resetController(get().controller1);
    //   set({ controller1: undefined });

    //   get().resetController(get().controller2);
    //   set({ controller2: undefined });
    // },

    // TODO private
    // resetController: (controller: VRController | undefined) => {
    //   if (!controller) return;

    //   get().userGroup.remove(controller);
    //   controller.children.forEach((child) => controller.remove(child));
    //   controller.gripSpace?.children.forEach((child) => {
    //     controller.gripSpace?.remove(child);
    //   });
    //   controller.removeTeleportArea();
    // },
  };
});
