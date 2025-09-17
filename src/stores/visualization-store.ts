import { create } from 'zustand';

interface FoundationState {
  id: string;
  isHighlighted: boolean;
  isHovered: boolean;
}

interface VisualizationStoreState {
  // State for all entities
  highlightedEntityIds: Set<string>;
  hoveredEntityId: string | null;
  // State for foundation
  foundationData: { [id: string]: FoundationState };
  // State for components (store ids of components that have no default state)
  closedComponentIds: Set<string>;
  hiddenComponentIds: Set<string>; // Usually components in closed components
  // State for classes
  hiddenClassIds: Set<string>; // Usually classes in hidden components
  actions: {
    // Actions for all entities
    setHoveredEntityId: (id: string | null) => void;
    setHighlightedEntityId: (id: string, isHighlighted: boolean) => void;
    resetVisualizationState: () => void;
    // Foundations
    getFoundationState: (id: string) => FoundationState;
    updateFoundationState: (
      id: string,
      state: Partial<FoundationState>
    ) => void;
    removeAllFoundationStates: () => void;
    // Components
    openComponents: (ids: string[]) => void;
    closeComponents: (ids: string[]) => void;
    showComponents: (ids: string[]) => void;
    hideComponents: (ids: string[]) => void;
    resetComponentStates: () => void;
    // Classes
    showClasses: (ids: string[]) => void;
    hideClasses: (ids: string[]) => void;
    resetClassStates: () => void;
  };
}

export const useVisualizationStore = create<VisualizationStoreState>(
  (set, get) => ({
    // Shared entity states
    hoveredEntityId: null,
    highlightedEntityIds: new Set(),
    // Foundation state
    foundationData: {},
    // Component state
    closedComponentIds: new Set(),
    hiddenComponentIds: new Set(),
    // Class state
    hiddenClassIds: new Set(),
    actions: {
      // Shared entity states
      setHoveredEntityId: (id: string | null) => {
        set({ hoveredEntityId: id });
      },
      setHighlightedEntityId: (id: string, isHighlighted: boolean) => {
        if (isHighlighted) {
          set((prevState) => {
            const updatedHighlightedEntityIds = new Set(
              prevState.highlightedEntityIds
            );
            updatedHighlightedEntityIds.add(id);
            return {
              highlightedEntityIds: updatedHighlightedEntityIds,
            };
          });
        } else {
          set((prevState) => {
            const updatedHighlightedEntityIds = new Set(
              prevState.highlightedEntityIds
            );
            updatedHighlightedEntityIds.delete(id);
            return {
              highlightedEntityIds: updatedHighlightedEntityIds,
            };
          });
        }
      },
      resetVisualizationState: () => {
        set({
          hoveredEntityId: null,
          highlightedEntityIds: new Set(),
          closedComponentIds: new Set(),
          hiddenComponentIds: new Set(),
          hiddenClassIds: new Set(),
        });
      },
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
      openComponents: (ids: string[]) => {
        const newSet = get().closedComponentIds.difference(new Set(ids));
        set({
          closedComponentIds: newSet,
        });
      },
      closeComponents: (ids: string[]) => {
        set({
          closedComponentIds: get().closedComponentIds.union(new Set(ids)),
        });
      },
      showComponents: (ids: string[]) => {
        const newSet = get().hiddenComponentIds.difference(new Set(ids));
        set({
          hiddenComponentIds: newSet,
        });
      },
      hideComponents: (ids: string[]) => {
        set({
          hiddenComponentIds: get().hiddenComponentIds.union(new Set(ids)),
        });
      },
      resetComponentStates: () => {
        set({
          closedComponentIds: new Set(),
          hiddenComponentIds: new Set(),
        });
      },
      // Classes
      showClasses: (ids: string[]) => {
        const newSet = get().hiddenClassIds.difference(new Set(ids));
        set({
          hiddenClassIds: newSet,
        });
      },
      hideClasses: (ids: string[]) => {
        set({
          hiddenClassIds: get().hiddenClassIds.union(new Set(ids)),
        });
      },
      resetClassStates: () => {
        set({ hiddenClassIds: new Set() });
      },
    },
  })
);
