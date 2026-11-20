// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { useModelStore } from '../src/stores/repos/model-repository';
import { useVisualizationStore } from '../src/stores/visualization-store';
import {
  closeDistrict,
  openDistrict,
  reconcileDistrictStatesWithTree,
} from '../src/utils/city-rendering/entity-manipulation';
import { getDistricts } from '../src/utils/collaboration/districts';
import type { City, District } from '../src/utils/landscape-schemes/flat-landscape';

// Full tree:      city ─ org ─ app(b1) ─ util ─ core(b2)
// Collapsed tree: city ─ app(b1) ─ core(b2)   (org and util have no buildings)
const district = (
  id: string,
  parentDistrictId: string | undefined,
  districtIds: string[],
  buildingIds: string[] = []
): District => ({
  id,
  name: id,
  type: 'code',
  telemetryKey: id,
  parentCityId: 'city',
  parentDistrictId,
  buildingIds,
  districtIds,
});
const city = (districtIds: string[], allContainedDistrictIds: string[]): City => ({
  id: 'city',
  name: 'City',
  type: 'code',
  telemetryKey: 'city',
  buildingIds: [],
  districtIds,
  allContainedBuildingIds: [],
  allContainedDistrictIds,
});

const loadFullTree = () => {
  useModelStore.getState().setCities([city(['org'], ['org', 'app', 'util', 'core'])]);
  useModelStore
    .getState()
    .setDistricts([
      district('org', undefined, ['app']),
      district('app', 'org', ['util'], ['b1']),
      district('util', 'app', ['core']),
      district('core', 'util', [], ['b2']),
    ]);
};
const loadCollapsedTree = () => {
  useModelStore.getState().setCities([city(['app'], ['app', 'core'])]);
  useModelStore
    .getState()
    .setDistricts([district('app', undefined, ['core'], ['b1']), district('core', 'app', [], ['b2'])]);
};

const shown = () => {
  const { closedDistrictIds, hiddenDistrictIds } = getDistricts();
  return { closed: [...closedDistrictIds].sort(), hidden: [...hiddenDistrictIds].sort() };
};

beforeEach(() => {
  useVisualizationStore.setState(useVisualizationStore.getInitialState(), true);
});

describe('reconciling District states with a changed District tree', () => {
  it('closes and hides restored Districts inside a District closed while they were removed', () => {
    loadCollapsedTree();
    closeDistrict('app');

    loadFullTree();
    reconcileDistrictStatesWithTree();

    expect(shown()).toEqual({ closed: ['app', 'core', 'util'], hidden: ['core', 'util'] });
  });

  it('shows Districts that lost their closed ancestor through removal', () => {
    loadFullTree();
    closeDistrict('org');

    loadCollapsedTree();
    // As the canvas does for entities that left the landscape.
    useVisualizationStore.getState().actions.filterEntityIds(new Set(['app', 'core']));
    reconcileDistrictStatesWithTree();
    expect(shown()).toEqual({ closed: ['app', 'core'], hidden: ['core'] });

    openDistrict('app');
    loadFullTree();
    reconcileDistrictStatesWithTree();
    expect(shown()).toEqual({ closed: ['core'], hidden: [] });
  });

  it('changes nothing for a consistent state', () => {
    loadFullTree();
    closeDistrict('app');
    const before = getDistricts();

    reconcileDistrictStatesWithTree();

    expect(getDistricts()).toEqual(before);
  });
});
