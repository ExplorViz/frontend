import { useThree } from '@react-three/fiber';
import { useSpectateUserStore } from 'explorviz-frontend/src/stores/collaboration/spectate-user';
import { useEffect } from 'react';
import * as THREE from 'three';

/**
 * Component that applies spectate camera configuration to the React Three Fiber camera.
 * This component must be placed inside a Canvas component to access the camera via useThree hook.
 */
export default function SpectateCameraController() {
  const { camera } = useThree();
  const spectateConfigurationId = useSpectateUserStore(
    (state) => state.spectateConfigurationId
  );
  const currentProjectionMatrix = useSpectateUserStore(
    (state) => state.currentProjectionMatrix
  );

  useEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) {
      return;
    }

    if (currentProjectionMatrix) {
      // Apply the custom projection matrix
      camera.projectionMatrix.fromArray(currentProjectionMatrix);
      camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
    } else if (spectateConfigurationId === 'default') {
      // Reset to default projection matrix when configuration is 'default'
      camera.updateProjectionMatrix();
    }
  }, [camera, currentProjectionMatrix, spectateConfigurationId]);

  return null;
}

