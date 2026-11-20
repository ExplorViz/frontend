import { act, create } from '@react-three/test-renderer';
import { afterEach, describe, expect, it, vi } from 'vitest';

// Counts renders of the label through its first hook; everything else is a
// minimal stand-in for the global stores the label reads.
const labelRendered = vi.hoisted(() => vi.fn());

vi.mock('@react-three/drei', () => ({ Text: () => null }));
vi.mock('../src/utils/city-rendering/immersive-building-animation', () => ({}));
vi.mock('../src/utils/settings/building-metrics', () => ({}));
vi.mock('../src/utils/annotation-utils', () => ({ getTruncatedDisplayName: (name: string) => name }));
vi.mock('../src/stores/repos/model-repository', () => ({
  useModelStore: {
    getState: () => ({
      getBuilding: (id: string) => ({ id, name: id, parentCityId: 'city', parentDistrictId: 'district' }),
    }),
  },
}));
vi.mock('../src/stores/visualization-store', async () => {
  const { create } = await import('zustand');
  const store = create(() => ({ hoveredEntityId: null }));
  return {
    useVisualizationStore: (selector: (state: unknown) => unknown) => {
      labelRendered();
      return store(selector);
    },
  };
});
vi.mock('../src/utils/collaboration/highlights', () => ({
  useHighlights: (select: (ids: Set<string>) => unknown) => select(new Set()),
}));
vi.mock('../src/stores/user-settings', async () => {
  const { create } = await import('zustand');
  return {
    useUserSettingsStore: create(() => ({
      visualizationSettings: {
        showAllBuildingLabels: { value: false },
        labelDistanceThreshold: { value: 1 },
        enableClustering: { value: false },
      },
    })),
  };
});
vi.mock('../src/stores/immersive-view-store', async () => {
  const { create } = await import('zustand');
  return { useImmersiveViewStore: create(() => ({ immersiveLabelBuildingId: null })) };
});
vi.mock('../src/stores/layout-store', () => ({ useBuildingLayout: () => undefined }));
vi.mock('../src/stores/cluster-store', () => ({ useIsWithinCentroidDistance: () => false }));

import CodeBuildingLabel from '../src/view-objects/3d/city/code-building-label';

const BUILDING_IDS = ['a', 'b', 'c'];

function City({ position }: { position: number }) {
  return (
    <group position={[position, 0, 0]}>
      {BUILDING_IDS.map((buildingId) => (
        <CodeBuildingLabel key={buildingId} buildingId={buildingId} />
      ))}
    </group>
  );
}

let renderer: Awaited<ReturnType<typeof create>> | undefined;

afterEach(async () => {
  await act(async () => renderer?.unmount());
  renderer = undefined;
  labelRendered.mockClear();
});

describe('CodeBuildingLabel', () => {
  // A large landscape has one label per building; re-rendering them all for
  // every re-render of their city made unrelated UI interactions slow.
  it('does not re-render when its city re-renders', async () => {
    renderer = await create(<City position={0} />);
    expect(labelRendered).toHaveBeenCalledTimes(BUILDING_IDS.length);
    labelRendered.mockClear();

    await act(async () => renderer!.update(<City position={1} />));

    expect(labelRendered).not.toHaveBeenCalled();
  });
});
