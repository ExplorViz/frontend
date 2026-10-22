import { CameraControls } from '@react-three/drei';
import { createPortal, useFrame } from '@react-three/fiber';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { RefObject, useRef } from 'react';
import * as THREE from 'three';

export interface MinimapMarkerAnchor {
  x: number;
  y: number;
  z: number;
  scale: number;
  /** Horizontal facing used when minimap rotation is enabled (unit XZ). */
  facingX: number;
  facingZ: number;
  rotateWithView: boolean;
}

interface LocalUserMarkerProps {
  minimapScene: THREE.Scene;
  mainCameraControls: React.RefObject<CameraControls>;
  /** Written each frame by MinimapView (height follows ortho cam). */
  markerAnchorRef: RefObject<MinimapMarkerAnchor>;
}

export default function LocalUserMarker({
  minimapScene,
  mainCameraControls,
  markerAnchorRef,
}: LocalUserMarkerProps) {
  const markerRef = useRef<THREE.Group>(null);
  const userTargetRef = useRef(new THREE.Vector3());
  const zoom = useUserSettingsStore(
    (state) => state.visualizationSettings.minimapZoom
  );

  const minimapMode = useUserSettingsStore(
    (state) => state.visualizationSettings.minimapMode.value
  );

  useFrame((state) => {
    if (!markerRef.current || !mainCameraControls.current) return;

    const userTarget = userTargetRef.current;
    const mainCamera = state.camera;

    // XZ from tracking mode (Y comes from minimap camera via markerAnchorRef)
    if (minimapMode === 'camera') {
      userTarget.copy(mainCamera.position);
    } else if (minimapMode === 'target') {
      mainCameraControls.current.getTarget(userTarget);
    } else if (minimapMode === 'landscape') {
      userTarget.copy(mainCamera.position);
    } else {
      mainCameraControls.current.getTarget(userTarget);
    }

    const anchor = markerAnchorRef.current;
    const dist = zoom.value || 1;
    // Prefer view-relative scale from MinimapView; fall back to zoom-based size
    const scaleFactor = anchor?.scale || 1.25 / (dist || 1);

    markerRef.current.visible = true;
    markerRef.current.scale.set(scaleFactor, scaleFactor, scaleFactor);
    markerRef.current.position.set(userTarget.x, anchor?.y ?? 1, userTarget.z);

    // Cone points along -Z after -π/2 X; yaw from facing so it matches minimap up
    const yaw = anchor?.rotateWithView
      ? Math.atan2(-(anchor.facingX ?? 0), -(anchor.facingZ ?? -1))
      : mainCameraControls.current.azimuthAngle;
    markerRef.current.rotation.set(-Math.PI / 2, yaw, 0, 'YXZ');
  });

  return createPortal(
    <group ref={markerRef} name="minimap-user-marker" renderOrder={999}>
      {minimapMode !== 'target' && (
        <mesh position={[0, 0, 0]} renderOrder={999}>
          <coneGeometry args={[0.3, 0.7, 32]} />
          <meshBasicMaterial
            color="red"
            toneMapped={false}
            depthTest={false}
            depthWrite={false}
          />
        </mesh>
      )}
      <mesh position={[0, -0.25, 0]} renderOrder={999}>
        <circleGeometry args={[0.3, 32]} />
        <meshBasicMaterial
          color="red"
          toneMapped={false}
          depthTest={false}
          depthWrite={false}
        />
      </mesh>
    </group>,
    minimapScene as any
  );
}
