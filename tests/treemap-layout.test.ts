// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { useUserSettingsStore } from '../src/stores/user-settings';
import { markFilteredFrom } from '../src/utils/city-rendering/filtered-landscapes';
import type { FlatLandscape } from '../src/utils/landscape-schemes/flat-landscape';
import type BoxLayout from '../src/utils/layout/box-layout';
import layoutLandscape from '../src/utils/layout/landscape-layouter';
import layoutLandscapeWithTreemap from '../src/utils/layout/treemap-layouter';
import { defaultVizSettings } from '../src/utils/settings/default-settings';
import { isSettingDependencyMet, SelectedBuildingMetric } from '../src/utils/settings/settings-schemas';
import {
  createLandscape,
  type DistrictSpec,
  expectValidNesting,
  snapshot,
  SPEC,
  withoutBuilding,
} from './fixtures/layout';

function layout(landscape: FlatLandscape, removedDistrictIds = new Set<string>()) {
  return layoutLandscapeWithTreemap(landscape, removedDistrictIds);
}

const set = (id: Parameters<ReturnType<typeof useUserSettingsStore.getState>['updateSetting']>[0], value: unknown) =>
  useUserSettingsStore.getState().updateSetting(id, value);

const ratioOf = (box: BoxLayout) => box.width / box.depth;

/** A reproducible, deeply nested landscape of Districts of very different sizes. */
function createUnevenLandscape(seed: number): FlatLandscape {
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const createDistrict = (depth: number): DistrictSpec => {
    const childCount = depth < 4 ? Math.floor(random() * 4) : 0;
    return {
      buildings: childCount > 0 && random() < 0.4 ? 0 : 1 + Math.floor(60 * random() ** 5),
      districts: Object.fromEntries(Array.from({ length: childCount }, (_, i) => [`d${i}`, createDistrict(depth + 1)])),
    };
  };
  const landscape = createLandscape(
    Object.fromEntries(
      Array.from({ length: 5 }, (_, c) => [
        `c${c}`,
        Object.fromEntries(Array.from({ length: c }, (_, i) => [`d${i}`, createDistrict(1)])),
      ])
    )
  );
  for (const building of Object.values(landscape.buildings)) {
    building.metrics = {
      [SelectedBuildingMetric.sloc]: { current: Math.floor(5 + 300 * random() ** 4) },
      [SelectedBuildingMetric.functionCount]: { current: Math.floor(20 * random() ** 3) },
    } as never;
  }
  return landscape;
}

describe('treemap layout', () => {
  beforeEach(() => {
    useUserSettingsStore.setState({ visualizationSettings: structuredClone(defaultVizSettings) });
  });

  it('lays out every entity without overlaps, following the ELK coordinate conventions', () => {
    const landscape = createLandscape(SPEC);
    const layoutMap = layout(landscape);

    expect([...layoutMap.keys()].sort()).toEqual(
      [
        'landscape',
        ...Object.keys(landscape.cities),
        ...Object.keys(landscape.districts),
        ...Object.keys(landscape.buildings),
      ].sort()
    );
    expectValidNesting(landscape, layoutMap);

    const districtHeight = defaultVizSettings.openedDistrictHeight.value;
    expect(layoutMap.get('shop')!.level).toBe(1);
    expect(layoutMap.get('shop.checkout.payment')!.level).toBe(3);
    expect(layoutMap.get('shop.checkout.payment.b0')!.positionY).toBe(districtHeight * 4);
  });

  it.each([
    ['the default settings', {}],
    ['metrics for width and depth', { buildingWidthMetric: 'sloc', buildingDepthMetric: 'functionCount' }],
    ['a wide aspect ratio', { cityAspectRatio: 2 }],
    ['a deep aspect ratio', { cityAspectRatio: 0.25 }],
    ['labels at the left', { districtLabelPlacement: 'left' }],
    ['no margins and paddings', { buildingMargin: 0, cityMargin: 0, cityPadding: 0, districtPadding: 0 }],
  ])('keeps entities apart and inside their parents with %s', (_, settings) => {
    for (const [id, value] of Object.entries(settings)) set(id as never, value);
    for (let seed = 1; seed <= 10; seed++) {
      const landscape = createUnevenLandscape(seed);
      const layoutMap = layout(landscape);
      for (const box of layoutMap.values()) {
        for (const size of [box.positionX, box.positionZ, box.width, box.depth]) expect(size).toBeTypeOf('number');
        expect(Number.isFinite(box.positionX + box.positionZ + box.width + box.depth)).toBe(true);
      }
      expectValidNesting(landscape, layoutMap);
    }
  });

  it('keeps the building margin between the entities inside a container', () => {
    const margin = defaultVizSettings.buildingMargin.value;
    const landscape = createUnevenLandscape(3);
    const layoutMap = layout(landscape);
    for (const container of [...Object.values(landscape.cities), ...Object.values(landscape.districts)]) {
      const boxes = [...container.districtIds, ...container.buildingIds]
        .map((id) => layoutMap.get(id)!)
        .filter(Boolean);
      boxes.forEach((a, index) =>
        boxes.slice(index + 1).forEach((b) => {
          const gapX = Math.max(a.positionX, b.positionX) - Math.min(a.positionX + a.width, b.positionX + b.width);
          const gapZ = Math.max(a.positionZ, b.positionZ) - Math.min(a.positionZ + a.depth, b.positionZ + b.depth);
          expect(Math.max(gapX, gapZ)).toBeGreaterThanOrEqual(margin - 1e-6);
        })
      );
    }
  });

  it('gives Buildings the footprint their metrics ask for', () => {
    set('buildingWidthMetric', SelectedBuildingMetric.sloc);
    const landscape = createUnevenLandscape(2);
    const layoutMap = layout(landscape);
    for (const building of Object.values(landscape.buildings)) {
      const box = layoutMap.get(building.id)!;
      expect(box.width).toBeCloseTo(10 + building.metrics![SelectedBuildingMetric.sloc]!.current!);
      expect(box.depth).toBe(10);
    }
  });

  it('gives Districts areas that reflect how much they contain', () => {
    const landscape = createLandscape({
      shop: { big: { buildings: 400 }, medium: { buildings: 100 }, small: { buildings: 25 } },
    });
    const layoutMap = layout(landscape);
    const areaOf = (id: string) => layoutMap.get(`shop.${id}`)!.area;
    expect(areaOf('big') / areaOf('medium')).toBeGreaterThan(3);
    expect(areaOf('big') / areaOf('medium')).toBeLessThan(5);
    expect(areaOf('medium') / areaOf('small')).toBeGreaterThan(2.5);
    expect(areaOf('medium') / areaOf('small')).toBeLessThan(5);
  });

  it('does not stretch a tiny District next to a huge one into a sliver', () => {
    const landscape = createLandscape({ shop: { huge: { buildings: 500 }, tiny: { buildings: 1 } } });
    const layoutMap = layout(landscape);
    expectValidNesting(landscape, layoutMap);
    const tiny = ratioOf(layoutMap.get('shop.tiny')!);
    expect(Math.max(tiny, 1 / tiny)).toBeLessThan(3.5);
  });

  it.each([0.5, 1, 2])('follows the preferred aspect ratio %d', (aspectRatio) => {
    set('cityAspectRatio', aspectRatio);
    const landscape = createLandscape({
      big: Object.fromEntries(Array.from({ length: 30 }, (_, i) => [`d${i}`, { buildings: (i % 7) + 1 }])),
    });
    const stretch = ratioOf(layout(landscape).get('big')!) / aspectRatio;
    expect(stretch).toBeGreaterThan(0.6);
    expect(stretch).toBeLessThan(1.7);
  });

  it('depends only on the shown landscape, not on what was shown before or the order of the data', () => {
    const landscape = createLandscape(SPEC);
    const before = snapshot(layout(landscape));
    layout(withoutBuilding(landscape, 'shop.catalog.b3'));
    expect(snapshot(layout(landscape))).toEqual(before);

    const reordered = structuredClone(landscape);
    reordered.cities = Object.fromEntries(Object.entries(reordered.cities).reverse());
    for (const container of [...Object.values(reordered.cities), ...Object.values(reordered.districts)]) {
      container.districtIds.reverse();
      container.buildingIds.reverse();
    }
    expect(snapshot(layout(reordered))).toEqual(before);
  });

  it('closes the room of removed Districts', () => {
    const landscape = createLandscape(SPEC);
    const before = layout(landscape);
    const filtered = layout(landscape, new Set(['shop.checkout']));
    expect(filtered.has('shop.checkout')).toBe(false);
    expect(filtered.has('shop.checkout.payment')).toBe(false);
    expect(filtered.get('shop')!.area).toBeLessThan(before.get('shop')!.area);
    expectValidNesting(landscape, filtered);
  });

  it('does not resize Buildings when others are filtered', () => {
    set('buildingWidthMetric', SelectedBuildingMetric.sloc);
    set('buildingMetricMapping', 'Logarithmic');
    const landscape = createUnevenLandscape(4);
    const before = layout(landscape);
    const largest = Object.values(landscape.buildings).reduce((a, b) =>
      b.metrics![SelectedBuildingMetric.sloc]!.current! > a.metrics![SelectedBuildingMetric.sloc]!.current! ? b : a
    );
    const filtered = withoutBuilding(landscape, largest.id);
    markFilteredFrom(filtered, landscape);
    const after = layout(filtered);
    for (const id of Object.keys(filtered.buildings)) {
      expect(after.get(id)!.width).toBe(before.get(id)!.width);
    }
  });

  it('gives empty Cities their minimum size and handles an empty landscape', () => {
    const landscape = createLandscape({ empty: {}, shop: { catalog: { buildings: 200 } } });
    const empty = layout(landscape).get('empty')!;
    const alone = layout(createLandscape({ empty: {} })).get('empty')!;
    expect([empty.width, empty.depth]).toEqual([alone.width, alone.depth]);

    const nothing = layout(createLandscape({})).get('landscape')!;
    expect(Number.isFinite(nothing.width) && Number.isFinite(nothing.depth)).toBe(true);
  });

  it.each(['circle', 'spiral'])('supports the %s building layout', (algorithm) => {
    set('buildingLayoutAlgorithm', algorithm);
    const landscape = createLandscape(SPEC);
    const layoutMap = layout(landscape);
    for (const id of Object.keys(landscape.cities)) expect(layoutMap.has(id)).toBe(true);
    for (const id of landscape.cities.shop.allContainedBuildingIds) expect(layoutMap.has(id)).toBe(true);
    expect(layoutMap.has('shop.catalog')).toBe(false);
  });

  it('is used when chosen as the layout engine, with its city margin setting shown', async () => {
    const landscape = createLandscape(SPEC);
    set('layoutEngine', 'treemap');
    expect(snapshot(await layoutLandscape(landscape, new Set()))).toEqual(snapshot(layout(landscape)));

    const settings = useUserSettingsStore.getState().visualizationSettings;
    expect(isSettingDependencyMet(settings.cityMargin.dependsOn, settings)).toBe(true);
    expect(isSettingDependencyMet(settings.recomputeLayout.dependsOn, settings)).toBe(false);
    expect(isSettingDependencyMet(settings.cityLayoutAlgorithm.dependsOn, settings)).toBe(false);
  });
});
