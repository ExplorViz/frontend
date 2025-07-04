import { useApplicationRepositoryStore } from 'explorviz-frontend/src/stores/repos/application-repository';
import {
  getAllClassIdsInApplication,
  getAllClassIdsInApplications,
  getAllPackageIdsInApplications,
  getAllPackagesInApplication,
} from 'explorviz-frontend/src/utils/application-helpers';
import {
  Application,
  Package,
} from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import { create } from 'zustand';

interface FoundationState {
  id: string;
  isHighlighted: boolean;
  isHovered: boolean;
}
interface ComponentState {
  id: string;
  isVisible: boolean;
  isHighlighted: boolean;
  isHovered: boolean;
  isOpen: boolean;
}
interface ClassState {
  id: string;
  isVisible: boolean;
  isHighlighted: boolean;
  isHovered: boolean;
}

interface VisualizationStoreState {
  componentData: { [id: string]: ComponentState };
  classData: { [id: string]: ClassState };
  hoveredEntityId: string | null;
  foundationData: { [id: string]: FoundationState };
  actions: {
    // Foundations
    getFoundationState: (id: string) => FoundationState;
    updateFoundationState: (
      id: string,
      state: Partial<FoundationState>
    ) => void;
    removeAllFoundationStates: () => void;
    // Components
    getComponentState: (id: string) => ComponentState;
    setComponentState: (id: string, state: ComponentState) => void;
    updateComponentState: (id: string, state: Partial<ComponentState>) => void;
    openAllComponents: (applications?: Application[]) => void;
    closeAllComponents: (applications?: Application[]) => void;
    removeComponentState: (id: string) => void;
    removeAllComponentStates: () => void;
    // Classes
    setHoveredEntityId: (id: string | null) => void;
    getClassState: (id: string) => ClassState;
    setClassState: (id: string, state: ClassState) => void;
    updateClassState: (id: string, state: Partial<ClassState>) => void;
    removeClassState: (id: string) => void;
    removeAllClassStates: () => void;
  };
}

export const useVisualizationStore = create<VisualizationStoreState>(
  (set, get) => ({
    foundationData: {},
    componentData: {},
    classData: {},
    hoveredEntityId: null,
    actions: {
      // Foundations
      getFoundationState: (id: string) => {
        const state = get().foundationData[id];
        if (!state) {
          return {
            id,
            isHighlighted: false,
            isHovered: false,
          };
        }
        return state;
      },
      updateFoundationState: (
        id: string,
        state: Partial<Omit<FoundationState, 'id'>>
      ) => {
        const currentState = get().actions.getFoundationState(id);
        set((prevState) => ({
          foundationData: {
            ...prevState.foundationData,
            [id]: { ...currentState, ...state },
          },
        }));
      },
      removeAllFoundationStates: () => {
        set({ foundationData: {} });
      },
      // Components
      getComponentState: (id: string) => {
        const state = get().componentData[id];
        if (!state) {
          return {
            id,
            isVisible: true,
            isHighlighted: false,
            isHovered: false,
            isOpen: true,
          };
        }
        return state;
      },
      setComponentState: (id: string, state: Omit<ComponentState, 'id'>) => {
        set((prevState) => ({
          componentData: {
            ...prevState.componentData,
            [id]: { ...state, id },
          },
        }));
      },
      updateComponentState: (
        id: string,
        state: Partial<Omit<ComponentState, 'id'>>
      ) => {
        const currentState = get().actions.getComponentState(id);
        set((prevState) => ({
          componentData: {
            ...prevState.componentData,
            [id]: { ...currentState, ...state },
          },
        }));
      },
      openAllComponents: (applicationsArg?: Application[]) => {
        const applications = applicationsArg
          ? applicationsArg
          : Array.from(useApplicationRepositoryStore.getState().getAll()).map(
              (app) => app.application
            );
        getAllPackageIdsInApplications(applications).forEach((packageId) => {
          get().actions.updateComponentState(packageId, {
            isVisible: true,
            isOpen: true,
          });
        });
        getAllClassIdsInApplications(applications).forEach((classId) => {
          get().actions.updateClassState(classId, {
            isVisible: true,
          });
        });
      },
      closeAllComponents: (applicationsArg?: Application[]) => {
        const applications = applicationsArg
          ? applicationsArg
          : Array.from(useApplicationRepositoryStore.getState().getAll()).map(
              (app) => app.application
            );
        let packages: Package[] = [];
        let classIds: string[] = [];
        applications.forEach((application) => {
          packages = packages.concat(getAllPackagesInApplication(application));
          classIds = classIds.concat(getAllClassIdsInApplication(application));
        });
        const closedComponentStates: ComponentState[] = packages.map((pckg) => {
          return {
            id: pckg.id,
            isVisible: !pckg.parent,
            isHighlighted: false,
            isHovered: false,
            isOpen: false,
          };
        });
        closedComponentStates.forEach((component) => {
          get().actions.setComponentState(component.id, component);
        });
        classIds.forEach((classId) => {
          get().actions.updateClassState(classId, {
            id: classId,
            isVisible: false,
            isHighlighted: false,
            isHovered: false,
          });
        });
      },
      removeComponentState: (id: string) => {
        set((prevState) => {
          const newComponentData = { ...prevState.componentData };
          delete newComponentData[id];
          return { componentData: newComponentData };
        });
      },
      removeAllComponentStates: () => {
        set({ componentData: {} });
      },
      // Classes
      setHoveredEntityId: (id: string | null) => {
        set({ hoveredEntityId: id });
      },
      getClassState: (id: string) => {
        const state = get().classData[id];
        if (!state) {
          return {
            id,
            isVisible: true,
            isHighlighted: false,
            isHovered: false,
          };
        }
        return get().classData[id];
      },
      setClassState: (id: string, state: Omit<ClassState, 'id'>) => {
        set((prevState) => ({
          classData: {
            ...prevState.classData,
            [id]: { ...state, id },
          },
        }));
      },
      updateClassState: (
        id: string,
        state: Partial<Omit<ClassState, 'id'>>
      ) => {
        const currentState = get().actions.getClassState(id);
        set((prevState) => ({
          classData: {
            ...prevState.classData,
            [id]: { ...currentState, ...state },
          },
        }));
      },
      removeClassState: (id: string) => {
        set((prevState) => {
          const newComponentData = { ...prevState.classData };
          delete newComponentData[id];
          return { classData: newComponentData };
        });
      },
      removeAllClassStates: () => {
        set({ classData: {} });
      },
    },
  })
);
