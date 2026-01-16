import { CameraControls } from '@react-three/drei';
import { createPortal, useFrame, useThree } from '@react-three/fiber';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

interface LocalUserMarkerProps {
  minimapScene: THREE.Scene;
  mainCameraControls: React.RefObject<CameraControls>;
}

export default function LocalUserMarker({
  minimapScene,
  mainCameraControls,
}: LocalUserMarkerProps) {
  const markerRef = useRef<THREE.Group>(null);
  const zoom = useUserSettingsStore(
    (state) => state.visualizationSettings.minimapZoom
  );

  const minimapMode = useUserSettingsStore(
    (state) => state.visualizationSettings.minimapMode.value
  );

  const { camera: mainCamera } = useThree();

  const scratch = useMemo(
    () => ({
      userTarget: new THREE.Vector3(),
    }),
    []
  );

  useFrame(() => {
    if (!markerRef.current || !mainCameraControls.current) return;

    // Get Position
    if (minimapMode === 'camera') {
      scratch.userTarget.copy(mainCamera.position);
    } else if (minimapMode === 'target') {
      mainCameraControls.current.getTarget(scratch.userTarget);
    } else if (minimapMode === 'landscape') {
      scratch.userTarget.copy(mainCamera.position);
    } else {
      mainCameraControls.current.getTarget(scratch.userTarget);
    }

    // Ensure visibility
    markerRef.current.visible = true;

    // Update Scale (so the dot stays the same size in the minimap visualization)
    const dist = zoom.value || 1;
    const scaleFactor = 0.25 / dist;
    markerRef.current.scale.set(scaleFactor, scaleFactor, scaleFactor);

    // Update Position
    markerRef.current.position.set(
      scratch.userTarget.x,
      1.0,
      scratch.userTarget.z
    );

    markerRef.current.rotation.set(
      -Math.PI / 2,
      mainCameraControls.current.azimuthAngle,
      0,
      'YXZ'
    );
  });

  return createPortal(
    <group ref={markerRef}>
      {minimapMode !== 'target' && (
        <mesh position={[0, 0, 0]}>
          <coneGeometry args={[0.3, 0.7, 32]} />
          <meshBasicMaterial color="red" toneMapped={false} />
        </mesh>
      )}
      <mesh position={[0, -0.25, 0]}>
        <circleGeometry args={[0.3, 32]} />
        <meshBasicMaterial color="red" toneMapped={false} />
      </mesh>
    </group>,
    minimapScene as any
  );
}
