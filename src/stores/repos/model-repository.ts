import AggregatedCommunication from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/aggregated-communication';
import {
  Building,
  City,
  Cls,
  District,
  Func,
} from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import {
  Application,
  Class,
  Package,
} from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import { create } from 'zustand';

export type EntityType =
  | 'application'
  | 'component'
  | 'class'
  | 'communication'
  | null;

interface ModelRepositoryState {
  applications: Record<string, Application>;
  cities: Record<string, City>;

  components: Record<string, Package>;
  districts: Record<string, District>;

  classes: Record<string, Class>;
  buildings: Record<string, Building>;
  functions: Record<string, Func>;

  communications: Record<string, AggregatedCommunication>;

  // Getter functions for individual models
  getApplication: (id: string) => Application | undefined;
  getCity: (id: string) => City | undefined;
  getCityForModel: (id: string) => City | undefined;
  getComponent: (id: string) => Package | District | undefined;
  getDistrict: (id: string) => District | undefined;
  getClass: (id: string) => Cls | undefined;
  getBuilding: (id: string) => Building | undefined;
  getFunc: (id: string) => Func | undefined;
  getCommunication: (id: string) => AggregatedCommunication | undefined;
  getModel: (
    id: string
  ) =>
    | Application
    | Package
    | Class
    | City
    | District
    | Building
    | AggregatedCommunication
    | undefined;
  getFlatModel: (id: string) => City | District | Building | undefined;
  getEntityType: (id: string) => EntityType;
  getFlatEntityType: (id: string) => 'city' | 'district' | 'building' | null;

  // Getter functions for all models
  getAllApplications: () => Application[];
  getAllCities: () => City[];
  getAllDistricts: () => District[];
  getAllBuildings: () => Building[];
  getAllCommunications: () => AggregatedCommunication[];

  // Actions for adding individual models
  addApplication: (id: string, application: Application) => void;
  addCity: (id: string, city: City) => void;
  addComponent: (id: string, component: Package) => void;
  addDistrict: (id: string, district: District) => void;
  addClass: (id: string, classModel: Class) => void;
  addBuilding: (id: string, building: Building) => void;
  addCommunication: (id: string, communication: AggregatedCommunication) => void;

  // Actions for setting (overwriting) models
  setApplications: (applications: Application[]) => void;
  setCities: (cities: City[]) => void;
  setComponents: (components: Package[]) => void;
  setDistricts: (districts: District[]) => void;
  setClasses: (classes: Class[]) => void;
  setBuildings: (buildings: Building[]) => void;
  setFunctions: (functions: Func[]) => void;
  setCommunications: (communications: AggregatedCommunication[]) => void;

  // Actions for removing individual models
  removeApplication: (id: string) => void;
  removeCity: (id: string) => void;
  removeComponent: (id: string) => void;
  removeDistrict: (id: string) => void;
  removeClass: (id: string) => void;
  removeBuilding: (id: string) => void;
  removeCommunication: (id: string) => void;

  // Actions for clearing models
  clearAllApplications: () => void;
  clearAllCities: () => void;
  clearAllComponents: () => void;
  clearAllDistricts: () => void;
  clearAllClasses: () => void;
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
  functions: {},
  communications: {},

  // Getter functions for individual models
  getApplication: (id) => get().applications[id],
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
  getComponent: (id) => get().districts[id] || get().components[id],
  getDistrict: (id) => get().districts[id],
  getClass: (id) => get().classes[id],
  getBuilding: (id) => get().buildings[id],
  getFunc: (id) => get().functions[id],
  getCommunication: (id) => get().communications[id],

  // Getter functions for all models
  getAllApplications: () => Object.values(get().applications),
  getAllCities: () => Object.values(get().cities),
  getAllDistricts: () => Object.values(get().districts),
  getAllBuildings: () => Object.values(get().buildings),
  getAllCommunications: () => Object.values(get().communications),

  getModel: (id) =>
    get().cities[id] ||
    get().districts[id] ||
    get().buildings[id] ||
    get().applications[id] ||
    get().components[id] ||
    get().classes[id] ||
    get().communications[id],

  getFlatModel: (id) =>
    get().cities[id] || get().districts[id] || get().buildings[id],

  getEntityType: (id) => {
    const state = get();
    if (state.cities[id]) return 'application';
    if (state.districts[id]) return 'component';
    if (state.buildings[id]) return 'class';
    if (state.applications[id]) return 'application';
    if (state.components[id]) return 'component';
    if (state.classes[id]) return 'class';
    if (state.communications[id]) return 'communication';
    return null;
  },

  getFlatEntityType: (id) => {
    const state = get();
    if (state.cities[id]) return 'city';
    if (state.districts[id]) return 'district';
    if (state.buildings[id]) return 'building';
    return null;
  },

  // Add individual models
  addApplication: (id, application) =>
    set((state) => ({
      applications: { ...state.applications, [id]: application },
    })),

  addCity: (id, city) =>
    set((state) => ({
      cities: { ...state.cities, [id]: city },
    })),

  addComponent: (id, component) =>
    set((state) => ({
      components: { ...state.components, [id]: component },
    })),

  addDistrict: (id, district) =>
    set((state) => ({
      districts: { ...state.districts, [id]: district },
    })),

  addClass: (id, classModel) =>
    set((state) => ({
      classes: { ...state.classes, [id]: classModel },
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
  setApplications: (applications) =>
    set(() => ({
      applications: Object.fromEntries(
        applications.map((app) => [app.id, app])
      ),
    })),

  setCities: (cities) =>
    set(() => ({
      cities: Object.fromEntries(cities.map((city) => [city.id, city])),
    })),

  setComponents: (components) =>
    set(() => ({
      components: Object.fromEntries(components.map((c) => [c.id, c])),
    })),

  setDistricts: (districts) =>
    set(() => ({
      districts: Object.fromEntries(districts.map((d) => [d.id, d])),
    })),

  setClasses: (classes) =>
    set(() => ({
      classes: Object.fromEntries(classes.map((c) => [c.id, c])),
    })),

  setBuildings: (buildings) =>
    set(() => ({
      buildings: Object.fromEntries(buildings.map((b) => [b.id, b])),
    })),
  setFunctions: (functions) =>
    set(() => ({
      functions: Object.fromEntries(functions.map((f) => [f.id, f])),
    })),

  setCommunications: (communications) =>
    set(() => ({
      communications: Object.fromEntries(communications.map((c) => [c.id, c])),
    })),

  // Remove individual models
  removeApplication: (id) =>
    set((state) => {
      const { [id]: _, ...applications } = state.applications;
      return { applications };
    }),

  removeCity: (id) =>
    set((state) => {
      const { [id]: _, ...cities } = state.cities;
      return { cities };
    }),

  removeComponent: (id) =>
    set((state) => {
      const { [id]: _, ...components } = state.components;
      return { components };
    }),

  removeDistrict: (id) =>
    set((state) => {
      const { [id]: _, ...districts } = state.districts;
      return { districts };
    }),

  removeClass: (id) =>
    set((state) => {
      const { [id]: _, ...classes } = state.classes;
      return { classes };
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
  clearAllApplications: () => set(() => ({ applications: {} })),
  clearAllCities: () => set(() => ({ cities: {} })),
  clearAllComponents: () => set(() => ({ components: {} })),
  clearAllDistricts: () => set(() => ({ districts: {} })),
  clearAllClasses: () => set(() => ({ classes: {} })),
  clearAllBuildings: () => set(() => ({ buildings: {} })),
  clearAllCommunications: () => set(() => ({ communications: {} })),

  // Clear everything
  clearAll: () =>
    set(() => ({
      applications: {},
      cities: {},
      components: {},
      districts: {},
      classes: {},
      buildings: {},
      functions: {},
      communications: {},
    })),
}));
