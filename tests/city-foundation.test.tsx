import { act, create } from '@react-three/test-renderer';
import { Color, Mesh, MeshBasicMaterial, Vector3 } from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import BoxLayout from '../src/utils/layout/box-layout';
import CityFoundation from '../src/view-objects/3d/city/city-foundation';
import { city } from './fixtures/landscape';

// Isolate global application services; keep React, R3F, Three.js, gesture handling
// and reactive Zustand subscriptions real. Font loading belongs in browser tests.
vi.mock('@react-three/drei', () => ({
  Text: ({ children, ...props }: { children: string }) => <group {...props} name={children} />,
}));
vi.mock('../src/stores/user-settings', async () => {
  const { create } = await import('zustand');
  return {
    useUserSettingsStore: create(() => ({ visualizationSettings: {} })),
  };
});
vi.mock('../src/stores/visualization-store', async () => {
  const { create } = await import('zustand');
  const store = create((set) => ({
    sceneLayers: { Foundation: 1, Label: 2 },
    highlightedEntityIds: new Set<string>(),
    hoveredEntityId: null,
    actions: {
      setHoveredEntityId: (id: string | null) => set({ hoveredEntityId: id }),
    },
  }));
  return { useVisualizationStore: store };
});
vi.mock('../src/stores/popup-handler', async () => {
  const { create } = await import('zustand');
  return { usePopupHandlerStore: create(() => ({ addPopup: vi.fn() })) };
});
vi.mock('../src/utils/city-rendering/entity-manipulation', () => ({
  closeAllDistrictsInCity: vi.fn(),
}));
vi.mock('../src/utils/city-rendering/highlighting', () => ({
  getHighlightingColorForEntity: () => new Color('#ff0000'),
}));
// Alone, the highlights module shows the own highlights of the visualization store.
vi.mock('../src/utils/collaboration/highlights', async () => {
  const { useVisualizationStore } = await import('../src/stores/visualization-store');
  return {
    useHighlights: (select: (ids: Set<string>) => unknown) =>
      useVisualizationStore((state: any) => select(state.highlightedEntityIds)),
  };
});
vi.mock('../src/utils/annotation-utils', () => ({
  getEntityDisplayName: (name: string) => name,
}));
vi.mock('../src/utils/context-menu-bridge', () => ({
  emitContextMenuFromWorld: vi.fn(),
}));

import { usePopupHandlerStore } from '../src/stores/popup-handler';
import { useUserSettingsStore } from '../src/stores/user-settings';
import { useVisualizationStore } from '../src/stores/visualization-store';
import { closeAllDistrictsInCity } from '../src/utils/city-rendering/entity-manipulation';
import { emitContextMenuFromWorld } from '../src/utils/context-menu-bridge';

let renderer: Awaited<ReturnType<typeof create>> | undefined;
const layout = () =>
  Object.assign(new BoxLayout(), {
    width: 10,
    height: 2,
    depth: 6,
    positionY: 3,
  });
const settings = () => ({
  cityLabelMargin: { value: 2 },
  labelOffset: { value: 0.1 },
  castShadows: { value: true },
  enableAnimations: { value: false },
  enableHoverEffects: { value: true },
  foundationColor: { value: '#336699' },
  cityColorOverrides: { value: { modelType: {} } },
  cityGeometryOverrides: { value: { modelType: {} } },
  foundationTextColor: { value: '#ffffff' },
  districtLabelPlacement: { value: 'bottom' },
  entityOpacity: { value: 1 },
});
function setSettings(overrides: Partial<ReturnType<typeof settings>> = {}) {
  // Only the service boundary is stubbed; the component still selects its settings normally.
  useUserSettingsStore.setState({
    visualizationSettings: { ...settings(), ...overrides },
  } as unknown as Parameters<typeof useUserSettingsStore.setState>[0]);
}
beforeEach(() => {
  setSettings();
  useVisualizationStore.setState({
    highlightedEntityIds: new Set(),
    hoveredEntityId: null,
  });
});
afterEach(async () => {
  await renderer?.unmount();
  renderer = undefined;
});
const mesh = () => renderer!.scene.findByType('Mesh').instance as Mesh;

describe('city foundation scene', () => {
  it('renders layout dimensions, identity, material and an undistorted label', async () => {
    renderer = await create(<CityFoundation city={city} layout={layout()} />);
    const foundation = mesh();
    expect(foundation.name).toBe('Foundation of Shop');
    expect(foundation.scale.toArray()).toEqual([10, 2, 6]);
    expect(foundation.position.toArray()).toEqual([5, 4, 3]);
    expect(foundation.userData.explorvizEntity).toEqual({
      type: 'city',
      entityId: 'city',
    });
    expect(foundation.geometry.type).toBe('BoxGeometry');
    expect((foundation.material as MeshBasicMaterial).color.getHexString()).toBe('336699');
    foundation.updateMatrixWorld(true);
    const label = foundation.getObjectByName('Shop')!;
    expect(label.getWorldScale(new Vector3()).toArray()).toEqual([1, 1, 1]);
    expect(label.getWorldPosition(new Vector3()).y).toBeCloseTo(5.12);
  });

  it('reacts to highlighting and opacity changes', async () => {
    renderer = await create(<CityFoundation city={city} layout={layout()} />);
    await act(async () => {
      useVisualizationStore.setState({
        highlightedEntityIds: new Set([city.id]),
      });
      setSettings({ entityOpacity: { value: 0.4 } });
    });
    const material = mesh().material as MeshBasicMaterial;
    expect(material.color.getHexString()).toBe('ff0000');
    expect(material.opacity).toBe(0.4);
    expect(material.transparent).toBe(true);
  });

  it('uses cylinders only for empty cities and preserves the foundation base', async () => {
    setSettings({
      cityGeometryOverrides: { value: { modelType: { code: 'Cylinder' } } },
    });
    const emptyCity = { ...city, districtIds: [], buildingIds: [] };
    renderer = await create(<CityFoundation city={emptyCity} layout={layout()} />);
    expect(mesh().geometry.type).toBe('CylinderGeometry');
    expect(mesh().scale.toArray()).toEqual([5, 8, 3]);
    expect(mesh().position.y - mesh().scale.y / 2).toBe(3);
    await renderer.update(<CityFoundation city={city} layout={layout()} />);
    expect(mesh().geometry.type).toBe('BoxGeometry');
    expect(mesh().scale.toArray()).toEqual([10, 2, 6]);
  });

  it('updates geometry on layout changes and hides labels below the margin threshold', async () => {
    setSettings({ cityLabelMargin: { value: 1 } });
    renderer = await create(<CityFoundation city={city} layout={layout()} />);
    expect(mesh().children).toHaveLength(0);
    await renderer.update(<CityFoundation city={city} layout={Object.assign(layout(), { width: 20, positionY: 7 })} />);
    expect(mesh().scale.x).toBe(20);
    expect(mesh().position.toArray()).toEqual([10, 8, 3]);
  });

  it('connects hover and double-click events to the selected city', async () => {
    renderer = await create(<CityFoundation city={city} layout={layout()} />);
    const node = renderer.scene.findByType('Mesh');
    await renderer.fireEvent(node, 'pointerOver');
    expect(useVisualizationStore.getState().hoveredEntityId).toBe(city.id);
    await renderer.fireEvent(node, 'pointerOut');
    expect(useVisualizationStore.getState().hoveredEntityId).toBeNull();
    await renderer.fireEvent(node, 'doubleClick');
    expect(closeAllDistrictsInCity).toHaveBeenCalledExactlyOnceWith(city);
  });

  it('opens a popup and context menu through real delayed R3F event handlers', async () => {
    renderer = await create(<CityFoundation city={city} layout={layout()} />);
    vi.useFakeTimers();
    const node = renderer.scene.findByType('Mesh');
    const nativeEvent = { clientX: 20, clientY: 30 };
    // fireEvent awaits the handler's promise, so advance the clock before awaiting it.
    const click = renderer.fireEvent(node, 'click', {
      nativeEvent,
      clientX: 20,
      clientY: 30,
      delta: 0,
    });
    await vi.advanceTimersByTimeAsync(250);
    await click;
    expect(usePopupHandlerStore.getState().addPopup).toHaveBeenCalledWith({
      entityId: city.id,
      entity: city,
      position: { x: 20, y: 30 },
    });
    const context = renderer.fireEvent(node, 'contextMenu', {
      nativeEvent,
      delta: 0,
    });
    await vi.advanceTimersByTimeAsync(150);
    await context;
    expect(emitContextMenuFromWorld).toHaveBeenCalledWith({ kind: 'city', cityId: city.id }, nativeEvent);
  });
});
