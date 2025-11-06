import React, { useMemo } from "react";
import * as THREE from "three";
import { Line } from "@react-three/drei";
import { useVisualizationStore } from "explorviz-frontend/src/stores/visualization-store";
import { useModelStore } from "explorviz-frontend/src/stores/repos/model-repository"; 

type ClassObj = any;
type CommunicationModel = any;
type CommunicationLayout = {
  startPoint?: THREE.Vector3;
  endPoint?: THREE.Vector3;
  startX?: number;
  startZ?: number;
  endX?: number;
  endZ?: number;
};

interface Props {
  communicationModel: CommunicationModel;
  communicationLayout?: CommunicationLayout;
  bundlingBeta?: number; 
  segments?: number;
  color?: string;
}

/**
 * Bundled communication mesh that implements the core idea of 3D-HEB:
 * - compute hierarchical path (best-effort)
 * - compute HAP projections and interpolation P'' = β * P + (1-β) * P'
 * - build CatmullRom curve through O, P'', ..., D
 *
 * Robustness: if hierarchy / HAP positions can't be found, it uses
 * equally spaced synthetic HAPs along OD with small orthogonal offsets.
 */
export default function BundledCommunicationMesh({
  communicationModel,
  communicationLayout,
  bundlingBeta = 0.8,
  segments = 60,
  color = "#00aaff",
}: Props) {
  const { setHighlightedEntity, hoveredEntityId, highlightedEntityIds } =
    useVisualizationStore((state) => ({
      setHighlightedEntity: state.actions.setHighlightedEntityId,
      hoveredEntityId: state.hoveredEntityId,
      highlightedEntityIds: state.highlightedEntityIds,
    }));

  const modelStore = useModelStore?.(); 

  // Attempt to locate class IDs on communicationModel (heuristic)
  const originId =
    communicationModel?.source ||
    communicationModel?.sourceId ||
    communicationModel?.sourceClazzId ||
    communicationModel?.from ||
    communicationModel?.caller;
  const destId =
    communicationModel?.target ||
    communicationModel?.targetId ||
    communicationModel?.destClazzId ||
    communicationModel?.to ||
    communicationModel?.callee;

  // positions from layout (fallback)
  const layoutStart =
    communicationLayout?.startPoint ??
    (communicationLayout && communicationLayout.startX !== undefined
      ? new THREE.Vector3(
          communicationLayout.startX,
          0,
          communicationLayout.startZ ?? 0
        )
      : undefined);
  const layoutEnd =
    communicationLayout?.endPoint ??
    (communicationLayout && communicationLayout.endX !== undefined
      ? new THREE.Vector3(
          communicationLayout.endX,
          0,
          communicationLayout.endZ ?? 0
        )
      : undefined);

  // Try to resolve class objects from store
  const originClass: ClassObj | undefined =
    (modelStore && originId && modelStore.getClass?.(originId)) || undefined;
  const destClass: ClassObj | undefined =
    (modelStore && destId && modelStore.getClass?.(destId)) || undefined;

  // determine world positions for O and D
  const O: THREE.Vector3 | undefined =
    (originClass && (originClass.position as THREE.Vector3)) ||
    layoutStart ||
    (originClass &&
      typeof originClass.x === "number" &&
      new THREE.Vector3(originClass.x, originClass.y ?? 0, originClass.z ?? 0)) ||
    undefined;
  const D: THREE.Vector3 | undefined =
    (destClass && (destClass.position as THREE.Vector3)) ||
    layoutEnd ||
    (destClass &&
      typeof destClass.x === "number" &&
      new THREE.Vector3(destClass.x, destClass.y ?? 0, destClass.z ?? 0)) ||
    undefined;

  // If we cannot find O or D -> nothing to draw
  const safeO = O ?? new THREE.Vector3(0, 0, 0);
  const safeD = D ?? new THREE.Vector3(0.0001, 0, 0.0001); // avoid zero-length

  // get hierarchical path: best-effort using parent pointers on Class objects
  const pathNodes = useMemo(() => {
    const originPath: ClassObj[] = [];
    const destPath: ClassObj[] = [];

    const collectPath = (cls?: ClassObj) => {
      const p: ClassObj[] = [];
      let cur = cls;
      // try several common parent fields
      while (cur) {
        p.push(cur);
        const nextId =
          cur.parentId ??
          cur.parent ??
          cur.packageId ??
          cur.parentPackageId ??
          cur.parentPackage ??
          cur.parent_class; // heuristics
        if (!nextId) break;
        // if nextId is an object (already resolved), use it; otherwise try modelStore lookup
        if (typeof nextId === "object") {
          cur = nextId;
        } else {
          const found =
            modelStore && (modelStore.getClass?.(nextId) ?? modelStore.getModel?.(nextId));
          if (found) cur = found;
          else break;
        }
      }
      return p;
    };

    if (originClass) originPath.push(...collectPath(originClass));
    if (destClass) destPath.push(...collectPath(destClass));

    // Fallback: if no hierarchy available, create synthetic nodes counting e.g. 3 levels
    if (originPath.length === 0 && originClass) originPath.push(originClass);
    if (destPath.length === 0 && destClass) destPath.push(destClass);

    return { originPath, destPath };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [originClass, destClass, modelStore, originId, destId]);

  /**
   * compute symmetric difference of node arrays (by identity)
   * path(O,D) = path(O,Root) Δ path(D,Root)
   */
  const symmetricDiffNodes = useMemo(() => {
    const { originPath, destPath } = pathNodes;
    if (!originPath.length && !destPath.length) return [];
    const originSet = new Set(originPath);
    const destSet = new Set(destPath);
    const result: ClassObj[] = [];
    originPath.forEach((n) => {
      if (!destSet.has(n)) result.push(n);
    });
    destPath.forEach((n) => {
      if (!originSet.has(n)) result.push(n);
    });
    return result;
  }, [pathNodes]);

  // Build HAP positions (using real positions if present, otherwise synthetic ones)
  const hapPositions = useMemo(() => {
    const OD = new THREE.Vector3().subVectors(safeD, safeO);
    const OD_len2 = OD.lengthSq() || 1;

    // If we have real node positions for symmetricDiffNodes, use them.
    const realPositions: THREE.Vector3[] = [];
    symmetricDiffNodes.forEach((n, idx) => {
      const p =
        (n && (n.position as THREE.Vector3)) ??
        (typeof n.x === "number" ? new THREE.Vector3(n.x, n.y ?? 0, n.z ?? 0) : null);
      if (p) realPositions.push(p.clone());
    });

    if (realPositions.length > 0) {
      // compute P' projections and P''
      const res: THREE.Vector3[] = [];
      realPositions.forEach((Ppos) => {
        const OP = new THREE.Vector3().subVectors(Ppos, safeO);
        const projFactor = OP.dot(OD) / OD_len2;
        const Pprime = safeO.clone().add(OD.clone().multiplyScalar(projFactor));
        const Pdoubleprime = Ppos.clone().multiplyScalar(bundlingBeta).add(
          Pprime.clone().multiplyScalar(1 - bundlingBeta)
        );
        res.push(Pdoubleprime);
      });
      return res;
    }

    // fallback synthetic HAPs: n evenly spaced points along OD with small orthogonal offset
    const fallbackCount = Math.min(4, Math.max(1, Math.floor((symmetricDiffNodes.length || 3))));
    const orth = new THREE.Vector3();
    // compute a perpendicular vector
    if (OD.x !== 0 || OD.z !== 0) {
      orth.set(-OD.z, 0, OD.x).normalize(); // perpendicular in XZ plane
    } else {
      orth.set(1, 0, 0);
    }
    const res: THREE.Vector3[] = [];
    for (let i = 1; i <= fallbackCount; i++) {
      const t = i / (fallbackCount + 1);
      const base = safeO.clone().lerp(safeD, t);
      // offset magnitude shrinks with β (more β -> closer to real HAPs -> smaller offset)
      const offsetMag = (1 - bundlingBeta) * 0.5 * (1 - Math.abs(0.5 - t)) * (OD.length() * 0.08);
      const offset = orth.clone().multiplyScalar(offsetMag * (i % 2 === 0 ? 1 : -1));
      base.add(offset);
      res.push(base);
    }
    return res;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symmetricDiffNodes, safeO, safeD, bundlingBeta]);

  // Build final curve points: O -> hapPositions -> D
  const curvePoints = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    pts.push(safeO.clone());

    for (const p of hapPositions) {
      pts.push(p.clone());
    }

    pts.push(safeD.clone());

    // optionally raise the curve a bit in Y to give 3D look
    // compute scale factor by OD length
    const ODlen = new THREE.Vector3().subVectors(safeD, safeO).length();
    // raise interior points proportional to OD * bundlingBeta * small factor
    const raise = Math.max(0.01, ODlen * 0.04) * bundlingBeta;

    // Only raise intermediate points
    const elevated = pts.map((p, i) => {
      if (i === 0 || i === pts.length - 1) return p;
      // smooth factor: sin-based to peak in middle
      const frac = i / (pts.length - 1);
      const factor = Math.sin(Math.PI * frac);
      return p.clone().add(new THREE.Vector3(0, raise * factor, 0));
    });

    return elevated;
  }, [hapPositions, safeO, safeD, bundlingBeta]);

  // fallback: if curvePoints degenerate, return null
  if (!curvePoints || curvePoints.length < 2) return null;

  // create smooth curve (CatmullRom) and sample points
  const curve = new THREE.CatmullRomCurve3(curvePoints, false, "catmullrom", 0.5);
  const points = curve.getPoints(segments);

  const key =
    (communicationModel && communicationModel.id) ||
    `${originId ?? "o"}-${destId ?? "d"}-${Math.round(bundlingBeta * 100)}`;

  const isHighlighted = highlightedEntityIds?.has(key) ?? false;

  const handlePointerOver = (e: any) => {
    e.stopPropagation();
    setHighlightedEntity(key);
  };

  const handlePointerOut = (e: any) => {
    e.stopPropagation();
    setHighlightedEntity(null);
  };

  const handleClick = (e: any) => {
    e.stopPropagation();
    setHighlightedEntity(key, !isHighlighted);
  };

  return (
    <Line
      key={key}
      points={points}
      color={isHighlighted ? "#ff8800" : color}
      lineWidth={Math.max(0.4, (communicationModel?.weight ?? 1) * 0.6)}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onClick={handleClick}
    />
  );
}











