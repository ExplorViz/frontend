import { useFrame } from '@react-three/fiber';
import { useLayoutStore } from 'explorviz-frontend/src/stores/layout-store';
import { getWorldPositionOfModel } from 'explorviz-frontend/src/utils/layout-helper';
import {
  useRemoteImmersiveViews,
  useShareImmersiveView,
} from 'explorviz-frontend/src/utils/collaboration/immersive-view-sharing';
import BoxLayout from 'explorviz-frontend/src/utils/layout/box-layout';
import { useRef } from 'react';
import * as THREE from 'three';

// Shares your immersive view with the Room and marks the buildings the other Participants view immersively.
export default function RemoteImmersiveIndicators() {
  useShareImmersiveView();
  const views = useRemoteImmersiveViews();

  return (
    <group>
      {views.map(({ sessionId, entityId, color }) => {
        const buildingLayout = useLayoutStore.getState().getLayout(entityId);
        const buildingPosition = getWorldPositionOfModel(entityId);
        if (!buildingLayout || !buildingPosition) return null;

        return (
          <IndicatorSphere
            key={sessionId}
            buildingLayout={buildingLayout}
            buildingPosition={buildingPosition}
            color={color}
          />
        );
      })}
    </group>
  );
}

// This component is the actual marker (the 3D geometry of it)
function IndicatorSphere({
  buildingLayout,
  buildingPosition,
  color,
}: {
  buildingLayout: BoxLayout;
  buildingPosition: THREE.Vector3;
  color: string;
}) {
  const rootGroupRef = useRef<THREE.Group>(null);
  const scaleWrapperRef = useRef<THREE.Group>(null);
  const sphereRef = useRef<THREE.Mesh>(null);

  const roofY = buildingPosition.y + buildingLayout.height / 2;

  useFrame(() => {
    if (!rootGroupRef.current || !scaleWrapperRef.current) return;

    const worldScale = new THREE.Vector3();
    rootGroupRef.current.getWorldScale(worldScale);

    if (worldScale.x > 0 && worldScale.y > 0 && worldScale.z > 0) {
      scaleWrapperRef.current.scale.set(1 / worldScale.x, 1 / worldScale.y, 1 / worldScale.z);
    }
  });

  return (
    <group ref={rootGroupRef} position={[buildingPosition.x, roofY, buildingPosition.z]}>
      <group ref={scaleWrapperRef}>
        <mesh ref={sphereRef} position={[0, 1.25, 0]}>
          <sphereGeometry args={[0.25, 32, 32]} />
          <meshStandardMaterial color={color} transparent opacity={0.8} emissive={color} emissiveIntensity={0.6} />
        </mesh>

        <mesh position={[0, 0.5, 0]}>
          <cylinderGeometry args={[0.01, 0.01, 1.0]} />
          <meshBasicMaterial color={color} opacity={0.4} transparent />
        </mesh>
      </group>
    </group>
  );
}
