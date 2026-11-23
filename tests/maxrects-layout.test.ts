// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { useLayoutStore } from '../src/stores/layout-store';
import { useUserSettingsStore } from '../src/stores/user-settings';
import type { Building, City, District, FlatLandscape } from '../src/utils/landscape-schemes/flat-landscape';
import type BoxLayout from '../src/utils/layout/box-layout';
import layoutLandscapeWithMaxRects, { resetMaxRectsLayout } from '../src/utils/layout/maxrects-layouter';
import { defaultVizSettings } from '../src/utils/settings/default-settings';
import { building, city, district } from './fixtures/landscape';

type DistrictSpec = { buildings: number; districts?: Record<string, DistrictSpec> };

/** Builds a landscape of Cities whose Districts hold the given number of Buildings. */
function createLandscape(spec: Record<string, Record<string, DistrictSpec>>): FlatLandscape {
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

const SPEC = {
  shop: {
    checkout: { buildings: 5, districts: { payment: { buildings: 3 }, cart: { buildings: 8 } } },
    catalog: { buildings: 12 },
    search: { buildings: 2 },
  },
  billing: { invoices: { buildings: 7 }, taxes: { buildings: 1 } },
  auth: { login: { buildings: 4 } },
};

function layout(landscape: FlatLandscape, removedDistrictIds = new Set<string>()) {
  return layoutLandscapeWithMaxRects(landscape, removedDistrictIds);
}

function snapshot(layoutMap: Map<string, BoxLayout>) {
  return Object.fromEntries(
    [...layoutMap].map(([id, box]) => [id, [box.positionX, box.positionZ, box.width, box.depth]])
  );
}

function overlaps(a: BoxLayout, b: BoxLayout) {
  return (
    a.positionX < b.positionX + b.width &&
    b.positionX < a.positionX + a.width &&
    a.positionZ < b.positionZ + b.depth &&
    b.positionZ < a.positionZ + a.depth
  );
}

type Bounds = { x: number; z: number; width: number; depth: number };

/**
 * Siblings never overlap, and each child lies within its parent. Cities are
 * positioned in the landscape, everything inside a City relative to the City.
 */
function expectValidNesting(landscape: FlatLandscape, layoutMap: Map<string, BoxLayout>) {
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
      expect(child.positionX + child.width).toBeLessThanOrEqual(bounds.x + bounds.width + 1e-6);
      expect(child.positionZ + child.depth).toBeLessThanOrEqual(bounds.z + bounds.depth + 1e-6);
    }
    for (let i = 0; i < children.length; i++) {
      for (let j = i + 1; j < children.length; j++) {
        expect(overlaps(children[i], children[j])).toBe(false);
      }
    }
  }
}

function withoutBuilding(landscape: FlatLandscape, buildingId: string): FlatLandscape {
  const copy = structuredClone(landscape);
  const districtModel = copy.districts[copy.buildings[buildingId].parentDistrictId!];
  districtModel.buildingIds = districtModel.buildingIds.filter((id) => id !== buildingId);
  delete copy.buildings[buildingId];
  return copy;
}

function withExtraBuildings(landscape: FlatLandscape, districtId: string, count: number): FlatLandscape {
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

describe('stable maxrects layout', () => {
  beforeEach(() => {
    useUserSettingsStore.setState({ visualizationSettings: structuredClone(defaultVizSettings) });
    resetMaxRectsLayout();
  });

  it('lays out every entity without overlaps, following the ELK coordinate conventions', () => {
    const landscape = createLandscape(SPEC);
    const layoutMap = layout(landscape);

    expect(layoutMap.has('landscape')).toBe(true);
    for (const id of [
      ...Object.keys(landscape.cities),
      ...Object.keys(landscape.districts),
      ...Object.keys(landscape.buildings),
    ]) {
      expect(layoutMap.has(id)).toBe(true);
    }
    expectValidNesting(landscape, layoutMap);

    const districtHeight = defaultVizSettings.openedDistrictHeight.value;
    expect(layoutMap.get('shop')!.level).toBe(1);
    expect(layoutMap.get('shop.checkout')!.level).toBe(2);
    expect(layoutMap.get('shop.checkout.payment')!.level).toBe(3);
    expect(layoutMap.get('shop.checkout.payment.b0')!.level).toBe(4);
    expect(layoutMap.get('shop.checkout.payment.b0')!.positionY).toBe(districtHeight * 4);
  });

  it('packs the landscape roughly square', () => {
    const landscape = createLandscape({
      big: Object.fromEntries(Array.from({ length: 30 }, (_, i) => [`d${i}`, { buildings: (i % 7) + 1 }])),
    });
    const cityLayout = layout(landscape).get('big')!;
    expect(cityLayout.width / cityLayout.depth).toBeGreaterThan(0.5);
    expect(cityLayout.width / cityLayout.depth).toBeLessThan(2);
  });

  it('gives the same layout for the same landscape', () => {
    const landscape = createLandscape(SPEC);
    const first = snapshot(layout(landscape));
    expect(snapshot(layout(structuredClone(landscape)))).toEqual(first);
    resetMaxRectsLayout();
    expect(snapshot(layout(landscape))).toEqual(first);
  });

  it('keeps all places when a Building disappears and gives it its place back when it returns', () => {
    const landscape = createLandscape(SPEC);
    const before = snapshot(layout(landscape));

    const reduced = snapshot(layout(withoutBuilding(landscape, 'shop.catalog.b3')));
    const { ['shop.catalog.b3']: removed, ...expectedRemainder } = before;
    expect(removed).toBeDefined();
    expect(reduced).toEqual(expectedRemainder);

    expect(snapshot(layout(landscape))).toEqual(before);
  });

  it('keeps all places when a District is filtered', () => {
    const landscape = createLandscape(SPEC);
    const before = snapshot(layout(landscape));

    const filtered = snapshot(layout(landscape, new Set(['shop.checkout'])));
    for (const [id, box] of Object.entries(filtered)) {
      expect(box).toEqual(before[id]);
    }
    expect(filtered['shop.checkout']).toBeUndefined();
  });

  it('lets a District grow where it is and keeps the arrangement around it', () => {
    const landscape = createLandscape(SPEC);
    const before = snapshot(layout(landscape));

    const grown = withExtraBuildings(landscape, 'shop.catalog', 6);
    const after = snapshot(layout(grown));
    expectValidNesting(grown, layout(grown));

    // The catalog keeps its position, and so do its Buildings
    expect(after['shop.catalog'].slice(0, 2)).toEqual(before['shop.catalog'].slice(0, 2));
    for (let i = 0; i < 12; i++) {
      expect(after[`shop.catalog.b${i}`]).toEqual(before[`shop.catalog.b${i}`]);
    }

    // Other Cities may shift to make room, but keep their size and contents
    for (const cityId of ['billing', 'auth']) {
      expect(after[cityId].slice(2)).toEqual(before[cityId].slice(2));
    }
    for (const id of Object.keys(before).filter((id) => id.startsWith('billing.') || id.startsWith('auth.'))) {
      expect(after[id]).toEqual(before[id]);
    }
  });

  it('stays as compact as a fresh layout and keeps Cities in order while the landscape grows commit by commit', () => {
    const finalSpec: Record<string, Record<string, DistrictSpec>> = {};
    let seed = 3;
    const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let c = 0; c < 4; c++) {
      finalSpec[`c${c}`] = {};
      for (let d = 0; d < 3 + Math.floor(random() * 5); d++) {
        const districts: Record<string, DistrictSpec> = {};
        for (let s = 0; s < Math.floor(random() * 3); s++)
          districts[`s${s}`] = { buildings: 1 + Math.floor(random() * 8) };
        finalSpec[`c${c}`][`d${d}`] = { buildings: 2 + Math.floor(random() * 15), districts };
      }
    }
    // Each commit shows a growing share of every District's Buildings
    const scale = (spec: DistrictSpec, share: number): DistrictSpec => ({
      buildings: Math.ceil(spec.buildings * share),
      districts: Object.fromEntries(
        Object.entries(spec.districts ?? {}).map(([id, child]) => [id, scale(child, share)])
      ),
    });
    const atCommit = (share: number) =>
      createLandscape(
        Object.fromEntries(
          Object.entries(finalSpec).map(([cityId, districts]) => [
            cityId,
            Object.fromEntries(Object.entries(districts).map(([id, spec]) => [id, scale(spec, share)])),
          ])
        )
      );

    const cityIds = Object.keys(finalSpec);
    const relativeOrder = (layoutMap: Map<string, BoxLayout>) =>
      cityIds.flatMap((a) =>
        cityIds.map((b) => {
          const boxA = layoutMap.get(a)!;
          const boxB = layoutMap.get(b)!;
          return [boxA.positionX + boxA.width <= boxB.positionX, boxA.positionZ + boxA.depth <= boxB.positionZ];
        })
      );

    const firstLayout = layout(atCommit(0.1));
    let stable = firstLayout;
    for (let commit = 2; commit <= 10; commit++) {
      const landscape = atCommit(commit / 10);
      stable = layout(landscape);
      expectValidNesting(landscape, stable);
    }
    // Cities that were next to or above each other still are
    const initialOrder = relativeOrder(firstLayout).flat();
    relativeOrder(stable)
      .flat()
      .forEach((separated, index) => {
        if (initialOrder[index]) expect(separated).toBe(true);
      });

    resetMaxRectsLayout();
    const fresh = layout(atCommit(1)).get('landscape')!;
    const stableLandscape = stable.get('landscape')!;
    expect(stableLandscape.width * stableLandscape.depth).toBeLessThan(1.5 * fresh.width * fresh.depth);
  });

  it('packs afresh when the user asks for it', () => {
    const landscape = createLandscape(SPEC);
    layout(landscape);
    const reduced = withoutBuilding(landscape, 'shop.catalog.b3');
    const stable = layout(reduced);

    useLayoutStore.getState().recomputeLayout();
    const recomputed = layout(reduced);
    expectValidNesting(reduced, recomputed);

    resetMaxRectsLayout();
    expect(snapshot(recomputed)).toEqual(snapshot(layout(reduced)));
    expect(recomputed.get('shop.catalog')!.width * recomputed.get('shop.catalog')!.depth).toBeLessThanOrEqual(
      stable.get('shop.catalog')!.width * stable.get('shop.catalog')!.depth
    );
  });

  it('packs afresh when a setting changes the size of entities', () => {
    const landscape = createLandscape(SPEC);
    layout(landscape);
    layout(withoutBuilding(landscape, 'shop.catalog.b3'));

    useUserSettingsStore.getState().updateSetting('buildingMargin', 5);
    const afterSettingChange = snapshot(layout(landscape));

    resetMaxRectsLayout();
    expect(afterSettingChange).toEqual(snapshot(layout(landscape)));
  });
});
