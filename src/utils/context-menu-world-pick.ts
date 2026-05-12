import { defaultRaycastFilter } from 'explorviz-frontend/src/utils/raycaster';
import * as THREE from 'three';

export type ContextMenuHitEntity =
  | { kind: 'empty' }
  | { kind: 'city'; cityId: string }
  | { kind: 'district'; districtId: string }
  | { kind: 'building'; buildingId: string };

type ExplorvizCityEntityTag = { type: 'city'; entityId: string };

type PickFn = (clientX: number, clientY: number) => ContextMenuHitEntity;

let registeredPick: PickFn | null = null;

export function registerContextMenuPick(fn: PickFn): void {
  registeredPick = fn;
}

export function unregisterContextMenuPick(): void {
  registeredPick = null;
}

export function contextMenuPickAt(
  clientX: number,
  clientY: number
): ContextMenuHitEntity {
  return registeredPick?.(clientX, clientY) ?? { kind: 'empty' };
}

function isIntersectionVisible(intersection: THREE.Intersection): boolean {
  let { visible } = intersection.object;
  intersection.object.traverseAncestors((ancestor) => {
    if (!ancestor.visible) visible = false;
  });
  return visible;
}

function classifyIntersection(
  intersection: THREE.Intersection
): ContextMenuHitEntity | null {
  const obj = intersection.object;
  const instanceId = intersection.instanceId;

  if (instanceId !== undefined && instanceId !== null) {
    if (typeof obj.name === 'string' && obj.name.startsWith('Districts of ')) {
      const fn = obj.userData.explorvizResolveDistrictId as
        | ((i: number) => string | undefined)
        | undefined;
      const districtId = fn?.(instanceId);
      if (districtId) return { kind: 'district', districtId };
    }
    if (typeof obj.name === 'string' && obj.name.startsWith('Buildings-')) {
      const fn = obj.userData.explorvizResolveBuildingId as
        | ((i: number) => string | undefined)
        | undefined;
      const buildingId = fn?.(instanceId);
      if (buildingId) return { kind: 'building', buildingId };
    }
    return null;
  }

  let current: THREE.Object3D | null = obj;
  while (current) {
    const entity = current.userData.explorvizEntity as
      | ExplorvizCityEntityTag
      | undefined;
    if (entity?.type === 'city' && entity.entityId)
      return { kind: 'city', cityId: entity.entityId };
    current = current.parent;
  }

  return null;
}

export function pickContextMenuWorldHit(
  clientX: number,
  clientY: number,
  camera: THREE.Camera,
  canvas: HTMLCanvasElement,
  sceneRoots: THREE.Object3D[]
): ContextMenuHitEntity {
  const rect = canvas.getBoundingClientRect();
  // Match R3F / interaction-modifier: use CSS layout size from the canvas, not cssRect-only (avoids mismatches vs drawing buffer sizing).
  const cssW = canvas.clientWidth || rect.width;
  const cssH = canvas.clientHeight || rect.height;
  const x = ((clientX - rect.left) / cssW) * 2 - 1;
  const y = -((clientY - rect.top) / cssH) * 2 + 1;

  const raycaster = new THREE.Raycaster();
  raycaster.layers.enableAll();
  raycaster.setFromCamera(new THREE.Vector2(x, y), camera);

  const hits = raycaster.intersectObjects(sceneRoots, true);
  for (const hit of hits) {
    if (!isIntersectionVisible(hit)) continue;
    if (!defaultRaycastFilter(hit)) continue;
    const classified = classifyIntersection(hit);
    if (classified) return classified;
  }

  return { kind: 'empty' };
}
