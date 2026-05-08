import AggregatedCommunication from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/aggregated-communication';
import { CommunicationDto } from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/aggregated-file-communication';
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
  buildingCommunications: Record<string, CommunicationDto>;
  aggregatedCommunications: Record<string, AggregatedCommunication>;

  // Getter functions for individual models
  getCity: (id: string) => City | undefined;
  getCityForModel: (id: string) => City | undefined;
  getDistrict: (id: string) => District | undefined;
  getBuilding: (id: string) => Building | undefined;
  getBuildingCommunication: (id: string) => CommunicationDto | undefined;
  getAggregatedCommunication: (
    id: string
  ) => AggregatedCommunication | undefined;
  getCommunication: (
    id: string
  ) => CommunicationDto | AggregatedCommunication | undefined;
  getModel: (
    id: string
  ) => City | District | Building | AggregatedCommunication | undefined;
  getEntityType: (id: string) => EntityType;

  // Getter functions for all models
  getAllCities: () => City[];
  getAllDistricts: () => District[];
  getAllBuildings: () => Building[];
  getAllBuildingCommunications: () => CommunicationDto[];
  getAllAggregatedCommunications: () => AggregatedCommunication[];

  // Actions for adding individual models
  addCity: (id: string, city: City) => void;
  addDistrict: (id: string, district: District) => void;
  addBuilding: (id: string, building: Building) => void;
  addBuildingCommunication: (
    id: string,
    communication: CommunicationDto
  ) => void;

  // Actions for setting (overwriting) models
  setCities: (cities: City[]) => void;
  setDistricts: (districts: District[]) => void;
  setBuildings: (buildings: Building[]) => void;
  setBuildingCommunications: (communications: CommunicationDto[]) => void;
  setAggregatedCommunications: (
    communications: AggregatedCommunication[]
  ) => void;

  setAllModels: (data: {
    cities: City[];
    districts: District[];
    buildings: Building[];
    buildingCommunications: CommunicationDto[];
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
    })),

  addDistrict: (id, district) =>
    set((state) => ({
      districts: { ...state.districts, [id]: district },
    })),

  addBuilding: (id, building) =>
    set((state) => ({
      buildings: { ...state.buildings, [id]: building },
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
    set(() => ({
      cities: Object.fromEntries(cities.map((city) => [city.id, city])),
    })),

  setDistricts: (districts) =>
    set(() => ({
      districts: Object.fromEntries(districts.map((d) => [d.id, d])),
    })),

  setBuildings: (buildings) =>
    set(() => ({
      buildings: Object.fromEntries(buildings.map((b) => [b.id, b])),
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
    })),

  // Remove individual models
  removeCity: (id) =>
    set((state) => {
      const { [id]: _, ...cities } = state.cities;
      return { cities };
    }),

  removeDistrict: (id) =>
    set((state) => {
      const { [id]: _, ...districts } = state.districts;
      return { districts };
    }),

  removeBuilding: (id) =>
    set((state) => {
      const { [id]: _, ...buildings } = state.buildings;
      return { buildings };
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
  clearAllCities: () => set(() => ({ cities: {} })),
  clearAllDistricts: () => set(() => ({ districts: {} })),
  clearAllBuildings: () => set(() => ({ buildings: {} })),
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
    })),
}));
