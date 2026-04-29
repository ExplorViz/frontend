import AggregatedCommunication from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/aggregated-communication';
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
  communications: Record<string, AggregatedCommunication>;

  // Getter functions for individual models
  getCity: (id: string) => City | undefined;
  getCityForModel: (id: string) => City | undefined;
  getDistrict: (id: string) => District | undefined;
  getBuilding: (id: string) => Building | undefined;
  getCommunication: (id: string) => AggregatedCommunication | undefined;
  getModel: (
    id: string
  ) =>
    | City
    | District
    | Building
    | AggregatedCommunication
    | undefined;
  getEntityType: (id: string) => EntityType;

  // Getter functions for all models
  getAllCities: () => City[];
  getAllDistricts: () => District[];
  getAllBuildings: () => Building[];
  getAllCommunications: () => AggregatedCommunication[];

  // Actions for adding individual models
  addCity: (id: string, city: City) => void;
  addDistrict: (id: string, district: District) => void;
  addBuilding: (id: string, building: Building) => void;
  addCommunication: (id: string, communication: AggregatedCommunication) => void;

  // Actions for setting (overwriting) models
  setCities: (cities: City[]) => void;
  setDistricts: (districts: District[]) => void;
  setBuildings: (buildings: Building[]) => void;
  setCommunications: (communications: AggregatedCommunication[]) => void;

  // Actions for removing individual models
  removeCity: (id: string) => void;
  removeDistrict: (id: string) => void;
  removeBuilding: (id: string) => void;
  removeCommunication: (id: string) => void;

  // Actions for clearing models
  clearAllCities: () => void;
  clearAllDistricts: () => void;
  clearAllBuildings: () => void;
  clearAllCommunications: () => void;
  clearAll: () => void;
}

export const useModelStore = create<ModelRepositoryState>((set, get) => ({
  applications: {},
  cities: {},
  components: {},
  districts: {},
  classes: {},
  buildings: {},
  communications: {},

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
  getCommunication: (id) => get().communications[id],

  // Getter functions for all models
  getAllCities: () => Object.values(get().cities),
  getAllDistricts: () => Object.values(get().districts),
  getAllBuildings: () => Object.values(get().buildings),
  getAllCommunications: () => Object.values(get().communications),

  getModel: (id) =>
    get().cities[id] ||
    get().districts[id] ||
    get().buildings[id] ||
    get().communications[id],

  getEntityType: (id) => {
    const state = get();
    if (state.cities[id]) return 'city';
    if (state.districts[id]) return 'district';
    if (state.buildings[id]) return 'building';
    if (state.communications[id]) return 'communication';
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

  addCommunication: (id, communication) =>
    set((state) => ({
      communications: { ...state.communications, [id]: communication },
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

  setCommunications: (communications) =>
    set(() => ({
      communications: Object.fromEntries(communications.map((c) => [c.id, c])),
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

  removeCommunication: (id) =>
    set((state) => {
      const { [id]: _, ...communications } = state.communications;
      return { communications };
    }),

  // Clear all models of specific type
  clearAllCities: () => set(() => ({ cities: {} })),
  clearAllDistricts: () => set(() => ({ districts: {} })),
  clearAllBuildings: () => set(() => ({ buildings: {} })),
  clearAllCommunications: () => set(() => ({ communications: {} })),

  // Clear everything
  clearAll: () =>
    set(() => ({
      cities: {},
      districts: {},
      buildings: {},
      communications: {},
    })),
}));

