import ApplicationData from 'explorviz-frontend/src/utils/application-data';
import ClassCommunication from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/class-communication';
import {
  Class,
  Package,
} from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import { create } from 'zustand';

interface ModelRepositoryState {
  applications: Record<string, ApplicationData>;
  components: Record<string, Package>;
  classes: Record<string, Class>;
  communications: Record<string, ClassCommunication>;

  // Getter functions for individual models
  getApplication: (id: string) => ApplicationData | undefined;
  getComponent: (id: string) => Package | undefined;
  getClass: (id: string) => Class | undefined;
  getCommunication: (id: string) => ClassCommunication | undefined;

  // Getter functions for all models
  getAllApplications: () => ApplicationData[];
  getAllComponents: () => Package[];
  getAllClasses: () => Class[];
  getAllCommunications: () => ClassCommunication[];

  // Actions for adding individual models
  addApplication: (id: string, application: ApplicationData) => void;
  addComponent: (id: string, component: Package) => void;
  addClass: (id: string, clazz: Class) => void;
  addCommunication: (id: string, communication: ClassCommunication) => void;

  // Actions for setting (overwriting) models
  setApplications: (applications: ApplicationData[]) => void;
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

  // Set individual models
  addApplication: (id, application) =>
    set((state) => ({
      applications: { ...state.applications, [id]: application },
    })),

  addComponent: (id, component) =>
    set((state) => ({
      components: { ...state.components, [id]: component },
    })),

  addClass: (id, clazz) =>
    set((state) => ({
      classes: { ...state.classes, [id]: clazz },
    })),

  addCommunication: (id, communication) =>
    set((state) => ({
      communications: { ...state.communications, [id]: communication },
    })),

  // Set multiple models
  setApplications: (applicationArray) =>
    set(() => ({
      applications: Object.fromEntries(
        applicationArray.map((app) => [app.getId(), app])
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
