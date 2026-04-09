import { useFrame } from '@react-three/fiber';
import ApplicationData from 'explorviz-frontend/src/utils/application-data';
import BoxLayout from 'explorviz-frontend/src/utils/layout/box-layout';
import { myPlayer, PlayerState, usePlayersList, usePlayerState } from 'playroomkit';
import { useRef } from 'react';
import * as THREE from 'three';

// This component is responsible to draw indicators, when another member of the current collaboration room is in imersive view mode.
export default function RemoteImmersiveIndicators({
    layoutMap,
    applicationData
}: {
    layoutMap: Map<string, BoxLayout>,
    applicationData: ApplicationData
}) {
    const players = usePlayersList();
    const me = myPlayer();

    // Create a child component for each user. The child compnent listens for the user.
    return (
        <group>
            {players.map(player => {
                if (me && player.id === me.id) return null;
                return <PlayerIndicatorSphereHandler layoutMap={layoutMap} applicationData={applicationData} player={player} key={player.id} />
            })}
        </group>
    );
}

// This compnent listens for a single user and only the immersiveMeshId state
// It is needed for more performance (less rerenders of the react engine)
function PlayerIndicatorSphereHandler({
    layoutMap,
    applicationData,
    player
}: {
    layoutMap: Map<string, BoxLayout>,
    applicationData: ApplicationData,
    player: PlayerState
}) {
    const [classId] = usePlayerState(player, "immersiveMeshId", null);

    // When the user is not in immersive view mode, just do nothing
    if (!classId) return null;

    // Belongs the class to this city? Only then draw the marker!!
    const belongsToThisApp = applicationData.getClasses().some(c => c.id === classId);
    if (!belongsToThisApp) {
        return null;
    }

    const layout = layoutMap.get(classId);
    if (!layout) return null;

    // Render the indocator sphere
    return (
        <IndicatorSphere
            key={classId as string}
            layout={layout}
            color={player.getProfile()?.color?.hexString || '#000000'}
        />
    );

}

// This component is the actual marker (the 3D geometry of it)
function IndicatorSphere({ layout, color }: { layout: BoxLayout, color: string }) {
    const rootGroupRef = useRef<THREE.Group>(null);
    const scaleWrapperRef = useRef<THREE.Group>(null);
    const sphereRef = useRef<THREE.Mesh>(null);

    const roofY = layout.position.y + (layout.height / 2);

    useFrame(() => {
        if (!rootGroupRef.current || !scaleWrapperRef.current) return;

        const worldScale = new THREE.Vector3();
        rootGroupRef.current.getWorldScale(worldScale);

        if (worldScale.x > 0 && worldScale.y > 0 && worldScale.z > 0) {
            scaleWrapperRef.current.scale.set(1 / worldScale.x, 1 / worldScale.y, 1 / worldScale.z);
        }
    });

    return (
        <group ref={rootGroupRef} position={[layout.position.x, roofY, layout.position.z]}>
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