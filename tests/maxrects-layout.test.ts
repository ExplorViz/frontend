// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { useLayoutStore } from '../src/stores/layout-store';
import { useUserSettingsStore } from '../src/stores/user-settings';
import type { FlatLandscape } from '../src/utils/landscape-schemes/flat-landscape';
import {
  collapseDistrictsWithoutBuildings,
  pruneFlatLandscapeByRemainingBuildings,
} from '../src/utils/city-rendering/flat-landscape-filter';
import { markFilteredFrom } from '../src/utils/city-rendering/filtered-landscapes';
import type BoxLayout from '../src/utils/layout/box-layout';
import layoutLandscapeWithMaxRects, { resetMaxRectsLayout } from '../src/utils/layout/maxrects-layouter';
import { defaultVizSettings } from '../src/utils/settings/default-settings';
import {
  createLandscape,
  type DistrictSpec,
  expectValidNesting,
  snapshot,
  SPEC,
  withExtraBuildings,
  withoutBuilding,
} from './fixtures/layout';

function layout(landscape: FlatLandscape, removedDistrictIds = new Set<string>()) {
  return layoutLandscapeWithMaxRects(landscape, removedDistrictIds);
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

  it('closes the room of a filtered District and shows the same layout again once the filter is removed', () => {
    const landscape = createLandscape(SPEC);
    const before = snapshot(layout(landscape));

    const filteredMap = layout(landscape, new Set(['shop.checkout']));
    const filtered = snapshot(filteredMap);
    expectValidNesting(landscape, filteredMap);
    expect(filtered['shop.checkout']).toBeUndefined();
    // The shop closes up
    expect(filtered.shop[2] * filtered.shop[3]).toBeLessThan(before.shop[2] * before.shop[3]);
    // Untouched Districts keep their contents as they were
    for (const id of Object.keys(before).filter((id) => id.startsWith('billing.') || id.startsWith('auth.'))) {
      expect(filtered[id]).toEqual(before[id]);
    }

    expect(snapshot(layout(landscape))).toEqual(before);
  });

  it('closes the room of filtered entities and leaves no gaps once the filter is removed', () => {
    const landscape = createLandscape(SPEC);
    const before = snapshot(layout(landscape));

    // As the Remove filter does: a pruned copy, here with the checkout's own Buildings
    // filtered, so its inner Districts move up into the shop
    const pruned = structuredClone(landscape);
    for (let i = 0; i < 5; i++) delete pruned.buildings[`shop.checkout.b${i}`];
    pruneFlatLandscapeByRemainingBuildings(pruned);
    collapseDistrictsWithoutBuildings(pruned);
    markFilteredFrom(pruned, landscape);
    expect(pruned.cities.shop.districtIds).toContain('shop.checkout.payment');

    const filteredMap = layout(pruned);
    expectValidNesting(pruned, filteredMap);
    expect(snapshot(filteredMap).shop[2] * snapshot(filteredMap).shop[3]).toBeLessThan(before.shop[2] * before.shop[3]);

    expect(snapshot(layout(landscape))).toEqual(before);
  });

  it('keeps the places of Buildings that another Timestamp lacks, as that is no filter', () => {
    const landscape = createLandscape(SPEC);
    const before = snapshot(layout(landscape));

    const otherTimestamp = withoutBuilding(landscape, 'shop.catalog.b3');
    const after = snapshot(layout(otherTimestamp));

    expect(after.shop).toEqual(before.shop);
    expect(after['shop.catalog']).toEqual(before['shop.catalog']);
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
