import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { AnimationMixer } from 'three';
import PingMesh from 'explorviz-frontend/src/utils/extended-reality/view-objects/vr/ping-mesh';
import { SceneLayers } from 'explorviz-frontend/src/stores/minimap-service';
import { usePingStore } from 'explorviz-frontend/src/stores/ping-store';
import { useCallback, useEffect, useRef } from 'react';

type Props = {
  color?: THREE.ColorRepresentation; // default: red
};

export function AnimatedPing({ color = '#ff0000' }: Props) {
  const mixerRef = useRef<AnimationMixer | null>(null);
  const colorRef = useRef(new THREE.Color(color));

  useEffect(() => {
    colorRef.current.set(color);
  }, [color]);
  const { scene } = useThree();

  // Container for restartable mesh
  const restartableContainerRef = useRef<THREE.Group | null>(null);

  // Single restartable mesh
  const restartableRef = useRef<PingMesh | null>(null);

  // Map for non-restartable containers
  const nonRestartableContainerRef = useRef<Map<string, THREE.Group>>(
    new Map()
  );

  // Non-restartable meshes keyed by position string
  const nonRestartableMapRef = useRef<Map<string, PingMesh>>(new Map());

  // Track timeouts so we can clean up on unmount
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Init mixer
  useEffect(() => {
    mixerRef.current = new AnimationMixer(
      undefined as unknown as THREE.Object3D
    );
    return () => {
      mixerRef.current = null;
    };
  }, []);

  // Advance animations each frame
  useFrame((_, dt) => {
    if (mixerRef.current) mixerRef.current.update(dt);
  });

  // Helpers
  const disposeMesh = useCallback((mesh: PingMesh | null) => {
    if (!mesh) return;
    try {
      mesh.stopPinging?.();
      mesh.geometry?.dispose?.();
      (mesh.material as THREE.Material)?.dispose?.();
      mesh.parent?.remove(mesh);
    } catch {
      // ignore
    }
  }, []);

  const posKey = (v: THREE.Vector3) =>
    `${v.x.toFixed(5)},${v.y.toFixed(5)},${v.z.toFixed(5)}`;

  // Core: consume the queue whenever it changes
  const queue = usePingStore((s) => s.queue);
  const shift = usePingStore((s) => s.shift);

  useEffect(() => {
    if (!queue.length || !mixerRef.current) return;

    for (const req of queue) {
      const {
        pingedObject,
        position,
        durationMs,
        replay = false,
        restartable = true,
      } = req;
      if (!(pingedObject instanceof THREE.Object3D)) {
        console.warn('Pinged object has no parent or is not a valid Object3D');
        shift();
        continue;
      }

      const container = new THREE.Group();
      container.position.copy(position);

      const mesh = new PingMesh({
        animationMixer: mixerRef.current,
        color: colorRef.current,
      });
      mesh.layers.enable(SceneLayers.Ping);
      container.add(mesh);

      if (pingedObject.type === 'InstancedMesh2') {
        pingedObject.add(container);
      } else {
        container.scale.setScalar(0.02);
        scene.add(container);
      }

      if (restartable) {
        disposeMesh(restartableRef.current);
        if (restartableContainerRef.current) {
          scene.remove(restartableContainerRef.current);
        }

        restartableContainerRef.current = container;
        restartableRef.current = mesh;

        mesh.startPinging(replay);

        const t = setTimeout(() => {
          disposeMesh(mesh);
          if (restartableRef.current === mesh) {
            restartableRef.current = null;
          }
        }, durationMs);
        timeoutsRef.current.push(t);
      } else {
        // Non-restartable: skip if one at same position is active
        const key = posKey(position);
        if (nonRestartableMapRef.current.has(key)) {
          shift();
          continue;
        }

        nonRestartableMapRef.current.set(key, mesh);
        nonRestartableContainerRef.current.set(key, container);
        mesh.startPinging();

        const t = setTimeout(() => {
          disposeMesh(mesh);
          nonRestartableMapRef.current.delete(key);
          if (nonRestartableContainerRef.current.has(key)) {
            scene.remove(nonRestartableContainerRef.current.get(key)!);
          }
          nonRestartableContainerRef.current.delete(key);
        }, durationMs);
        timeoutsRef.current.push(t);
      }

      // Consume this request
      shift();
    }
  }, [queue, shift, disposeMesh]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];
      disposeMesh(restartableRef.current);
      restartableRef.current = null;
      for (const [, mesh] of nonRestartableMapRef.current) disposeMesh(mesh);
      nonRestartableMapRef.current.clear();
    };
  }, [disposeMesh]);

  return null;
}
