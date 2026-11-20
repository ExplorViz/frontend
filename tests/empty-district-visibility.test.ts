// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { useModelStore } from '../src/stores/repos/model-repository';
import { type EntityVisibilityContext, isDistrictVisible } from '../src/utils/city-rendering/entity-visibility';
import type { Building, District } from '../src/utils/landscape-schemes/flat-landscape';
import { building, city, district } from './fixtures/landscape';

// outer (no buildings) -> middle (no buildings) -> inner (one building)
const outer: District = { ...district, id: 'outer', buildingIds: [], districtIds: ['middle'] };
const middle: District = {
  ...district,
  id: 'middle',
  parentDistrictId: 'outer',
  buildingIds: [],
  districtIds: ['inner'],
};
const inner: District = { ...district, id: 'inner', parentDistrictId: 'middle', buildingIds: ['b'], districtIds: [] };
const innerBuilding: Building = { ...building, id: 'b', parentCityId: city.id, parentDistrictId: 'inner' };

const context = (overrides: Partial<EntityVisibilityContext> = {}): EntityVisibilityContext => ({
  closedDistrictIds: new Set(),
  hiddenDistrictIds: new Set(),
  removedDistrictIds: new Set(),
  hiddenBuildingIds: new Set(),
  hiddenModelTypes: new Set(),
  hiddenLanguages: new Set(),
  hideEmptyDistricts: false,
  evoConfig: { renderStatic: true, renderDynamic: true, renderOnlyDifferences: false },
  isDiffMode: false,
  ...overrides,
});

const animation = { totalCount: 0, buildingVisualStates: new Map() };

describe('hiding districts without buildings', () => {
  beforeEach(() => {
    useModelStore.getState().setDistricts([outer, middle, inner]);
    useModelStore.getState().setBuildings([innerBuilding]);
  });

  it('shows every district when the option is off', () => {
    const ctx = context();
    expect(['outer', 'middle', 'inner'].map((id) => isDistrictVisible(id, ctx, animation))).toEqual([true, true, true]);
  });

  it('hides districts without direct buildings but keeps inner districts', () => {
    const ctx = context({ hideEmptyDistricts: true });
    expect(['outer', 'middle', 'inner'].map((id) => isDistrictVisible(id, ctx, animation))).toEqual([
      false,
      false,
      true,
    ]);
  });

  it('treats a district whose direct buildings are all hidden as empty', () => {
    const ctx = context({ hideEmptyDistricts: true, hiddenBuildingIds: new Set(['b']) });
    expect(isDistrictVisible('inner', ctx, animation)).toBe(false);
  });

  it('keeps closed districts visible since they represent their subtree', () => {
    const ctx = context({ hideEmptyDistricts: true, closedDistrictIds: new Set(['outer']) });
    expect(isDistrictVisible('outer', ctx, animation)).toBe(true);
  });
});
