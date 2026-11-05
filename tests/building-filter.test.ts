import { describe, expect, it } from 'vitest';
import { ALL_BUILDING_COMPARISONS_VISIBLE } from '../src/utils/city-rendering/building-comparison-visibility';
import {
  collectFilteredBuildings,
  compileBuildingFilter,
  countRemainingBuildings,
  type BuildingFilterCriteria,
} from '../src/utils/city-rendering/building-filter';
import {
  filterFlatLandscapeByBuildingComparisonVisibility,
  pruneFlatLandscapeByRemainingBuildings,
} from '../src/utils/city-rendering/flat-landscape-filter';
import type { FlatLandscape } from '../src/utils/landscape-schemes/flat-landscape';
import { BUILDING_METRIC_NAMES } from '../src/utils/settings/settings-schemas';
import { building, city, district } from './fixtures/landscape';

const criteria = (overrides: Partial<BuildingFilterCriteria> = {}): BuildingFilterCriteria => ({
  filterMode: 'Remove',
  hiddenModelTypes: new Set(),
  hiddenLanguages: new Set(),
  inclusionExpressions: [],
  exclusionExpressions: [],
  metricThresholds: {},
  ...overrides,
});

describe('building filter pipeline', () => {
  it('keeps all buildings when no filters are active', () => {
    const filter = compileBuildingFilter(criteria());
    expect(filter.isActive).toBe(false);
    expect(filter.isFiltered(building)).toBe(false);
    expect(collectFilteredBuildings({ building }, filter)).toEqual([]);
    expect(countRemainingBuildings({ building }, filter)).toBe(1);
  });

  it.each(['Hide', 'Remove'] as const)('applies type and language removal only in Remove mode (%s)', (filterMode) => {
    const byType = compileBuildingFilter(criteria({ filterMode, hiddenModelTypes: new Set(['code']) }));
    const byLanguage = compileBuildingFilter(criteria({ filterMode, hiddenLanguages: new Set(['JAVA']) }));
    expect(byType.isFiltered(building)).toBe(filterMode === 'Remove');
    expect(byLanguage.isFiltered({ ...building, language: 'JAVA' })).toBe(filterMode === 'Remove');
    expect(byLanguage.isFiltered({ ...building, language: 'PYTHON' })).toBe(false);
  });

  it('uses inclusive metric thresholds, treating missing metrics as zero', () => {
    const key = BUILDING_METRIC_NAMES[0];
    const filter = compileBuildingFilter(criteria({ metricThresholds: { [key]: 10 } }));
    expect(filter.isFiltered(building)).toBe(true);
    expect(filter.isFiltered({ ...building, metrics: { [key]: { current: 9 } } })).toBe(true);
    expect(filter.isFiltered({ ...building, metrics: { [key]: { current: 10 } } })).toBe(false);
  });

  it('combines inclusion and exclusion, falling back to names without FQNs', () => {
    const buildings = {
      kept: { ...building, id: 'kept', fqn: 'src/App.ts' },
      excluded: { ...building, id: 'excluded', fqn: 'src/App.test.ts' },
      other: { ...building, id: 'other', name: 'README.md' },
    };
    const filter = compileBuildingFilter(
      criteria({
        inclusionExpressions: ['**/*.ts'],
        exclusionExpressions: ['**/*.test.ts'],
      })
    );
    expect(collectFilteredBuildings(buildings, filter).map((b) => b.id)).toEqual(['excluded', 'other']);
    expect(countRemainingBuildings(buildings, filter)).toBe(1);
  });
});

function landscape(): FlatLandscape {
  return structuredClone({
    landscapeToken: 'test',
    cities: {
      city: {
        ...city,
        allContainedDistrictIds: ['district', 'nested', 'empty'],
        allContainedBuildingIds: ['building', 'removed'],
        buildingIds: ['removed'],
        districtIds: ['district', 'empty', 'missing'],
      },
    },
    districts: {
      district: { ...district, buildingIds: [], districtIds: ['nested'] },
      nested: {
        ...district,
        id: 'nested',
        parentDistrictId: 'district',
        districtIds: [],
      },
      empty: { ...district, id: 'empty', buildingIds: [], districtIds: [] },
    },
    buildings: {
      building: {
        ...building,
        parentDistrictId: 'nested',
        commitComparison: 'ADDED',
      },
      removed: { ...building, id: 'removed', commitComparison: 'REMOVED' },
    },
  });
}

describe('comparison filtering and hierarchy pruning', () => {
  it('returns the original landscape when all comparison categories are visible', () => {
    const input = landscape();
    expect(filterFlatLandscapeByBuildingComparisonVisibility(input, ALL_BUILDING_COMPARISONS_VISIBLE)).toBe(input);
  });
  it('preserves ancestors of surviving buildings and leaves source data untouched', () => {
    const input = landscape();
    const original = structuredClone(input);
    const filtered = filterFlatLandscapeByBuildingComparisonVisibility(input, {
      ...ALL_BUILDING_COMPARISONS_VISIBLE,
      REMOVED: false,
    });
    expect(Object.keys(filtered.buildings)).toEqual(['building']);
    expect(Object.keys(filtered.districts)).toEqual(['district', 'nested']);
    expect(filtered.cities.city.districtIds).toEqual(['district']);
    expect(filtered.cities.city.allContainedDistrictIds).toEqual(['district', 'nested']);
    expect(filtered.cities.city.allContainedBuildingIds).toEqual(['building']);
    expect(filtered.cities.city.buildingIds).toEqual([]);
    expect(input).toEqual(original);
  });
  it('prunes empty district trees but retains city foundations', () => {
    const input = landscape();
    pruneFlatLandscapeByRemainingBuildings(input, new Set());
    expect(input.districts).toEqual({});
    expect(input.cities.city.districtIds).toEqual([]);
    expect(input.cities.city.allContainedBuildingIds).toEqual([]);
  });
});
