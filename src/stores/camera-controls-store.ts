import { create } from 'zustand';
import { CameraControls } from '@react-three/drei';
import { useEffect } from 'react';

interface CameraControlsState {
  cameraControlsRef: React.RefObject<CameraControls | null> | null;
  setCameraControlsRef: (ref: React.RefObject<CameraControls | null>) => void;
  moveCameraTo: (
    position: [x: number, y: number, z: number],
    target?: [x: number, y: number, z: number],
    enableTransition?: boolean
  ) => void;
  resetCamera: () => void;
}

const INITIAL_CAMERA_POSITION: [x: number, y: number, z: number] = [10, 10, 10];

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
        cameraControlsRef.current.moveTo(
          position[0],
          position[1],
          position[2],
          enableTransition
        );
        cameraControlsRef.current.setTarget(
          target[0],
          target[1],
          target[2],
          enableTransition
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
