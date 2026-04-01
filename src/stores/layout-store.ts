import { useModelStore } from 'explorviz-frontend/src/stores/repos/model-repository';
import BoxLayout from 'explorviz-frontend/src/utils/layout/box-layout';
import { create } from 'zustand';

interface LayoutStoreState {
  // Layouts for different entities
  landscapeLayout: BoxLayout | null;
  cityLayouts: Map<string, BoxLayout>;
  districtLayouts: Map<string, BoxLayout>;
  buildingLayouts: Map<string, BoxLayout>;
  maxDistrictDepth: number | null;

  // Actions
  updateLayouts: (boxLayoutMap: Map<string, BoxLayout>) => void;
  getLayout: (entityId: string) => BoxLayout | undefined;
  getLandscapeLayout: () => BoxLayout | null;
  getCityLayouts: () => Map<string, BoxLayout>;
  getDistrictLayouts: () => Map<string, BoxLayout>;
  getBuildingLayouts: () => Map<string, BoxLayout>;
  clearLayouts: () => void;
}

export const useLayoutStore = create<LayoutStoreState>((set, get) => ({
  landscapeLayout: null,
  cityLayouts: new Map<string, BoxLayout>(),
  districtLayouts: new Map<string, BoxLayout>(),
  buildingLayouts: new Map<string, BoxLayout>(),
  maxDistrictDepth: null,

  updateLayouts: (boxLayoutMap: Map<string, BoxLayout>) => {
    const modelStore = useModelStore.getState();
    const landscapeLayout = boxLayoutMap.get('landscape') || null;

    const cityLayouts = new Map<string, BoxLayout>();
    const districtLayouts = new Map<string, BoxLayout>();
    const buildingLayouts = new Map<string, BoxLayout>();

    // Organize layouts by entity type
    boxLayoutMap.forEach((layout, entityId) => {
      // Skip landscape as it's handled separately
      if (entityId === 'landscape') {
        return;
      }

      const entityType = modelStore.getEntityType(entityId);
      switch (entityType) {
        case 'application':
          cityLayouts.set(entityId, layout);
          break;
        case 'component':
          districtLayouts.set(entityId, layout);
          break;
        case 'class':
          buildingLayouts.set(entityId, layout);
          break;
        default:
          // Unknown entity type, skip
          break;
      }
    });

    // Compute max district level/depth
    let maxDistrictDepth: number | null = null;
    if (districtLayouts.size > 0) {
      let maxLevel = -Infinity;
      districtLayouts.forEach((layout) => {
        if (layout.level > maxLevel) {
          maxLevel = layout.level;
        }
      });
      maxDistrictDepth = maxLevel !== -Infinity ? maxLevel : null;
    }

    set({
      landscapeLayout: landscapeLayout,
      cityLayouts: cityLayouts,
      districtLayouts: districtLayouts,
      buildingLayouts: buildingLayouts,
      maxDistrictDepth: maxDistrictDepth,
    });
  },

  getLayout: (entityId: string) => {
    const state = get();

    // Check landscape
    if (entityId === 'landscape') {
      return state.landscapeLayout || undefined;
    }

    // Check cities
    const cityLayout = state.cityLayouts.get(entityId);
    if (cityLayout) {
      return cityLayout;
    }

    // Check districts
    const districtLayout = state.districtLayouts.get(entityId);
    if (districtLayout) {
      return districtLayout;
    }

    // Check buildings
    const buildingLayout = state.buildingLayouts.get(entityId);
    if (buildingLayout) {
      return buildingLayout;
    }

    return undefined;
  },

  getLandscapeLayout: () => {
    return get().landscapeLayout;
  },

  getCityLayouts: () => {
    return get().cityLayouts;
  },

  getDistrictLayouts: () => {
    return get().districtLayouts;
  },

  getBuildingLayouts: () => {
    return get().buildingLayouts;
  },

  clearLayouts: () => {
    set({
      landscapeLayout: null,
      cityLayouts: new Map<string, BoxLayout>(),
      districtLayouts: new Map<string, BoxLayout>(),
      buildingLayouts: new Map<string, BoxLayout>(),
      maxDistrictDepth: null,
    });
  },
}));
