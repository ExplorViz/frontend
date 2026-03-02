import { useFrame } from '@react-three/fiber';
import { useCollaborationSessionStore } from 'explorviz-frontend/src/stores/collaboration/collaboration-session';
import { useRemoteImmersiveStateStore } from 'explorviz-frontend/src/stores/collaboration/remote-immersive-states';
import ApplicationData from 'explorviz-frontend/src/utils/application-data'; // NEU IMPORTIERT
import { ForwardedMessage } from 'explorviz-frontend/src/utils/collaboration/web-socket-messages/receivable/forwarded';
import { USER_DISCONNECTED_EVENT } from 'explorviz-frontend/src/utils/collaboration/web-socket-messages/receivable/user-disconnect';
import { IMMERSIVE_VIEW_UPDATE_EVENT, ImmersiveViewUpdateMessage } from 'explorviz-frontend/src/utils/collaboration/web-socket-messages/sendable/immersive-view-update';
import eventEmitter from 'explorviz-frontend/src/utils/event-emitter';
import BoxLayout from 'explorviz-frontend/src/utils/layout/box-layout';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';

// This component is responsible to draw indicators, when another member of the current collaboration room is in imersive view mode.
export default function RemoteImmersiveIndicators({
    layoutMap,
    applicationData
}: {
    layoutMap: Map<string, BoxLayout>,
    applicationData: ApplicationData
}) {
    const updateState = useRemoteImmersiveStateStore((state) => state.updateState);
    const removeUser = useRemoteImmersiveStateStore((state) => state.removeUser);
    const userImmersiveStates = useRemoteImmersiveStateStore((state) => state.userImmersiveStates);
    const getColor = useCollaborationSessionStore((state) => state.getColor);

    // Whenever an immersive view mode message is received, execute this code.
    useEffect(() => {
        const handleMessage = (msg: ForwardedMessage<ImmersiveViewUpdateMessage>) => {
            const { userId, originalMessage } = msg;
            const { classId, didEnterView } = originalMessage;

            if (didEnterView) {
                updateState(userId, classId);
            } else {
                updateState(userId, null);
            }
        };

        const handleDisconnect = (msg: any) => {
            if (msg.id) removeUser(msg.id);
        };

        eventEmitter.on(IMMERSIVE_VIEW_UPDATE_EVENT, handleMessage);
        eventEmitter.on(USER_DISCONNECTED_EVENT, handleDisconnect);

        return () => {
            eventEmitter.off(IMMERSIVE_VIEW_UPDATE_EVENT, handleMessage);
            eventEmitter.off(USER_DISCONNECTED_EVENT, handleDisconnect);
        };
    }, [updateState, removeUser]);

    return (
        <group>
            {Array.from(userImmersiveStates.entries()).map(([userId, classId]) => {
                if (!classId) return null;

                // Belongs the class to this city? Only then draw the marker!!
                const belongsToThisApp = applicationData.getClasses().some(c => c.id === classId);
                if (!belongsToThisApp) {
                    return null;
                }

                const layout = layoutMap.get(classId);
                if (!layout) return null;

                return (
                    <IndicatorSphere
                        key={userId}
                        layout={layout}
                        color={getColor(userId)}
                    />
                );
            })}
        </group>
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