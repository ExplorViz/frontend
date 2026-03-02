import { CameraControls } from '@react-three/drei';
import { useImmersiveViewStore } from 'explorviz-frontend/src/stores/immersive-view-store';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface Props {
    controlsRef: React.RefObject<CameraControls | null>;
}

// This component controls the camera actions for immersive view mode.
// When the mode is entered, it moves thec amera to the specified class, when it's closed,
// the old camera positions is recovered.
export default function ImmersiveCameraHandler({ controlsRef }: Props) {
    const targetPosition = useImmersiveViewStore((state) => state.targetPosition);
    const exitImmersive = useImmersiveViewStore((state) => state.exitImmersive);

    const savedCameraState = useRef<{ position: THREE.Vector3; target: THREE.Vector3 } | null>(null);

    const savedControlSettings = useRef<{
        minDistance: number;
        maxDistance: number;
        mouseButtons: { left: number; middle: number; right: number; wheel: number };
    } | null>(null);

    useEffect(() => {
        const controls = controlsRef.current;
        if (!controls) return;

        // ENter immersive view mode
        if (targetPosition) {
            if (!savedControlSettings.current) {
                savedControlSettings.current = {
                    minDistance: controls.minDistance,
                    maxDistance: controls.maxDistance,
                    mouseButtons: { ...controls.mouseButtons },
                };
            }

            if (!savedCameraState.current) {
                savedCameraState.current = {
                    position: new THREE.Vector3().copy(controls.camera.position),
                    target: new THREE.Vector3().copy(controls.getTarget(new THREE.Vector3())),
                };
            }

            // The camera settings during the immersive view mode
            controls.minDistance = 0;
            controls.maxDistance = 0.01;
            controls.mouseButtons.left = 1;   // Rotate
            controls.mouseButtons.right = 1;  // Rotate
            controls.mouseButtons.middle = 0; // Disable
            controls.mouseButtons.wheel = 0;  // Disable

            controls.setLookAt(
                targetPosition.x, targetPosition.y, targetPosition.z,
                targetPosition.x + 0.001, targetPosition.y, targetPosition.z,
                true
            );

            // Close immersive view mode
        } else if (savedCameraState.current && savedControlSettings.current) {

            const { position, target } = savedCameraState.current;
            controls.setLookAt(
                position.x, position.y, position.z,
                target.x, target.y, target.z,
                true
            );

            // Recover tthe original values
            const orig = savedControlSettings.current;
            controls.minDistance = orig.minDistance;
            controls.maxDistance = orig.maxDistance;
            controls.mouseButtons.left = orig.mouseButtons.left as any;
            controls.mouseButtons.right = orig.mouseButtons.right as any;
            controls.mouseButtons.middle = orig.mouseButtons.middle as any;
            controls.mouseButtons.wheel = orig.mouseButtons.wheel as any;

            savedCameraState.current = null;
            savedControlSettings.current = null;
        }
    }, [targetPosition, controlsRef]);

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