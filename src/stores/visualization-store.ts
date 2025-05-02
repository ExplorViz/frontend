import { create } from 'zustand';

interface ClassState {
  id: string;
  isVisible: boolean;
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

interface VisualizationStoreState {
  componentData: { [id: string]: ComponentState };
  classData: { [id: string]: ClassState };
  actions: {
    // Classes
    getClassState: (id: string) => ClassState;
    setClassState: (id: string, state: ClassState) => void;
    updateClassState: (id: string, state: Partial<ClassState>) => void;
    removeClassState: (id: string) => void;
    removeAllClassStates: () => void;

    // Components
    getComponentState: (id: string) => ComponentState;
    setComponentState: (id: string, state: ComponentState) => void;
    updateComponentState: (id: string, state: Partial<ComponentState>) => void;
    removeComponentState: (id: string) => void;
    removeAllComponentStates: () => void;
  };
}

export const useVisualizationStore = create<VisualizationStoreState>(
  (set, get) => ({
    classData: {},
    componentData: {},
    actions: {
      // Classes
      getClassState: (id: string) => {
        const state = get().classData[id];
        if (!state) {
          throw new Error(`Component with id ${id} not found`);
        }
        return get().classData[id];
      },
      setClassState: (id: string, state: Omit<ClassState, 'id'>) => {
        const existingState = get().classData[id];
        if (existingState) {
          throw new Error(`Component with id ${id} already exists`);
        }
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
        if (!currentState) {
          throw new Error(`Component with id ${id} not found`);
        }
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

      // Components
      getComponentState: (id: string) => {
        const state = get().componentData[id];
        if (!state) {
          throw new Error(`Component with id ${id} not found`);
        }
        return state;
      },
      setComponentState: (id: string, state: Omit<ComponentState, 'id'>) => {
        const existingState = get().componentData[id];
        if (existingState) {
          throw new Error(`Component with id ${id} already exists`);
        }
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
        if (!currentState) {
          throw new Error(`Component with id ${id} not found`);
        }
        set((prevState) => ({
          componentData: {
            ...prevState.componentData,
            [id]: { ...currentState, ...state },
          },
        }));
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
    },
  })
);
