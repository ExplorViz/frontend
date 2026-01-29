import { create } from 'zustand';

interface VisualizationStoreState {
  // State for all entities
  highlightedEntityIds: Set<string>;
  hoveredEntityId: string | null;
  // State for districts (store ids of districts that have no default state)
  closedDistrictIds: Set<string>;
  hiddenDistrictIds: Set<string>; // Usually districts inside closed districts
  // State for buildings
  hiddenBuildingIds: Set<string>; // Usually buildings inside closed districts
  removedDistrictIds: Set<string>;
  sceneLayers: layersType;
  actions: {
    // Actions for all entities
    setHoveredEntityId: (id: string | null) => void;
    setHighlightedEntityId: (id: string, isHighlighted: boolean) => void;
    removeAllHighlightedEntityIds: () => void;
    resetVisualizationState: () => void;
    filterEntityIds: (validEntityIds: Set<string>) => void;
    // Districts
    openDistricts: (ids: string[]) => void;
    closeDistricts: (ids: string[]) => void;
    showDistricts: (ids: string[]) => void;
    hideDistricts: (ids: string[]) => void;
    resetDistrictState: () => void;
    // Buildings
    showBuildings: (ids: string[]) => void;
    hideBuildings: (ids: string[]) => void;
    resetBuildingStates: () => void;
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
    // District state
    closedDistrictIds: new Set(),
    hiddenDistrictIds: new Set(),
    // Building state
    hiddenBuildingIds: new Set(),
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
          closedDistrictIds: new Set(),
          hiddenDistrictIds: new Set(),
          hiddenBuildingIds: new Set(),
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
          closedDistrictIds: new Set(
            [...prevState.closedDistrictIds].filter((id) =>
              validEntityIds.has(id)
            )
          ),
          hiddenDistrictIds: new Set(
            [...prevState.hiddenDistrictIds].filter((id) =>
              validEntityIds.has(id)
            )
          ),
          hiddenBuildingIds: new Set(
            [...prevState.hiddenBuildingIds].filter((id) =>
              validEntityIds.has(id)
            )
          ),
        }));
      },
      // Districts
      openDistricts: (ids: string[]) => {
        const newSet = get().closedDistrictIds.difference(new Set(ids));
        set({
          closedDistrictIds: newSet,
        });
      },
      closeDistricts: (ids: string[]) => {
        set({
          closedDistrictIds: get().closedDistrictIds.union(new Set(ids)),
        });
      },
      showDistricts: (ids: string[]) => {
        const newSet = get().hiddenDistrictIds.difference(new Set(ids));
        set({
          hiddenDistrictIds: newSet,
        });
      },
      hideDistricts: (ids: string[]) => {
        set({
          hiddenDistrictIds: get().hiddenDistrictIds.union(new Set(ids)),
        });
      },
      resetDistrictState: () => {
        set({
          closedDistrictIds: new Set(),
          hiddenDistrictIds: new Set(),
        });
      },
      // Buildings
      showBuildings: (ids: string[]) => {
        const newSet = get().hiddenBuildingIds.difference(new Set(ids));
        set({
          hiddenBuildingIds: newSet,
        });
      },
      hideBuildings: (ids: string[]) => {
        set({
          hiddenBuildingIds: get().hiddenBuildingIds.union(new Set(ids)),
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
      resetBuildingStates: () => {
        set({ hiddenBuildingIds: new Set() });
      },
      setSceneLayers: (layers: layersType) => {
        set({ sceneLayers: layers });
      },
    },
  })
);
