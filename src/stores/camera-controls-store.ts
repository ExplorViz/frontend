import { CameraControls } from '@react-three/drei';
import { SnapshotCamera } from 'explorviz-frontend/src/stores/snapshot-token';
import { getWorldPositionOfModel } from 'explorviz-frontend/src/utils/layout-helper';
import { useEffect } from 'react';
import { create } from 'zustand';
import * as THREE from 'three';

interface CameraControlsState {
  cameraControlsRef: React.RefObject<CameraControls | null> | null;
  pendingSnapshotCamera: SnapshotCamera | null;
  setCameraControlsRef: (ref: React.RefObject<CameraControls | null>) => void;
  captureSnapshotCamera: () => SnapshotCamera;
  applySnapshotCamera: (
    camera: SnapshotCamera,
    enableTransition?: boolean
  ) => boolean;
  tryApplyPendingSnapshotCamera: () => boolean;
  lookAtEntity: (entityId: string, offset?: number) => void;
  moveCameraTo: (
    position: [x: number, y: number, z: number],
    target?: [x: number, y: number, z: number],
    enableTransition?: boolean
  ) => void;
  resetCamera: () => void;
}

export const INITIAL_CAMERA_POSITION: [x: number, y: number, z: number] = [
  10, 10, 10,
];

export const useCameraControlsStore = create<CameraControlsState>(
  (set, get) => ({
    cameraControlsRef: null,
    pendingSnapshotCamera: null,

    setCameraControlsRef: (ref: React.RefObject<CameraControls | null>) => {
      set({ cameraControlsRef: ref });
    },

    captureSnapshotCamera: (): SnapshotCamera => {
      const controls = get().cameraControlsRef?.current;
      if (controls) {
        const position = new THREE.Vector3();
        const target = new THREE.Vector3();
        controls.getPosition(position);
        controls.getTarget(target);
        return {
          x: position.x,
          y: position.y,
          z: position.z,
          targetX: target.x,
          targetY: target.y,
          targetZ: target.z,
        };
      }

      return {
        x: 10,
        y: 10,
        z: 10,
        targetX: 0,
        targetY: 0,
        targetZ: 0,
      };
    },

    applySnapshotCamera: (camera, enableTransition = false) => {
      const controls = get().cameraControlsRef?.current;
      if (!controls) {
        set({ pendingSnapshotCamera: camera });
        return false;
      }

      set({ pendingSnapshotCamera: camera });

      controls.setLookAt(
        camera.x,
        camera.y,
        camera.z,
        camera.targetX ?? 0,
        camera.targetY ?? 0,
        camera.targetZ ?? 0,
        enableTransition
      );
      controls.update(0);
      return true;
    },

    tryApplyPendingSnapshotCamera: () => {
      const pending = get().pendingSnapshotCamera;
      if (!pending) {
        return false;
      }
      return get().applySnapshotCamera(pending, false);
    },

    moveCameraTo: (
      position: [x: number, y: number, z: number],
      target: [x: number, y: number, z: number] = [0, 0, 0],
      enableTransition = true
    ) => {
      const { cameraControlsRef } = get();
      if (cameraControlsRef?.current) {
        cameraControlsRef.current.setLookAt(
          position[0],
          position[1],
          position[2],
          target[0],
          target[1],
          target[2],
          enableTransition
        );
      }
    },

    lookAtEntity: (entityId: string, offset = 2) => {
      const { moveCameraTo } = get();
      const position = getWorldPositionOfModel(entityId);
      if (position) {
        moveCameraTo(
          [position.x + offset, position.y + offset, position.z + offset],
          [position.x, position.y, position.z]
        );
      }
    },

    resetCamera: () => {
      const { moveCameraTo } = get();
      moveCameraTo(INITIAL_CAMERA_POSITION, [0, 0, 0]);
    },
  })
);

// Hook to initialize camera controls
export const useCameraControls = (
  cameraControlsRef: React.RefObject<CameraControls | null>
) => {
  const { setCameraControlsRef } = useCameraControlsStore();

  useEffect(() => {
    setCameraControlsRef(cameraControlsRef);
    useCameraControlsStore.getState().tryApplyPendingSnapshotCamera();
  }, [cameraControlsRef, setCameraControlsRef]);
};
