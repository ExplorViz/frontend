import { create } from 'zustand';
import BoxLayout from 'explorviz-frontend/src/view-objects/layout-models/box-layout';
import { useModelStore } from './repos/model-repository';

interface LayoutStoreState {
  // Layouts for different entities
  landscapeLayout: BoxLayout | null;
  applicationLayouts: Map<string, BoxLayout>;
  componentLayouts: Map<string, BoxLayout>;
  classLayouts: Map<string, BoxLayout>;
  maxComponentLevel: number | null;

  // Actions
  updateLayouts: (boxLayoutMap: Map<string, BoxLayout>) => void;
  getLayout: (entityId: string) => BoxLayout | undefined;
  getLandscapeLayout: () => BoxLayout | null;
  getApplicationLayouts: () => Map<string, BoxLayout>;
  getComponentLayouts: () => Map<string, BoxLayout>;
  getClassLayouts: () => Map<string, BoxLayout>;
  clearLayouts: () => void;
}

export const useLayoutStore = create<LayoutStoreState>((set, get) => ({
  landscapeLayout: null,
  applicationLayouts: new Map<string, BoxLayout>(),
  componentLayouts: new Map<string, BoxLayout>(),
  classLayouts: new Map<string, BoxLayout>(),
  maxComponentLevel: null,

  updateLayouts: (boxLayoutMap: Map<string, BoxLayout>) => {
    const modelStore = useModelStore.getState();
    const landscapeLayout = boxLayoutMap.get('landscape') || null;

    const applicationLayouts = new Map<string, BoxLayout>();
    const componentLayouts = new Map<string, BoxLayout>();
    const classLayouts = new Map<string, BoxLayout>();

    // Organize layouts by entity type
    boxLayoutMap.forEach((layout, entityId) => {
      // Skip landscape as it's handled separately
      if (entityId === 'landscape') {
        return;
      }

      const entityType = modelStore.getEntityType(entityId);
      switch (entityType) {
        case 'application':
          applicationLayouts.set(entityId, layout);
          break;
        case 'component':
          componentLayouts.set(entityId, layout);
          break;
        case 'class':
          classLayouts.set(entityId, layout);
          break;
        default:
          // Unknown entity type, skip
          break;
      }
    });

    // Compute max component level
    let maxComponentLevel: number | null = null;
    if (componentLayouts.size > 0) {
      let maxLevel = -Infinity;
      componentLayouts.forEach((layout) => {
        if (layout.level > maxLevel) {
          maxLevel = layout.level;
        }
      });
      maxComponentLevel = maxLevel !== -Infinity ? maxLevel : null;
    }

    set({
      landscapeLayout,
      applicationLayouts,
      componentLayouts,
      classLayouts,
      maxComponentLevel,
    });
  },

  getLayout: (entityId: string) => {
    const state = get();

    // Check landscape
    if (entityId === 'landscape') {
      return state.landscapeLayout || undefined;
    }

    // Check applications
    const appLayout = state.applicationLayouts.get(entityId);
    if (appLayout) {
      return appLayout;
    }

    // Check components
    const componentLayout = state.componentLayouts.get(entityId);
    if (componentLayout) {
      return componentLayout;
    }

    // Check classes
    const classLayout = state.classLayouts.get(entityId);
    if (classLayout) {
      return classLayout;
    }

    return undefined;
  },

  getLandscapeLayout: () => {
    return get().landscapeLayout;
  },

  getApplicationLayouts: () => {
    return get().applicationLayouts;
  },

  getComponentLayouts: () => {
    return get().componentLayouts;
  },

  getClassLayouts: () => {
    return get().classLayouts;
  },

  clearLayouts: () => {
    set({
      landscapeLayout: null,
      applicationLayouts: new Map<string, BoxLayout>(),
      componentLayouts: new Map<string, BoxLayout>(),
      classLayouts: new Map<string, BoxLayout>(),
      maxComponentLevel: null,
    });
  },
}));
