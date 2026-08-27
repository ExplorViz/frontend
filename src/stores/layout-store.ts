import { useModelStore } from 'explorviz-frontend/src/stores/repos/model-repository';
import {
  FlatLandscape,
  getFlatLandscapeEntityType,
} from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import BoxLayout from 'explorviz-frontend/src/utils/layout/box-layout';
import { create } from 'zustand';

interface LayoutStoreState {
  // Layouts for different entities
  landscapeLayout: BoxLayout | null;
  cityLayouts: Map<string, BoxLayout>;
  districtLayouts: Map<string, BoxLayout>;
  buildingLayouts: Map<string, BoxLayout>;
  fullLayoutMap: Map<string, BoxLayout>;
  maxDistrictDepth: number | null;

  // Actions
  updateLayouts: (
    boxLayoutMap: Map<string, BoxLayout>,
    flatLandscape?: FlatLandscape
  ) => void;
  getLayout: (entityId: string) => BoxLayout | undefined;
  getLandscapeLayout: () => BoxLayout | null;
  getCityLayouts: () => Map<string, BoxLayout>;
  getDistrictLayouts: () => Map<string, BoxLayout>;
  getBuildingLayouts: () => Map<string, BoxLayout>;
  clearLayouts: () => void;
}

/**
 * Layouts are never mutated in place once stored, so comparing entries by
 * identity is enough to tell whether a rebuilt map carries new information.
 */
function hasSameEntries(
  a: Map<string, BoxLayout>,
  b: Map<string, BoxLayout>
): boolean {
  if (a === b) {
    return true;
  }
  if (a.size !== b.size) {
    return false;
  }
  for (const [entityId, layout] of a) {
    if (b.get(entityId) !== layout) {
      return false;
    }
  }
  return true;
}

export const useLayoutStore = create<LayoutStoreState>((set, get) => ({
  landscapeLayout: null,
  cityLayouts: new Map<string, BoxLayout>(),
  districtLayouts: new Map<string, BoxLayout>(),
  buildingLayouts: new Map<string, BoxLayout>(),
  fullLayoutMap: new Map<string, BoxLayout>(),
  maxDistrictDepth: null,

  updateLayouts: (
    boxLayoutMap: Map<string, BoxLayout>,
    flatLandscape?: FlatLandscape
  ) => {
    const modelStore = useModelStore.getState();
    const previous = get();
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

      const entityType =
        (flatLandscape &&
          getFlatLandscapeEntityType(entityId, flatLandscape)) ||
        modelStore.getEntityType(entityId);
      switch (entityType) {
        case 'city':
          cityLayouts.set(entityId, layout);
          break;
        case 'district':
          districtLayouts.set(entityId, layout);
          break;
        case 'building':
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

    // Keep the previous map objects whenever the contents are unchanged.
    // Consumers such as the instanced district/building meshes and the cluster
    // centroids key off map identity, so handing them a fresh map makes them
    // discard and rebuild GPU instances on a no-op layout refresh.
    const nextCityLayouts = hasSameEntries(cityLayouts, previous.cityLayouts)
      ? previous.cityLayouts
      : cityLayouts;
    const nextDistrictLayouts = hasSameEntries(
      districtLayouts,
      previous.districtLayouts
    )
      ? previous.districtLayouts
      : districtLayouts;
    const nextBuildingLayouts = hasSameEntries(
      buildingLayouts,
      previous.buildingLayouts
    )
      ? previous.buildingLayouts
      : buildingLayouts;
    const nextFullLayoutMap = hasSameEntries(
      boxLayoutMap,
      previous.fullLayoutMap
    )
      ? previous.fullLayoutMap
      : boxLayoutMap;

    if (
      nextCityLayouts === previous.cityLayouts &&
      nextDistrictLayouts === previous.districtLayouts &&
      nextBuildingLayouts === previous.buildingLayouts &&
      nextFullLayoutMap === previous.fullLayoutMap &&
      landscapeLayout === previous.landscapeLayout &&
      maxDistrictDepth === previous.maxDistrictDepth
    ) {
      return;
    }

    set({
      landscapeLayout: landscapeLayout,
      cityLayouts: nextCityLayouts,
      districtLayouts: nextDistrictLayouts,
      buildingLayouts: nextBuildingLayouts,
      fullLayoutMap: nextFullLayoutMap,
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
      fullLayoutMap: new Map<string, BoxLayout>(),
      maxDistrictDepth: null,
    });
  },
}));
