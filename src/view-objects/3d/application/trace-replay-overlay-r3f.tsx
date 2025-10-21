import { useFrame } from '@react-three/fiber';
import { useTraceReplayStore } from 'explorviz-frontend/src/stores/trace-replay';
import { getWorldPositionOfModel } from 'explorviz-frontend/src/utils/layout-helper';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';

function computeArc(start: THREE.Vector3, end: THREE.Vector3, height: number) {
  const ctrl = new THREE.Vector3(
    (start.x + end.x) / 2,
    Math.max(start.y, end.y) + height,
    (start.z + end.z) / 2
  );
  return new THREE.QuadraticBezierCurve3(start.clone(), ctrl, end.clone());
}

export default function TraceReplayOverlayR3F() {
  const { timeline, cursor, playing, eager, afterimage, tick } =
    useTraceReplayStore();
  const lineGroupRef = useRef<THREE.Group>(null);
  const spheresRef = useRef<THREE.Group>(null);

  // Advance time when playing
  useFrame((_, dt) => {
    if (playing) tick(dt);
  });

  // Recompute visuals each frame based on cursor
  useEffect(() => {
    const lineGroup = lineGroupRef.current;
    const sphereGroup = spheresRef.current;
    if (!lineGroup || !sphereGroup) return;

    // Cleanup spheres (always clear spheres each frame)
    while (sphereGroup.children.length)
      sphereGroup.remove(sphereGroup.children[0]);

    // Only clear lines if afterimage is disabled
    if (!afterimage) {
      while (lineGroup.children.length) lineGroup.remove(lineGroup.children[0]);
    }

    // Active nodes at cursor
    const active = timeline.filter((n) => n.start <= cursor && n.end >= cursor);
    // Sort to keep deterministic coloring
    active.sort(
      (a, b) => a.start - b.start || a.end - b.end || a.id.localeCompare(b.id)
    );

    // Color/height partitions
    // Stable color per span id (hash), avoid flicker
    const colorCache = new Map<string, THREE.Color>();
    const mkColorById = (id: string, idx: number, total: number) => {
      const existing = colorCache.get(id);
      if (existing) return existing;
      // simple deterministic hash to hue
      let h = 0;
      for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
      const hue = ((h % 360) / 360 + idx / Math.max(1, total)) % 1;
      const c = new THREE.Color().setHSL(hue, 1, 0.5);
      colorCache.set(id, c);
      return c;
    };

    active.forEach((node, idx) => {
      // Determine callee path target: if eager, use earliest child start as temporary end
      let endTs = node.end;
      if (eager && node.childrenIds.length > 0) {
        const childStarts = node.childrenIds
          .map((id) => timeline.find((n) => n.id === id))
          .filter(
            (child): child is NonNullable<typeof child> => child !== undefined
          )
          .map((child) => child.start);
        if (childStarts.length > 0) {
          endTs = Math.min(...childStarts);
        }
      }

      const progress = THREE.MathUtils.clamp(
        (cursor - node.start) / Math.max(1e-9, endTs - node.start),
        0,
        1
      );

      const startPos = getWorldPositionOfModel(node.sourceClassId);
      const endPos = getWorldPositionOfModel(node.targetClassId);
      if (!startPos || !endPos) return;

      const height = 1 + (idx % 3) * 0.5;
      const curve = computeArc(startPos, endPos, height);

      const pathColor = mkColorById(node.id, idx, active.length);

      // Check if line already exists for this node (for afterimage persistence)
      const existingLine = lineGroup.children.find(
        (child) => child.userData?.nodeId === node.id
      );

      if (!existingLine) {
        // Trail line (simple line segments along 0..progress)
        const points: THREE.Vector3[] = [];
        const steps = Math.max(2, Math.floor(64 * progress));
        for (let i = 0; i <= steps; i++) points.push(curve.getPoint(i / steps));
        const trailGeom = new THREE.BufferGeometry().setFromPoints(points);
        const trailMat = new THREE.LineBasicMaterial({
          color: pathColor,
          transparent: true,
          opacity: 0.2,
        });

        const trail = new THREE.Line(trailGeom, trailMat);
        trail.userData = { nodeId: node.id };
        lineGroup.add(trail);
      } else {
        // Update existing line progress
        const trail = existingLine as THREE.Line;
        const points: THREE.Vector3[] = [];
        const steps = Math.max(2, Math.floor(64 * progress));
        for (let i = 0; i <= steps; i++) points.push(curve.getPoint(i / steps));
        trail.geometry.setFromPoints(points);
      }

      // Cursor sphere
      const sphereGeom = new THREE.SphereGeometry(0.06, 12, 12);
      const sphereMat = new THREE.MeshBasicMaterial({ color: pathColor });
      const sphere = new THREE.Mesh(sphereGeom, sphereMat);
      sphere.position.copy(curve.getPoint(progress));
      spheresRef.current?.add(sphere);

      // Afterimage: if disabled and past end, remove the line
      if (!afterimage && progress >= 1) {
        const lineToRemove = lineGroup.children.find(
          (child) => child.userData?.nodeId === node.id
        );
        if (lineToRemove) {
          lineGroup.remove(lineToRemove);
        }
      }
    });
  }, [timeline, cursor, eager, afterimage]);

  // Diff highlights to avoid continuous store updates
  const prevActiveIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const nextActive = new Set(
      timeline
        .filter((n) => n.start <= cursor && n.end >= cursor)
        .flatMap((n) => [n.sourceClassId, n.targetClassId])
    );

    const prevActive = prevActiveIdsRef.current;
    let changed = false;
    if (prevActive.size !== nextActive.size) {
      changed = true;
    } else {
      for (const id of nextActive) {
        if (!prevActive.has(id)) {
          changed = true;
          break;
        }
      }
    }
    if (!changed) return;

    prevActiveIdsRef.current = nextActive;
  }, [cursor, timeline]);

  return (
    <group>
      <group ref={lineGroupRef} />
      <group ref={spheresRef} />
    </group>
  );
}
