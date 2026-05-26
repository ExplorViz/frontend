import { Sphere } from '@react-three/drei';
import { getImmersiveBackgroundSphereRadius } from 'explorviz-frontend/src/utils/city-rendering/immersive-target-position';
import { useImmersiveViewStore } from 'explorviz-frontend/src/stores/immersive-view-store';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import * as THREE from 'three';

// This component creates the sphere fopr immersive view mode

export default function ImmersiveSphere() {
    const { activeMeshId, targetPosition } = useImmersiveViewStore();

    const sphereColor = useUserSettingsStore((state) => state.visualizationSettings.sphereColor.value);
    const sphereOpacity = useUserSettingsStore((state) => state.visualizationSettings.sphereOpacity.value);
    const userRadius = useUserSettingsStore((state) => state.visualizationSettings.sphereRadius.value) || 0.7;

    if (!activeMeshId || !targetPosition) {
        return null;
    }

    const spherePosition = new THREE.Vector3(
        targetPosition.x,
        targetPosition.y,
        targetPosition.z
    );

    const backgroundRadius = getImmersiveBackgroundSphereRadius(userRadius);

    return (
        <group position={spherePosition}>
            <Sphere
                args={[backgroundRadius, 32, 32]}
                onClick={(e) => e.stopPropagation()}
                onDoubleClick={(e) => e.stopPropagation()}
                onPointerOver={(e) => e.stopPropagation()}
                onPointerOut={(e) => e.stopPropagation()}
                onPointerMove={(e) => e.stopPropagation()}
                onWheel={(e) => e.stopPropagation()}
            >
                <meshStandardMaterial
                    color={sphereColor}
                    wireframe={false}
                    transparent={true}
                    opacity={sphereOpacity}
                    side={THREE.DoubleSide}
                    depthWrite={false}
                />
            </Sphere>
        </group>
    );
}