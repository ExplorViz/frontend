import { act, create } from '@react-three/test-renderer';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Vector3 } from 'three';

// Records the position each label is drawn at.
const labelPositions = vi.hoisted(() => new Map<string, Vector3>());

vi.mock('@react-three/drei', () => ({
  Text: ({ name, position }: { name: string; position: Vector3 }) => {
    labelPositions.set(name, position);
    return null;
  },
}));
vi.mock('../src/utils/settings/building-metrics', () => ({
  computeMappedBuildingHeight: () => 1,
  getCachedBuildingMetricBounds: () => undefined,
}));
vi.mock('../src/utils/annotation-utils', () => ({ getTruncatedDisplayName: (name: string) => name }));
vi.mock('../src/stores/repos/model-repository', async () => {
  const { create } = await import('zustand');
  const building = { id: 'a', name: 'a', parentCityId: 'city', parentDistrictId: 'district' };
  const store = create(() => ({ buildings: { a: building }, getBuilding: () => building }));
  return { useModelStore: store };
});
vi.mock('../src/utils/collaboration/highlights', () => ({
  useHighlights: (select: (ids: Set<string>) => unknown) => select(new Set()),
}));
vi.mock('../src/stores/user-settings', async () => {
  const { create } = await import('zustand');
  const setting = (value: unknown) => ({ value });
  return {
    useUserSettingsStore: create(() => ({
      visualizationSettings: {
        showAllBuildingLabels: setting(true),
        labelDistanceThreshold: setting(1),
        enableClustering: setting(false),
        buildingFootprint: setting(1),
        buildingHeightMultiplier: setting(1),
        buildingMetricMapping: setting('linear'),
        buildingMetricBuckets: setting(1),
        buildingLabelFontSize: setting(1),
        buildingLabelLength: setting(10),
        buildingTextColor: setting('#000'),
        buildingHeightMetric: setting('loc'),
        labelOffset: setting(0),
        buildingLabelOrientation: setting(0),
        enableAnimations: setting(false),
        animationDuration: setting(0),
      },
    })),
  };
});
vi.mock('../src/stores/cluster-store', () => ({ useIsWithinCentroidDistance: () => true }));

import { useLayoutStore } from '../src/stores/layout-store';
import BoxLayout from '../src/utils/layout/box-layout';
import CodeBuildingLabel from '../src/view-objects/3d/city/code-building-label';

function layoutAt(x: number, z: number) {
  const layout = new BoxLayout();
  layout.positionX = x;
  layout.positionZ = z;
  layout.width = 2;
  layout.depth = 2;
  return layout;
}

let renderer: Awaited<ReturnType<typeof create>> | undefined;

afterEach(async () => {
  await act(async () => renderer?.unmount());
  renderer = undefined;
  labelPositions.clear();
  useLayoutStore.setState({ buildingLayouts: new Map() });
});

describe('CodeBuildingLabel', () => {
  // Filtering relayouts the city; labels mounted before must follow their
  // buildings instead of staying where the buildings used to be.
  it('moves with its building when the city is laid out again', async () => {
    useLayoutStore.setState({ buildingLayouts: new Map([['a', layoutAt(0, 0)]]) });
    renderer = await create(<CodeBuildingLabel buildingId="a" />);
    expect(labelPositions.get('Code building label of a')).toMatchObject({ x: 1, z: 1 });

    await act(async () => useLayoutStore.setState({ buildingLayouts: new Map([['a', layoutAt(10, 20)]]) }));

    expect(labelPositions.get('Code building label of a')).toMatchObject({ x: 11, z: 21 });
  });
});
