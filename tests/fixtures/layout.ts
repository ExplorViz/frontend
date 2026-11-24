import { expect } from 'vitest';
import type BoxLayout from '../../src/utils/layout/box-layout';
import type { Building, City, District, FlatLandscape } from '../../src/utils/landscape-schemes/flat-landscape';
import { building, city, district } from './landscape';

export type DistrictSpec = { buildings: number; districts?: Record<string, DistrictSpec> };

/** Builds a landscape of Cities whose Districts hold the given number of Buildings. */
export function createLandscape(spec: Record<string, Record<string, DistrictSpec>>): FlatLandscape {
  const landscape: FlatLandscape = { landscapeToken: 'token', cities: {}, districts: {}, buildings: {} };

  const addDistrict = (cityModel: City, id: string, districtSpec: DistrictSpec, parent?: District) => {
    const model: District = {
      ...district,
      id,
      name: id,
      parentCityId: cityModel.id,
      parentDistrictId: parent?.id,
      buildingIds: [],
      districtIds: [],
    };
    landscape.districts[id] = model;
    (parent ? parent.districtIds : cityModel.districtIds).push(id);
    cityModel.allContainedDistrictIds.push(id);

    for (let i = 0; i < districtSpec.buildings; i++) {
      const buildingModel: Building = {
        ...building,
        id: `${id}.b${i}`,
        name: `b${i}`,
        parentCityId: cityModel.id,
        parentDistrictId: id,
      };
      landscape.buildings[buildingModel.id] = buildingModel;
      model.buildingIds.push(buildingModel.id);
      cityModel.allContainedBuildingIds.push(buildingModel.id);
    }
    for (const [childId, childSpec] of Object.entries(districtSpec.districts ?? {})) {
      addDistrict(cityModel, `${id}.${childId}`, childSpec, model);
    }
  };

  for (const [cityId, districts] of Object.entries(spec)) {
    const cityModel: City = {
      ...city,
      id: cityId,
      name: cityId,
      buildingIds: [],
      districtIds: [],
      allContainedBuildingIds: [],
      allContainedDistrictIds: [],
    };
    landscape.cities[cityId] = cityModel;
    for (const [districtId, districtSpec] of Object.entries(districts)) {
      addDistrict(cityModel, `${cityId}.${districtId}`, districtSpec);
    }
  }
  return landscape;
}

export const SPEC = {
  shop: {
    checkout: { buildings: 5, districts: { payment: { buildings: 3 }, cart: { buildings: 8 } } },
    catalog: { buildings: 12 },
    search: { buildings: 2 },
  },
  billing: { invoices: { buildings: 7 }, taxes: { buildings: 1 } },
  auth: { login: { buildings: 4 } },
};

export function snapshot(layoutMap: Map<string, BoxLayout>) {
  return Object.fromEntries(
    [...layoutMap].map(([id, box]) => [id, [box.positionX, box.positionZ, box.width, box.depth]])
  );
}

/** Tolerance for comparing positions, which are sums of floating point sizes. */
const EPSILON = 1e-6;

function overlaps(a: BoxLayout, b: BoxLayout) {
  return (
    a.positionX + EPSILON < b.positionX + b.width &&
    b.positionX + EPSILON < a.positionX + a.width &&
    a.positionZ + EPSILON < b.positionZ + b.depth &&
    b.positionZ + EPSILON < a.positionZ + a.depth
  );
}

type Bounds = { x: number; z: number; width: number; depth: number };

/**
 * Siblings never overlap, and each child lies within its parent. Cities are
 * positioned in the landscape, everything inside a City relative to the City.
 */
export function expectValidNesting(landscape: FlatLandscape, layoutMap: Map<string, BoxLayout>) {
  const boundsOf = (box: BoxLayout): Bounds => ({
    x: box.positionX,
    z: box.positionZ,
    width: box.width,
    depth: box.depth,
  });
  const containers: { bounds: Bounds; childIds: string[] }[] = [
    { bounds: boundsOf(layoutMap.get('landscape')!), childIds: Object.keys(landscape.cities) },
  ];
  for (const cityModel of Object.values(landscape.cities)) {
    const cityLayout = layoutMap.get(cityModel.id)!;
    containers.push({
      bounds: { x: 0, z: 0, width: cityLayout.width, depth: cityLayout.depth },
      childIds: [...cityModel.districtIds, ...cityModel.buildingIds],
    });
  }
  for (const districtModel of Object.values(landscape.districts)) {
    const districtLayout = layoutMap.get(districtModel.id);
    if (!districtLayout) continue;
    containers.push({
      bounds: boundsOf(districtLayout),
      childIds: [...districtModel.districtIds, ...districtModel.buildingIds],
    });
  }

  for (const { bounds, childIds } of containers) {
    const children = childIds.filter((id) => layoutMap.has(id)).map((id) => layoutMap.get(id)!);
    for (const child of children) {
      expect(child.positionX).toBeGreaterThanOrEqual(bounds.x);
      expect(child.positionZ).toBeGreaterThanOrEqual(bounds.z);
      expect(child.positionX + child.width).toBeLessThanOrEqual(bounds.x + bounds.width + EPSILON);
      expect(child.positionZ + child.depth).toBeLessThanOrEqual(bounds.z + bounds.depth + EPSILON);
    }
    for (let i = 0; i < children.length; i++) {
      for (let j = i + 1; j < children.length; j++) {
        expect(overlaps(children[i], children[j])).toBe(false);
      }
    }
  }
}

export function withoutBuilding(landscape: FlatLandscape, buildingId: string): FlatLandscape {
  const copy = structuredClone(landscape);
  const districtModel = copy.districts[copy.buildings[buildingId].parentDistrictId!];
  districtModel.buildingIds = districtModel.buildingIds.filter((id) => id !== buildingId);
  delete copy.buildings[buildingId];
  return copy;
}

export function withExtraBuildings(landscape: FlatLandscape, districtId: string, count: number): FlatLandscape {
  const copy = structuredClone(landscape);
  const districtModel = copy.districts[districtId];
  for (let i = 0; i < count; i++) {
    const id = `${districtId}.new${i}`;
    copy.buildings[id] = {
      ...building,
      id,
      name: id,
      parentCityId: districtModel.parentCityId,
      parentDistrictId: districtId,
    };
    districtModel.buildingIds.push(id);
  }
  return copy;
}
