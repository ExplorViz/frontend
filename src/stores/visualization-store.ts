import { create } from 'zustand';

interface ComponentState {
  id: string;
  isVisible: boolean;
  isSelected: boolean;
  isHovered: boolean;
  isOpen: boolean;
}

interface VisualizationStoreState {
  componentData: {[id: string]: ComponentState};
  actions: {
    getComponentState: (id: string) => ComponentState;
    setComponentState: (id: string, state: ComponentState) => void;
    updateComponentState: (id: string, state: Partial<ComponentState>) => void;
    removeComponentState: (id: string) => void;
    removeAllComponentStates: () => void;
  }
}

export const useVisualizationStore = create<VisualizationStoreState>(
  (set, get) => ({
    componentData: {},
    actions: {
      getComponentState: (id: string) => {
        const state = get().componentData[id];
        if (!state) {
          throw new Error(`Component with id ${id} not found`);
        }
        return get().componentData[id]
      },
      setComponentState: (id: string, state: Omit<ComponentState, 'id'>) => {
        const existingState = get().componentData[id];
        if (existingState) {
          throw new Error(`Component with id ${id} already exists`);
        }
        set((prevState) => ({
          componentData: {
            ...prevState.componentData,
            [id]: {...state, id},
          },
        }));
      },
      updateComponentState: (id: string, state: Partial<Omit<ComponentState, 'id'>>) => {
        const currentState = get().actions.getComponentState(id);
        if(!currentState) {
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
