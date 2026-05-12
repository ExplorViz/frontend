import { useFrame } from '@react-three/fiber';
import { useLayoutStore } from 'explorviz-frontend/src/stores/layout-store';
import { getWorldPositionOfModel } from 'explorviz-frontend/src/utils/layout-helper';
import BoxLayout from 'explorviz-frontend/src/utils/layout/box-layout';
import { myPlayer, usePlayersState } from 'playroomkit';
import { useRef } from 'react';
import * as THREE from 'three';

// This component is responsible to draw indicators, when another member of the current collaboration room is in immersive view mode.
export default function RemoteImmersiveIndicators() {
  const me = myPlayer();
  const entries = usePlayersState('immersiveMeshId');

  return (
    <group>
      {entries.map(({ player, state: buildingId }) => {
        if (me && player.id === me.id) return null;
        if (!buildingId) return null;

        const buildingLayout = useLayoutStore.getState().getLayout(buildingId);
        const buildingPosition = getWorldPositionOfModel(buildingId);
        if (!buildingLayout || !buildingPosition) return null;

        return (
          <IndicatorSphere
            key={player.id}
            buildingLayout={buildingLayout}
            buildingPosition={buildingPosition}
            color={player.getProfile()?.color?.hexString || '#000000'}
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
      scaleWrapperRef.current.scale.set(
        1 / worldScale.x,
        1 / worldScale.y,
        1 / worldScale.z
      );
    }
  });

  return (
    <group
      ref={rootGroupRef}
      position={[buildingPosition.x, roofY, buildingPosition.z]}
    >
      <group ref={scaleWrapperRef}>
        <mesh ref={sphereRef} position={[0, 1.25, 0]}>
          <sphereGeometry args={[0.25, 32, 32]} />
          <meshStandardMaterial
            color={color}
            transparent
            opacity={0.8}
            emissive={color}
            emissiveIntensity={0.6}
          />
        </mesh>

        <mesh position={[0, 0.5, 0]}>
          <cylinderGeometry args={[0.01, 0.01, 1.0]} />
          <meshBasicMaterial color={color} opacity={0.4} transparent />
        </mesh>
      </group>
    </group>
  );
}
