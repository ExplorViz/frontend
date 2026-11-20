import { describe, expect, it } from 'vitest';
import { collapseDistrictsWithoutBuildings } from '../src/utils/city-rendering/flat-landscape-filter';
import type { District, FlatLandscape } from '../src/utils/landscape-schemes/flat-landscape';
import { building, city, district } from './fixtures/landscape';

const d = (id: string, overrides: Partial<District>): District => ({
  ...district,
  id,
  buildingIds: [],
  districtIds: [],
  ...overrides,
});

// city -> org (empty) -> app (b1) -> util (empty) -> [core (b2), io (b3)]
const landscape = (): FlatLandscape =>
  ({
    landscapeToken: 'token',
    cities: {
      city: { ...city, districtIds: ['org'], allContainedDistrictIds: ['org', 'app', 'util', 'core', 'io'] },
    },
    districts: {
      org: d('org', { districtIds: ['app'] }),
      app: d('app', { parentDistrictId: 'org', buildingIds: ['b1'], districtIds: ['util'] }),
      util: d('util', { parentDistrictId: 'app', districtIds: ['core', 'io'] }),
      core: d('core', { parentDistrictId: 'util', buildingIds: ['b2'] }),
      io: d('io', { parentDistrictId: 'util', buildingIds: ['b3'] }),
    },
    buildings: {
      b1: { ...building, id: 'b1', parentDistrictId: 'app' },
      b2: { ...building, id: 'b2', parentDistrictId: 'core' },
      b3: { ...building, id: 'b3', parentDistrictId: 'io' },
    },
  }) as unknown as FlatLandscape;

describe('collapsing districts without buildings', () => {
  it('removes districts without direct buildings and moves inner districts up', () => {
    const flat = landscape();
    collapseDistrictsWithoutBuildings(flat);

    expect(Object.keys(flat.districts).sort()).toEqual(['app', 'core', 'io']);
    expect(flat.cities.city.districtIds).toEqual(['app']);
    expect(flat.cities.city.allContainedDistrictIds).toEqual(['app', 'core', 'io']);
    expect(flat.districts.app.parentDistrictId).toBeUndefined();
    expect(flat.districts.app.districtIds).toEqual(['core', 'io']);
    expect(flat.districts.core.parentDistrictId).toBe('app');
    expect(flat.districts.io.parentDistrictId).toBe('app');
  });

  it('keeps buildings untouched', () => {
    const flat = landscape();
    collapseDistrictsWithoutBuildings(flat);
    expect(Object.keys(flat.buildings)).toEqual(['b1', 'b2', 'b3']);
    expect(flat.buildings.b2.parentDistrictId).toBe('core');
  });
});
