import { create } from 'zustand';

interface VisualizationStoreState {
  // State for all entities
  highlightedEntityIds: Set<string>;
  hoveredEntityId: string | null;
  // State for components (store ids of components that have no default state)
  closedComponentIds: Set<string>;
  hiddenComponentIds: Set<string>; // Usually components in closed components
  // State for classes
  hiddenClassIds: Set<string>; // Usually classes in hidden components
  removedDistrictIds: Set<string>;
  sceneLayers: layersType;
  actions: {
    // Actions for all entities
    setHoveredEntityId: (id: string | null) => void;
    setHighlightedEntityId: (id: string, isHighlighted: boolean) => void;
    removeAllHighlightedEntityIds: () => void;
    resetVisualizationState: () => void;
    filterEntityIds: (validEntityIds: Set<string>) => void;
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
    removeDistricts: (ids: Set<string>) => void;
    setRemovedDistricts: (ids: Set<string>) => void;
    setSceneLayers: (layers: layersType) => void;
  };
}

type layersType = {
  Default: number;
  Foundation: number;
  District: number;
  Building: number;
  Communication: number;
  Ping: number;
  Label: number;
  MinimapLabel: number;
  MinimapMarkers: number;
  LocalMinimapMarker: number;
};

export const useVisualizationStore = create<VisualizationStoreState>(
  (set, get) => ({
    // Shared entity states
    hoveredEntityId: null,
    highlightedEntityIds: new Set(),
    // Component state
    closedComponentIds: new Set(),
    hiddenComponentIds: new Set(),
    // Class state
    hiddenClassIds: new Set(),
    removedDistrictIds: new Set(),
    sceneLayers: {
      Default: 0,
      Foundation: 1,
      District: 2,
      Building: 3,
      Communication: 4,
      Ping: 5,
      Label: 6,
      MinimapLabel: 7,
      LocalMinimapMarker: 8,
      MinimapMarkers: 9,
    },
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
      removeAllHighlightedEntityIds: () => {
        set({ highlightedEntityIds: new Set() });
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
      filterEntityIds: (validEntityIds: Set<string>) => {
        set((prevState) => ({
          highlightedEntityIds: new Set(
            [...prevState.highlightedEntityIds].filter((id) =>
              validEntityIds.has(id)
            )
          ),
          hoveredEntityId:
            prevState.hoveredEntityId &&
            validEntityIds.has(prevState.hoveredEntityId)
              ? prevState.hoveredEntityId
              : null,
          closedComponentIds: new Set(
            [...prevState.closedComponentIds].filter((id) =>
              validEntityIds.has(id)
            )
          ),
          hiddenComponentIds: new Set(
            [...prevState.hiddenComponentIds].filter((id) =>
              validEntityIds.has(id)
            )
          ),
          hiddenClassIds: new Set(
            [...prevState.hiddenClassIds].filter((id) => validEntityIds.has(id))
          ),
        }));
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
      removeDistricts: (ids: Set<string>) => {
        set({
          removedDistrictIds: get().removedDistrictIds.union(ids),
        });
      },
      setRemovedDistricts: (ids: Set<string>) => {
        set({
          removedDistrictIds: ids,
        });
      },
      resetClassStates: () => {
        set({ hiddenClassIds: new Set() });
      },
      setSceneLayers: (layers: layersType) => {
        set({ sceneLayers: layers });
      },
    },
  })
);
