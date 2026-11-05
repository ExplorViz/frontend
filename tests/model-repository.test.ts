import { beforeEach, describe, expect, it } from 'vitest';
import { useModelStore } from '../src/stores/repos/model-repository';
import { building, city, communication, district } from './fixtures/landscape';

beforeEach(() => useModelStore.setState(useModelStore.getInitialState(), true));
const store = () => useModelStore.getState();
const populate = () =>
  store().setAllModels({
    cities: [city],
    districts: [district],
    buildings: [building],
    buildingCommunications: [communication],
  });

describe('model repository', () => {
  it('normalizes a landscape and resolves entity types, parents and telemetry keys', () => {
    populate();
    for (const [model, type] of [
      [city, 'city'],
      [district, 'district'],
      [building, 'building'],
    ] as const) {
      expect(store().getModel(model.id)).toEqual(model);
      expect(store().getEntityType(model.id)).toBe(type);
      expect(store().getCityForModel(model.id)).toEqual(city);
      expect(store().telemetryKeyToEntityId.get(model.telemetryKey)).toBe(
        model.id
      );
    }
    expect(store().getCommunication('call')).toEqual(communication);
    expect(store().getEntityType('call')).toBe('communication');
    expect(store().getModel('missing')).toBeUndefined();
    expect(store().getCityForModel('missing')).toBeUndefined();
    expect(store().getEntityType('missing')).toBeNull();
  });

  it.each([
    ['City', city],
    ['District', district],
    ['Building', building],
  ] as const)(
    'adds, renames where supported, and removes a %s with its telemetry lookup',
    (kind, model) => {
      // Keep the three public APIs explicit so their parameter types stay checked.
      if (kind === 'City') store().addCity(model.id, city);
      if (kind === 'District') store().addDistrict(model.id, district);
      if (kind === 'Building') store().addBuilding(model.id, building);
      expect(store().getModel(model.id)).toEqual(model);
      expect(store().telemetryKeyToEntityId.get(model.telemetryKey)).toBe(
        model.id
      );
      store()[`remove${kind}`](model.id);
      expect(store().getModel(model.id)).toBeUndefined();
      expect(store().telemetryKeyToEntityId.has(model.telemetryKey)).toBe(
        false
      );
    }
  );

  it('renames cities immutably and ignores missing IDs', () => {
    populate();
    const previous = store().cities;
    store().updateCityName(city.id, 'Renamed');
    expect(store().getCity(city.id)?.name).toBe('Renamed');
    expect(previous[city.id].name).toBe('Shop');
    const state = store();
    store().updateCityName('missing', 'Ignored');
    expect(store()).toBe(state);
  });

  it('replaces a landscape without retaining old telemetry mappings', () => {
    populate();
    store().setAllModels({
      cities: [],
      districts: [],
      buildings: [],
      buildingCommunications: [],
    });
    expect(store().getAllCities()).toEqual([]);
    expect(store().getAllDistricts()).toEqual([]);
    expect(store().getAllBuildings()).toEqual([]);
    expect(store().getAllBuildingCommunications()).toEqual([]);
    expect(store().telemetryKeyToEntityId.size).toBe(0);
  });

  it('sets and clears each entity collection without clearing unrelated lookups', () => {
    store().setCities([city]);
    store().setDistricts([district]);
    store().setBuildings([building]);
    expect(store().getDistrict(district.id)).toEqual(district);
    expect(store().getBuilding(building.id)).toEqual(building);
    store().clearAllCities();
    expect(store().getAllCities()).toEqual([]);
    expect(store().telemetryKeyToEntityId.get(building.telemetryKey)).toBe(
      building.id
    );
    store().clearAllDistricts();
    store().clearAllBuildings();
    expect(store().telemetryKeyToEntityId.size).toBe(0);
  });

  it('adds, replaces, removes and clears communications', () => {
    store().addBuildingCommunication(communication.id, communication);
    expect(store().getBuildingCommunication(communication.id)).toEqual(
      communication
    );
    store().removeBuildingCommunication(communication.id);
    expect(store().getCommunication(communication.id)).toBeUndefined();
    store().setBuildingCommunications([communication]);
    expect(store().getAllBuildingCommunications()).toEqual([communication]);
    store().clearAllBuildingCommunications();
    expect(store().getAllBuildingCommunications()).toEqual([]);
    store().setAggregatedCommunications([]);
    store().removeAggregatedCommunication('missing');
    store().clearAllAggregatedCommunications();
    expect(store().getAllAggregatedCommunications()).toEqual([]);
    expect(store().getAggregatedCommunication('missing')).toBeUndefined();
  });

  it('clears all landscape data', () => {
    populate();
    store().clearAll();
    expect(store()).toEqual(useModelStore.getInitialState());
  });
});
