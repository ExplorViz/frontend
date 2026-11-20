import type { CameraControls as CameraControlsImpl } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import {
  sendPresence,
  smoothPresenceOf,
  useParticipantsKey,
  useSharesPresence,
  useShownPresences,
} from 'explorviz-frontend/src/utils/collaboration/presence';
import {
  PRESENCE_KEEPALIVE_SECONDS,
  PRESENCE_UPDATES_PER_SECOND,
} from 'explorviz-frontend/src/utils/collaboration/room-contract.generated';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

// Less a little, so that frames do not fall short of it by rounding.
const MIN_INTERVAL = 1 / PRESENCE_UPDATES_PER_SECOND - 1e-4;
/** How far ahead of the camera the look target is taken to be when the controls have none. */
const DEFAULT_LOOK_DISTANCE = 10;

/**
 * Sends your camera position and the point it looks at (the orbit target of
 * the controls) to the other Participants: at most PRESENCE_UPDATES_PER_SECOND
 * times per second when it changed, every PRESENCE_KEEPALIVE_SECONDS when it
 * did not, and at once when somebody joins.
 */
export function PresenceSender() {
  const camera = useThree((state) => state.camera);
  const controls = useThree((state) => state.controls) as Partial<Pick<CameraControlsImpl, 'getTarget'>> | null;
  const sharing = useSharesPresence();
  const participantsKey = useParticipantsKey();
  const lastSent = useRef<number[] | undefined>(undefined);
  const sinceSent = useRef(Infinity);
  const target = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    lastSent.current = undefined;
    sinceSent.current = Infinity;
  }, [sharing, participantsKey]);

  useFrame((_, delta) => {
    if (!sharing) return;
    sinceSent.current += delta;
    if (sinceSent.current < MIN_INTERVAL) return;

    if (controls?.getTarget) controls.getTarget(target);
    else camera.getWorldDirection(target).multiplyScalar(DEFAULT_LOOK_DISTANCE).add(camera.position);
    const position = camera.position.toArray();
    const lookAt = target.toArray();
    const flat = [...position, ...lookAt];
    const unchanged = lastSent.current && flat.every((value, i) => value === lastSent.current![i]);
    if (unchanged && sinceSent.current < PRESENCE_KEEPALIVE_SECONDS) return;
    sendPresence({ position, target: lookAt });
    lastSent.current = flat;
    sinceSent.current = 0;
  });

  return null;
}

/** Marks where each other Participant is and where they look, in their color. */
export default function ParticipantPresenceIndicators() {
  const presences = useShownPresences();
  return (
    <group>
      {presences.map(({ sessionId, color }) => (
        <PresenceIndicator key={sessionId} sessionId={sessionId} color={color} />
      ))}
    </group>
  );
}

/** The marker's size, relative to its distance from your camera, so it stays about as large on screen. */
const SCALE_PER_DISTANCE = 0.03;
const MIN_SCALE = 0.2;
const MAX_SCALE = 8;

// The markers are not part of the Landscape: clicks, hovers and pings go through them.
const noRaycast = () => null;

/**
 * One Participant's marker: a sphere at their camera with a cone in the
 * direction they look, a dashed line to the point they look at, and a ring
 * there. Hidden until their first Presence arrives.
 */
function PresenceIndicator({ sessionId, color }: { sessionId: string; color: string }) {
  const ownCamera = useThree((state) => state.camera);
  const headRef = useRef<THREE.Group>(null);
  const targetRef = useRef<THREE.Group>(null);
  const position = useMemo(() => new THREE.Vector3(), []);
  const target = useMemo(() => new THREE.Vector3(), []);

  // Made once; changed only through the ref, as three.js objects are.
  const line = useMemo(() => {
    const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    const material = new THREE.LineDashedMaterial({ transparent: true, opacity: 0.6, dashSize: 0.4, gapSize: 0.25 });
    return new THREE.Line(geometry, material);
  }, []);
  const lineRef = useRef<THREE.Line<THREE.BufferGeometry, THREE.LineDashedMaterial>>(null);

  useEffect(
    () => () => {
      line.geometry.dispose();
      line.material.dispose();
    },
    [line]
  );

  useFrame(() => {
    const head = headRef.current;
    const mark = targetRef.current;
    const ray = lineRef.current;
    if (!head || !mark || !ray) return;
    const known = smoothPresenceOf(sessionId, position, target);
    head.visible = known;
    mark.visible = known;
    ray.visible = known;
    if (!known) return;

    head.position.copy(position);
    if (!position.equals(target)) head.lookAt(target);
    head.scale.setScalar(scaleAt(position, ownCamera));
    mark.position.copy(target);
    mark.scale.setScalar(scaleAt(target, ownCamera));

    const points = ray.geometry.attributes.position as THREE.BufferAttribute;
    points.setXYZ(0, position.x, position.y, position.z);
    points.setXYZ(1, target.x, target.y, target.z);
    points.needsUpdate = true;
    ray.computeLineDistances();
  });

  return (
    <group name={`presence-${sessionId}`}>
      <group ref={headRef} visible={false}>
        <mesh raycast={noRaycast}>
          <sphereGeometry args={[0.3, 24, 16]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
        </mesh>
        {/* The view cone: its tip at the sphere, opening towards where they look (+Z after lookAt). */}
        <mesh raycast={noRaycast} position={[0, 0, 0.7]} rotation={[-Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.35, 0.8, 24, 1, true]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.3}
            transparent
            opacity={0.45}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      </group>
      <primitive
        ref={lineRef}
        object={line}
        raycast={noRaycast}
        frustumCulled={false}
        visible={false}
        material-color={color}
      />
      <group ref={targetRef} visible={false}>
        <mesh raycast={noRaycast}>
          <sphereGeometry args={[0.08, 12, 8]} />
          <meshBasicMaterial color={color} />
        </mesh>
        <mesh raycast={noRaycast} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.18, 0.26, 32]} />
          <meshBasicMaterial color={color} transparent opacity={0.8} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      </group>
    </group>
  );
}

function scaleAt(point: THREE.Vector3, camera: THREE.Camera) {
  return THREE.MathUtils.clamp(point.distanceTo(camera.position) * SCALE_PER_DISTANCE, MIN_SCALE, MAX_SCALE);
}
