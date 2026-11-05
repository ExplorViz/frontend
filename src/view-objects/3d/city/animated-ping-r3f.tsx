import { useFrame, useThree } from '@react-three/fiber';
import { registerPingRuntime, unregisterPingRuntime } from 'explorviz-frontend/src/view-objects/3d/city/ping-animation';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { AnimationMixer } from 'three';

// #region React Component

/**
 * Component that initializes and manages the ping animation system.
 * Must be mounted in the React Three Fiber scene for pings to work.
 */
export function AnimatedPing() {
  const mixerRef = useRef<AnimationMixer | null>(null);
  const { scene } = useThree();

  // Initialize mixer and set global references
  useEffect(() => {
    mixerRef.current = new AnimationMixer(undefined as unknown as THREE.Object3D);
    registerPingRuntime(mixerRef.current, scene);

    return () => {
      // Cleanup on unmount
      unregisterPingRuntime();
      mixerRef.current = null;
    };
  }, [scene]);

  // Advance animation mixer each frame
  useFrame((_, dt) => {
    if (mixerRef.current) {
      mixerRef.current.update(dt);
    }
  });

  return null;
}

// #endregion React Component
