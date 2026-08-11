import AggregatedCommunication from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/aggregated-communication';
import { Comm } from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/communication';
import {
  Building,
  City,
  District,
} from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import { create } from 'zustand';

export type EntityType =
  | 'city'
  | 'district'
  | 'building'
  | 'communication'
  | null;

interface ModelRepositoryState {
  cities: Record<string, City>;
  districts: Record<string, District>;
  buildings: Record<string, Building>;
  buildingCommunications: Record<string, Comm>;
  aggregatedCommunications: Record<string, AggregatedCommunication>;
  telemetryKeyToEntityId: Map<string | undefined, string>;

  // Getter functions for individual models
  getCity: (id: string) => City | undefined;
  getCityForModel: (id: string) => City | undefined;
  getDistrict: (id: string) => District | undefined;
  getBuilding: (id: string) => Building | undefined;
  getBuildingCommunication: (id: string) => Comm | undefined;
  getAggregatedCommunication: (
    id: string
  ) => AggregatedCommunication | undefined;
  getCommunication: (id: string) => Comm | AggregatedCommunication | undefined;
  getModel: (
    id: string
  ) => City | District | Building | AggregatedCommunication | undefined;
  getEntityType: (id: string) => EntityType;

  // Getter functions for all models
  getAllCities: () => City[];
  getAllDistricts: () => District[];
  getAllBuildings: () => Building[];
  getAllBuildingCommunications: () => Comm[];
  getAllAggregatedCommunications: () => AggregatedCommunication[];

  // Actions for adding individual models
  addCity: (id: string, city: City) => void;
  addDistrict: (id: string, district: District) => void;
  addBuilding: (id: string, building: Building) => void;
  addBuildingCommunication: (id: string, communication: Comm) => void;

  // Actions for setting (overwriting) models
  setCities: (cities: City[]) => void;
  setDistricts: (districts: District[]) => void;
  setBuildings: (buildings: Building[]) => void;
  setBuildingCommunications: (communications: Comm[]) => void;
  setAggregatedCommunications: (
    communications: AggregatedCommunication[]
  ) => void;

  setAllModels: (data: {
    cities: City[];
    districts: District[];
    buildings: Building[];
    buildingCommunications: Comm[];
  }) => void;

  // Actions for removing individual models
  removeCity: (id: string) => void;
  removeDistrict: (id: string) => void;
  removeBuilding: (id: string) => void;
  removeBuildingCommunication: (id: string) => void;
  removeAggregatedCommunication: (id: string) => void;

  // Actions for clearing models
  clearAllCities: () => void;
  clearAllDistricts: () => void;
  clearAllBuildings: () => void;
  clearAllBuildingCommunications: () => void;
  clearAllAggregatedCommunications: () => void;
  clearAll: () => void;
}

export const useModelStore = create<ModelRepositoryState>((set, get) => ({
  cities: {},
  districts: {},
  buildings: {},
  buildingCommunications: {},
  aggregatedCommunications: {},
  telemetryKeyToEntityId: new Map(),

  // Getter functions for individual models
  getCity: (id) => get().cities[id],
  getCityForModel: (id) => {
    const state = get();
    if (state.cities[id]) return state.cities[id];

    const district = state.districts[id];
    if (district) {
      return state.cities[district.parentCityId];
    }

    const building = state.buildings[id];
    if (building) {
      return state.cities[building.parentCityId];
    }

    return undefined;
  },
  getDistrict: (id) => get().districts[id],
  getBuilding: (id) => get().buildings[id],
  getBuildingCommunication: (id) => get().buildingCommunications[id],
  getAggregatedCommunication: (id) => get().aggregatedCommunications[id],
  getCommunication: (id) =>
    get().buildingCommunications[id] || get().aggregatedCommunications[id],

  // Getter functions for all models
  getAllCities: () => Object.values(get().cities),
  getAllDistricts: () => Object.values(get().districts),
  getAllBuildings: () => Object.values(get().buildings),
  getAllBuildingCommunications: () =>
    Object.values(get().buildingCommunications),
  getAllAggregatedCommunications: () =>
    Object.values(get().aggregatedCommunications),

  getModel: (id) =>
    get().cities[id] ||
    get().districts[id] ||
    get().buildings[id] ||
    get().aggregatedCommunications[id],

  getEntityType: (id) => {
    const state = get();
    if (state.cities[id]) return 'city';
    if (state.districts[id]) return 'district';
    if (state.buildings[id]) return 'building';
    if (state.buildingCommunications[id] || state.aggregatedCommunications[id])
      return 'communication';
    return null;
  },

  // Add individual models
  addCity: (id, city) =>
    set((state) => ({
      cities: { ...state.cities, [id]: city },
      telemetryKeyToEntityId: new Map(state.telemetryKeyToEntityId).set(
        city.telemetryKey,
        city.id
      ),
    })),

  addDistrict: (id, district) =>
    set((state) => ({
      districts: { ...state.districts, [id]: district },
      telemetryKeyToEntityId: new Map(state.telemetryKeyToEntityId).set(
        district.telemetryKey,
        district.id
      ),
    })),

  addBuilding: (id, building) =>
    set((state) => ({
      buildings: { ...state.buildings, [id]: building },
      telemetryKeyToEntityId: new Map(state.telemetryKeyToEntityId).set(
        building.telemetryKey,
        building.id
      ),
    })),

  addBuildingCommunication: (id, communication) =>
    set((state) => ({
      buildingCommunications: {
        ...state.buildingCommunications,
        [id]: communication,
      },
    })),

  // Set multiple models (normalized inside the store)
  setCities: (cities) =>
    set((state) => ({
      cities: Object.fromEntries(cities.map((city) => [city.id, city])),
      telemetryKeyToEntityId: new Map([
        ...state.telemetryKeyToEntityId,
        ...cities.map((c) => [c.telemetryKey, c.id] as const),
      ]),
    })),

  setDistricts: (districts) =>
    set((state) => ({
      districts: Object.fromEntries(districts.map((d) => [d.id, d])),
      telemetryKeyToEntityId: new Map([
        ...state.telemetryKeyToEntityId,
        ...districts.map((d) => [d.telemetryKey, d.id] as const),
      ]),
    })),

  setBuildings: (buildings) =>
    set((state) => ({
      buildings: Object.fromEntries(buildings.map((b) => [b.id, b])),
      telemetryKeyToEntityId: new Map([
        ...state.telemetryKeyToEntityId,
        ...buildings.map((b) => [b.telemetryKey, b.id] as const),
      ]),
    })),

  setBuildingCommunications: (communications) =>
    set(() => ({
      buildingCommunications: Object.fromEntries(
        communications.map((c) => [c.id, c])
      ),
    })),

  setAggregatedCommunications: (communications) =>
    set(() => ({
      aggregatedCommunications: Object.fromEntries(
        communications.map((c) => [c.id, c])
      ),
    })),

  setAllModels: ({ cities, districts, buildings, buildingCommunications }) =>
    set(() => ({
      cities: Object.fromEntries(cities.map((city) => [city.id, city])),
      districts: Object.fromEntries(districts.map((d) => [d.id, d])),
      buildings: Object.fromEntries(buildings.map((b) => [b.id, b])),
      buildingCommunications: Object.fromEntries(
        buildingCommunications.map((c) => [c.id, c])
      ),
      telemetryKeyToEntityId: new Map([
        ...cities.map((c) => [c.telemetryKey, c.id] as const),
        ...districts.map((d) => [d.telemetryKey, d.id] as const),
        ...buildings.map((b) => [b.telemetryKey, b.id] as const),
      ]),
    })),

  // Remove individual models
  removeCity: (id) =>
    set((state) => {
      const { [id]: _, ...cities } = state.cities;
      return {
        cities: cities,
        telemetryKeyToEntityId: new Map(
          [...state.telemetryKeyToEntityId].filter(([key]) => key !== id)
        ),
      };
    }),

  removeDistrict: (id) =>
    set((state) => {
      const { [id]: _, ...districts } = state.districts;
      return {
        districts: districts,
        telemetryKeyToEntityId: new Map(
          [...state.telemetryKeyToEntityId].filter(([key]) => key !== id)
        ),
      };
    }),

  removeBuilding: (id) =>
    set((state) => {
      const { [id]: _, ...buildings } = state.buildings;
      return {
        buildings: buildings,
        telemetryKeyToEntityId: new Map(
          [...state.telemetryKeyToEntityId].filter(([key]) => key !== id)
        ),
      };
    }),

  removeBuildingCommunication: (id) =>
    set((state) => {
      const { [id]: _, ...buildingCommunications } =
        state.buildingCommunications;
      return { buildingCommunications };
    }),

  removeAggregatedCommunication: (id) =>
    set((state) => {
      const { [id]: _, ...aggregatedCommunications } =
        state.aggregatedCommunications;
      return { aggregatedCommunications };
    }),

  // Clear all models of specific type
  clearAllCities: () =>
    set((state) => {
      const newTelemetryKeyMap = new Map([...state.telemetryKeyToEntityId]);
      Object.values(state.cities).forEach((c) =>
        newTelemetryKeyMap.delete(c.telemetryKey)
      );
      return {
        cities: {},
        telemetryKeyToEntityId: newTelemetryKeyMap,
      };
    }),
  clearAllDistricts: () =>
    set((state) => {
      const newTelemetryKeyMap = new Map([...state.telemetryKeyToEntityId]);
      Object.values(state.districts).forEach((d) =>
        newTelemetryKeyMap.delete(d.telemetryKey)
      );
      return { districts: {}, telemetryKeyToEntityId: newTelemetryKeyMap };
    }),
  clearAllBuildings: () =>
    set((state) => {
      const newTelemetryKeyMap = new Map([...state.telemetryKeyToEntityId]);
      Object.values(state.buildings).forEach((b) =>
        newTelemetryKeyMap.delete(b.telemetryKey)
      );
      return { buildings: {}, telemetryKeyToEntityId: newTelemetryKeyMap };
    }),
  clearAllBuildingCommunications: () =>
    set(() => ({ buildingCommunications: {} })),
  clearAllAggregatedCommunications: () =>
    set(() => ({ aggregatedCommunications: {} })),

  // Clear everything
  clearAll: () =>
    set(() => ({
      cities: {},
      districts: {},
      buildings: {},
      buildingCommunications: {},
      aggregatedCommunications: {},
      telemetryKeyToEntityId: new Map(),
    })),
}));
