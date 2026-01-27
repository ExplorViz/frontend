import ClassCommunication from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/class-communication';
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
  components: Record<string, Package>;
  classes: Record<string, Class>;
  communications: Record<string, ClassCommunication>;

  // Getter functions for individual models
  getApplication: (id: string) => Application | undefined;
  getComponent: (id: string) => Package | undefined;
  getClass: (id: string) => Class | undefined;
  getCommunication: (id: string) => ClassCommunication | undefined;
  getModel: (id: string) => Application | Package | Class | Class | undefined;
  getEntityType: (id: string) => EntityType;

  // Getter functions for all models
  getAllApplications: () => Application[];
  getAllComponents: () => Package[];
  getAllClasses: () => Class[];
  getAllCommunications: () => ClassCommunication[];

  // Actions for adding individual models
  addApplication: (id: string, application: Application) => void;
  addComponent: (id: string, component: Package) => void;
  addClass: (id: string, classModel: Class) => void;
  addCommunication: (id: string, communication: ClassCommunication) => void;

  // Actions for setting (overwriting) models
  setApplications: (applications: Application[]) => void;
  setComponents: (components: Package[]) => void;
  setClasses: (classes: Class[]) => void;
  setCommunications: (communications: ClassCommunication[]) => void;

  // Actions for removing individual models
  removeApplication: (id: string) => void;
  removeComponent: (id: string) => void;
  removeClass: (id: string) => void;
  removeCommunication: (id: string) => void;

  // Actions for clearing models
  clearAllApplications: () => void;
  clearAllComponents: () => void;
  clearAllClasses: () => void;
  clearAllCommunications: () => void;
  clearAll: () => void;
}

export const useModelStore = create<ModelRepositoryState>((set, get) => ({
  applications: {},
  components: {},
  classes: {},
  communications: {},

  // Getter functions for individual models
  getApplication: (id) => get().applications[id],
  getComponent: (id) => get().components[id],
  getClass: (id) => get().classes[id],
  getCommunication: (id) => get().communications[id],

  // Getter functions for all models
  getAllApplications: () => Object.values(get().applications),
  getAllComponents: () => Object.values(get().components),
  getAllClasses: () => Object.values(get().classes),
  getAllCommunications: () => Object.values(get().communications),
  getModel: (id) =>
    get().applications[id] ||
    get().components[id] ||
    get().classes[id] ||
    get().communications[id],

  getEntityType: (id) => {
    const state = get();
    if (state.applications[id]) {
      return 'application';
    }
    if (state.components[id]) {
      return 'component';
    }
    if (state.classes[id]) {
      return 'class';
    }
    if (state.communications[id]) {
      return 'communication';
    }
    return null;
  },

  // Set individual models
  addApplication: (id, application) =>
    set((state) => ({
      applications: { ...state.applications, [id]: application },
    })),

  addComponent: (id, component) =>
    set((state) => ({
      components: { ...state.components, [id]: component },
    })),

  addClass: (id, classModel) =>
    set((state) => ({
      classes: { ...state.classes, [id]: classModel },
    })),

  addCommunication: (id, communication) =>
    set((state) => ({
      communications: { ...state.communications, [id]: communication },
    })),

  // Set multiple models
  setApplications: (applicationArray) =>
    set(() => ({
      applications: Object.fromEntries(
        applicationArray.map((app) => [app.id, app])
      ),
    })),

  setComponents: (components) =>
    set(() => ({
      components: Object.fromEntries(components.map((c) => [c.id, c])),
    })),

  setClasses: (classes) =>
    set(() => ({ classes: Object.fromEntries(classes.map((c) => [c.id, c])) })),

  setCommunications: (communications) =>
    set(() => ({
      communications: Object.fromEntries(communications.map((c) => [c.id, c])),
    })),

  // Clear individual models
  removeApplication: (id) =>
    set((state) => {
      const { [id]: removed, ...applications } = state.applications;
      return { applications };
    }),

  removeComponent: (id) =>
    set((state) => {
      const { [id]: removed, ...components } = state.components;
      return { components };
    }),

  removeClass: (id) =>
    set((state) => {
      const { [id]: removed, ...classes } = state.classes;
      return { classes };
    }),

  removeCommunication: (id) =>
    set((state) => {
      const { [id]: removed, ...communications } = state.communications;
      return { communications };
    }),

  // Clear all models of specific type
  clearAllApplications: () => set(() => ({ applications: {} })),

  clearAllComponents: () => set(() => ({ components: {} })),

  clearAllClasses: () => set(() => ({ classes: {} })),

  clearAllCommunications: () => set(() => ({ communications: {} })),

  // Clear everything
  clearAll: () =>
    set(() => ({
      applications: {},
      components: {},
      classes: {},
      communications: {},
    })),
}));
