import { CameraControls } from '@react-three/drei';
import { useImmersiveViewStore } from 'explorviz-frontend/src/stores/immersive-view-store';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface Props {
  controlsRef: React.RefObject<CameraControls | null>;
}

// This component controls the camera actions for immersive view mode.
// When the mode is entered, it moves the camera to the specified class, when it's closed,
// the old camera positions is recovered.
export default function ImmersiveCameraHandler({ controlsRef }: Props) {
  const targetPosition = useImmersiveViewStore((state) => state.targetPosition);
  const exitImmersive = useImmersiveViewStore((state) => state.exitImmersive);
  const setCameraLocked = useImmersiveViewStore(
    (state) => state.setCameraLocked
  );

  const savedCameraState = useRef<{
    position: THREE.Vector3;
    target: THREE.Vector3;
  } | null>(null);

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    // Enter immersive view mode
    if (targetPosition) {
      if (!savedCameraState.current) {
        savedCameraState.current = {
          position: new THREE.Vector3().copy(controls.camera.position),
          target: new THREE.Vector3().copy(
            controls.getTarget(new THREE.Vector3())
          ),
        };
      }

      // At first move the camera to the new target (building).
      // Look along -Z so the building name (SphereItem azimuth 0) is centered.
      controls
        .setLookAt(
          targetPosition.x,
          targetPosition.y,
          targetPosition.z,
          targetPosition.x,
          targetPosition.y,
          targetPosition.z - 0.001,
          true
        )
        .then(() => {
          // Lock CameraControls props to immersive rotate-in-place mode
          setCameraLocked(true);
        });

      // Close immersive view mode
    } else if (savedCameraState.current) {
      setCameraLocked(false);

      const { position, target } = savedCameraState.current;
      controls.setLookAt(
        position.x,
        position.y,
        position.z,
        target.x,
        target.y,
        target.z,
        true
      );

      savedCameraState.current = null;
    }
  }, [targetPosition, controlsRef, setCameraLocked]);

  // Listeners for the escape and mousewheel (to exit immersive view mode)
  useEffect(() => {
    if (!targetPosition) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') exitImmersive();
    };

    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY > 0) exitImmersive();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('wheel', handleWheel);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('wheel', handleWheel);
    };
  }, [targetPosition, exitImmersive]);

  return null;
}
