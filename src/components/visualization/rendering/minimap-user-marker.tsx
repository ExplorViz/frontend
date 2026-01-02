import { CameraControls } from '@react-three/drei';
import { createPortal, useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';

interface LocalUserMarkerProps {
  minimapScene: THREE.Scene;
  mainCameraControls: React.RefObject<CameraControls>;
}

export default function LocalUserMarker({
  minimapScene,
  mainCameraControls,
}: LocalUserMarkerProps) {
  const markerRef = useRef<THREE.Mesh>(null);
  const zoom = useUserSettingsStore(
    (state) => state.visualizationSettings.zoom
  );

  const scratch = useMemo(
    () => ({
      userTarget: new THREE.Vector3(),
    }),
    []
  );

  useFrame(() => {
    if (!markerRef.current || !mainCameraControls.current) return;

    // Get Position
    mainCameraControls.current.getTarget(scratch.userTarget);

    // Ensure visibility
    markerRef.current.visible = true;

    // Update Scale (so the dot stays the same size in the minimap visualization)
    const dist = zoom.value || 1;
    const scaleFactor = 0.5 / dist;
    markerRef.current.scale.setScalar(scaleFactor);

    // Update Position
    markerRef.current.position.set(
      scratch.userTarget.x,
      1.0,
      scratch.userTarget.z
    );
  });

  return createPortal(
    <mesh ref={markerRef}>
      <sphereGeometry args={[0.5, 16, 16]} />
      <meshBasicMaterial color="red" toneMapped={false} />
    </mesh>,
    minimapScene
  );
}
