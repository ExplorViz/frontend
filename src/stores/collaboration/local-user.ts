import { useApplicationRendererStore } from 'explorviz-frontend/src/stores/application-renderer';
import { useChatStore } from 'explorviz-frontend/src/stores/chat';
import { useCollaborationSessionStore } from 'explorviz-frontend/src/stores/collaboration/collaboration-session';
import MousePing from 'explorviz-frontend/src/utils/collaboration/mouse-ping-helper';
import VRController from 'explorviz-frontend/src/utils/extended-reality/vr-controller';
import {
  EntityMesh,
  isEntityMesh,
} from 'explorviz-frontend/src/utils/extended-reality/vr-helpers/detail-info-composer';
import { getPoses } from 'explorviz-frontend/src/utils/extended-reality/vr-helpers/vr-poses';
import { pingByModelId } from 'explorviz-frontend/src/view-objects/3d/application/animated-ping-r3f';
import ApplicationObject3D from 'explorviz-frontend/src/view-objects/3d/application/application-object-3d';
import Landscape3D from 'explorviz-frontend/src/view-objects/3d/landscape/landscape-3d';
import * as THREE from 'three';
import { create } from 'zustand';
import { useMessageSenderStore } from './message-sender';

export type VisualizationMode = 'browser' | 'ar' | 'vr';

interface LocalUserState {
  userId: string;
  userName: string;
  color: THREE.Color;
  defaultCamera: THREE.PerspectiveCamera;
  minimapCamera: THREE.OrthographicCamera;
  visualizationMode: VisualizationMode;
  mousePing: MousePing;
  userGroup: THREE.Group;
  task: any;
  controller1: VRController | undefined;
  controller2: VRController | undefined;
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
  setController1: (controller1: VRController) => void;
  setController2: (controller2: VRController) => void;
  setPanoramaSphere: (panoramaSphere: THREE.Object3D) => void;
  updateControllers: (delta: number) => void;
  updateCameraAspectRatio: (width: number, height: number) => void;
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
  reset: () => void;
  _resetController: (controller: VRController | undefined) => void;
  setDefaultCamera: (camera: THREE.PerspectiveCamera) => void;
  setVisualizationMode: (mode: VisualizationMode) => void;
  setXr: (value: THREE.WebXRManager) => void;
}

export const useLocalUserStore = create<LocalUserState>((set, get) => {
  const initUserGroup = new THREE.Group();
  // Initialize camera. The default aspect ratio is not known at this point
  // and must be updated when the canvas is inserted.
  const initDefaultCamera = new THREE.PerspectiveCamera();
  // initDefaultCamera.position.set(0, 1, 2);
  initUserGroup.add(initDefaultCamera);
  const initAnimationMixer = new THREE.AnimationMixer(initUserGroup);

  return {
    userId: 'unknown',
    userName: 'You', // tracked
    color: new THREE.Color('red'), // tracked
    defaultCamera: initDefaultCamera, // tracked
    minimapCamera: new THREE.OrthographicCamera(), // tracked
    visualizationMode: 'browser', // tracked
    mousePing: new MousePing(new THREE.Color('red'), initAnimationMixer),
    userGroup: initUserGroup,
    task: undefined,
    controller1: undefined,
    controller2: undefined,
    panoramaSphere: undefined,
    animationMixer: initAnimationMixer,
    xr: undefined,
    isHost: false, // tracked

    init: () => {
      if (get().xr?.isPresenting) {
        return get().xr?.getCamera();
      } else {
        const newUserGroup = get().userGroup;
        newUserGroup.add(get().defaultCamera);
        set({ userGroup: newUserGroup });
      }
      set({
        mousePing: new MousePing(new THREE.Color('red'), get().animationMixer),
      });
      return undefined;
    },

    setDefaultCamera: (camera: THREE.PerspectiveCamera) => {
      set({ defaultCamera: camera });
    },

    setVisualizationMode: (mode: VisualizationMode) => {
      set({ visualizationMode: mode });
    },

    setXr: (value: THREE.WebXRManager) => {
      set({ xr: value });
    },

    getCamera: () => {
      const state = get();
      if (state.xr?.isPresenting) {
        return state.xr.getCamera();
      }
      return state.defaultCamera;
    },

    tick: (delta: number) => {
      const newAnimationMixer = get().animationMixer;
      newAnimationMixer.update(delta);
      set({ animationMixer: newAnimationMixer });
      get().sendPositions();
    },

    sendPositions: () => {
      const { camera, controller1, controller2 } = getPoses(
        get().getCamera(),
        get().controller1,
        get().controller2
      );
      useMessageSenderStore
        .getState()
        .sendPoseUpdate(camera, controller1, controller2);
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
      set({ userId: id });
      set({ userName: name });

      set({ color: new THREE.Color('#' + color.getHexString()) });
      set({
        mousePing: new MousePing(new THREE.Color(color), get().animationMixer),
      });
    },

    setController1: (controller1: VRController) => {
      set({ controller1: controller1 });
      const newUserGroup = get().userGroup;
      newUserGroup.add(controller1);
      set({ userGroup: newUserGroup });
    },

    setController2: (controller2: VRController) => {
      set({ controller2: controller2 });
      const newUserGroup = get().userGroup;
      newUserGroup.add(controller2);
      set({ userGroup: newUserGroup });
    },

    setPanoramaSphere: (panoramaSphere: THREE.Object3D) => {
      // Remove panorama sphere from userGroup
      const prevPanoramaSphere = get().panoramaSphere;
      if (prevPanoramaSphere) {
        get().userGroup.remove(prevPanoramaSphere);
      }

      set({ panoramaSphere: panoramaSphere }); // TODO copy object attributes instead? panoramaSphere is not @tracked.
      const newUserGroup = get().userGroup;
      newUserGroup.add(panoramaSphere);
      set({ userGroup: newUserGroup });
    },

    updateControllers: (delta: number) => {
      if (get().controller1) {
        const newController1 = get().controller1;
        newController1!.update(delta);
        set({ controller1: newController1 });
      }
      if (get().controller2) {
        const newController2 = get().controller2;
        newController2!.update(delta);
        set({ controller2: newController2 });
      }
    },

    updateCameraAspectRatio: (width: number, height: number) => {
      // this.renderer.setSize(width, height); // Should this be this.applicationRenderer?
      const newDefaultCamera = get().defaultCamera;
      newDefaultCamera.aspect = width / height;
      set({ defaultCamera: newDefaultCamera });
      get().defaultCamera.updateProjectionMatrix();
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

      if (teleportSpaceOffset) {
        const newXr = get().xr;
        newXr?.setReferenceSpace(teleportSpaceOffset);
        set({ xr: newXr });
      }
    },

    getCameraWorldPosition: () => {
      return get().getCamera().getWorldPosition(new THREE.Vector3());
    },

    getCameraHeight: () => {
      return get().userGroup.position.y;
    },

    setCameraHeight: (cameraHeight: number) => {
      // TODO non-mutating instead?
      const newUserGroup = get().userGroup;
      newUserGroup.position.y = cameraHeight;
      set({ userGroup: newUserGroup });
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
      const newUserGroup = get().userGroup;
      newUserGroup.translateOnAxis(localDirection, distance);
      set({ userGroup: newUserGroup });
    },

    /**
     * Rotates the camera around the local x and world y axis.
     */
    rotateCamera: (x: number, y: number) => {
      const xAxis = new THREE.Vector3(1, 0, 0);
      const yAxis = new THREE.Vector3(0, 1, 0);

      if (get().xr?.isPresenting) {
        const newXr = get().xr;
        newXr?.getCamera().rotateOnAxis(xAxis, x);
        newXr?.getCamera().rotateOnWorldAxis(yAxis, y);
        set({ xr: newXr });
      } else {
        const newDefaultCamera = get().defaultCamera;
        newDefaultCamera.rotateOnAxis(xAxis, x);
        newDefaultCamera.rotateOnWorldAxis(yAxis, y);
        set({ defaultCamera: newDefaultCamera });
      }
    },

    /*
     * This method is used to adapt the users view to the initial position
     */
    resetPositionAndRotation: () => {
      get().teleportToPosition(new THREE.Vector3(0, 0, 0));
      const newDefaultCamera = get().defaultCamera;
      newDefaultCamera.rotation.set(0, 0, 0);
      set({ defaultCamera: newDefaultCamera });
    },

    reset: () => {
      get().resetPositionAndRotation();

      get()._resetController(get().controller1);
      set({ controller1: undefined });

      get()._resetController(get().controller2);
      set({ controller2: undefined });
    },

    // private
    _resetController: (controller: VRController | undefined) => {
      if (!controller) return;

      const newUserGroup = get().userGroup;
      newUserGroup.remove(controller);
      set({ userGroup: newUserGroup });
      controller.children.forEach((child) => controller.remove(child));
      controller.gripSpace?.children.forEach((child) => {
        controller.gripSpace?.remove(child);
      });
      controller.removeTeleportArea();
    },
  };
});
