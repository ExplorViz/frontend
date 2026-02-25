import { CameraControls } from '@react-three/drei';
import { getWorldPositionOfModel } from 'explorviz-frontend/src/utils/layout-helper';
import { useEffect } from 'react';
import { create } from 'zustand';

interface CameraControlsState {
  cameraControlsRef: React.RefObject<CameraControls | null> | null;
  setCameraControlsRef: (ref: React.RefObject<CameraControls | null>) => void;
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

    setCameraControlsRef: (ref: React.RefObject<CameraControls | null>) => {
      set({ cameraControlsRef: ref });
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
  }, [cameraControlsRef, setCameraControlsRef]);
};
