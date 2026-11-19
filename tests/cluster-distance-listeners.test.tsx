import { act, create } from '@react-three/test-renderer';
import { Vector3 } from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useClusterStore, useIsWithinCentroidDistance } from '../src/stores/cluster-store';

const rendered = vi.fn();

function Label({ entityId, threshold, enabled }: { entityId: string; threshold: number; enabled?: boolean }) {
  rendered(entityId, useIsWithinCentroidDistance(entityId, threshold, true, enabled));
  return null;
}

const moveCameraTo = (x: number) =>
  act(async () => useClusterStore.getState().calculateDistanceToCamera(new Vector3(x, 0, 0)));

let renderer: Awaited<ReturnType<typeof create>> | undefined;

beforeEach(() => {
  useClusterStore.setState(useClusterStore.getInitialState(), true);
  // Two clusters, at x = 0 and x = 100; the camera starts at x = 50.
  useClusterStore.getState().setClusters(
    new Map([
      ['near', 0],
      ['alsoNear', 0],
      ['far', 1],
    ]),
    new Map([
      [0, { id: 0, position: new Vector3(0, 0, 0) }],
      [1, { id: 1, position: new Vector3(100, 0, 0) }],
    ]),
    new Vector3(50, 0, 0)
  );
});

afterEach(async () => {
  await act(async () => renderer?.unmount());
  renderer = undefined;
});

describe('useIsWithinCentroidDistance', () => {
  it('re-renders a label only when its own answer changes', async () => {
    renderer = await create(
      <>
        <Label entityId="near" threshold={10} />
        <Label entityId="alsoNear" threshold={30} />
        <Label entityId="far" threshold={10} />
      </>
    );
    expect(rendered.mock.calls).toEqual([
      ['near', false],
      ['alsoNear', false],
      ['far', false],
    ]);
    rendered.mockClear();

    // Still further away than every threshold.
    await moveCameraTo(40);
    expect(rendered).not.toHaveBeenCalled();

    // Within 30 of the first cluster, not within 10.
    await moveCameraTo(20);
    expect(rendered.mock.calls).toEqual([['alsoNear', true]]);
    rendered.mockClear();

    await moveCameraTo(10);
    expect(rendered.mock.calls).toEqual([['near', true]]);
    rendered.mockClear();

    // Moving on within range changes nothing.
    await moveCameraTo(5);
    expect(rendered).not.toHaveBeenCalled();

    await moveCameraTo(95);
    expect(rendered.mock.calls).toEqual([
      ['near', false],
      ['alsoNear', false],
      ['far', true],
    ]);
  });

  it('follows a threshold range that shrinks when a label unmounts', async () => {
    renderer = await create(
      <>
        <Label entityId="near" threshold={10} />
        <Label entityId="alsoNear" threshold={30} />
      </>
    );
    await act(async () => renderer!.update(<Label entityId="near" threshold={10} />));
    rendered.mockClear();

    await moveCameraTo(20);
    expect(rendered).not.toHaveBeenCalled();
    await moveCameraTo(10);
    expect(rendered.mock.calls).toEqual([['near', true]]);
  });

  it('answers anew when the clusters are replaced', async () => {
    renderer = await create(<Label entityId="far" threshold={10} />);
    rendered.mockClear();

    await act(async () =>
      useClusterStore
        .getState()
        .setClusters(
          new Map([['far', 0]]),
          new Map([[0, { id: 0, position: new Vector3(45, 0, 0) }]]),
          new Vector3(50, 0, 0)
        )
    );
    expect(rendered.mock.calls).toEqual([['far', true]]);
    rendered.mockClear();

    // Without a cluster the fallback applies.
    await act(async () => useClusterStore.getState().clearClusters());
    await moveCameraTo(1000);
    expect(rendered).not.toHaveBeenCalled();
    await act(async () =>
      useClusterStore.getState().setClusters(new Map([['far', 0]]), new Map([[0, { id: 0, position: new Vector3() }]]))
    );
    expect(rendered).not.toHaveBeenCalled();
    await moveCameraTo(1000);
    expect(rendered.mock.calls).toEqual([['far', false]]);
  });

  it('answers false and stays quiet while not enabled', async () => {
    renderer = await create(<Label entityId="near" threshold={10} enabled={false} />);
    expect(rendered.mock.calls).toEqual([['near', false]]);
    rendered.mockClear();

    await moveCameraTo(0);
    expect(rendered).not.toHaveBeenCalled();

    await act(async () => renderer!.update(<Label entityId="near" threshold={10} enabled />));
    expect(rendered.mock.calls.at(-1)).toEqual(['near', true]);
  });
});
