import { Vector3 } from 'three';
import { beforeEach, describe, expect, it } from 'vitest';
import { useClusterStore } from '../src/stores/cluster-store';
import { useCommunicationStore } from '../src/stores/communication-store';
import { communication } from './fixtures/landscape';

beforeEach(() => {
  useClusterStore.setState(useClusterStore.getInitialState(), true);
  useCommunicationStore.setState(useCommunicationStore.getInitialState(), true);
});

describe('semantic zoom clusters', () => {
  it('indexes members in both directions and seeds distances in the same update', () => {
    const centroid = { id: 0, position: new Vector3(3, 4, 0) };
    useClusterStore.getState().setClusters(
      new Map([
        ['a', 0],
        ['b', 0],
      ]),
      new Map([[0, centroid]]),
      new Vector3()
    );
    const state = useClusterStore.getState();
    expect(state.getClusterId('a')).toBe(0);
    expect(state.getCentroid(0)).toEqual(centroid);
    expect(state.getCentroidForEntityId('b')).toEqual(centroid);
    expect(state.getEntitiesInCluster(0)).toEqual(['a', 'b']);
    expect(state.getCentroidDistance('a')).toBe(5);
    expect(state.getAllClusters().size).toBe(1);
    expect(state.getAllCentroidDistances().size).toBe(1);
    expect(state.getCentroidForEntityId('missing')).toBeUndefined();
    expect(state.getCentroidDistance('missing')).toBeUndefined();
    expect(state.getEntitiesInCluster(99)).toEqual([]);
  });

  it('recalculates distances immutably and discards stale clusters on replacement', () => {
    const state = useClusterStore.getState();
    state.setClusters(new Map([['a', 1]]), new Map([[1, { id: 1, position: new Vector3(3, 4, 0) }]]));
    const previous = useClusterStore.getState().centroidDistances;
    state.calculateDistanceToCamera(new Vector3(3, 0, 0));
    expect(state.getCentroidDistance('a')).toBe(4);
    expect(previous.size).toBe(0);
    state.setClusters(new Map(), new Map());
    expect(state.getEntitiesInCluster(1)).toEqual([]);
    expect(state.getCentroidDistance('a')).toBeUndefined();
  });

  it('clears all indices and distances', () => {
    const state = useClusterStore.getState();
    state.setClusters(new Map([['a', 1]]), new Map([[1, { id: 1, position: new Vector3() }]]), new Vector3());
    state.clearClusters();
    expect(useClusterStore.getState()).toEqual(useClusterStore.getInitialState());
  });
});

it('replaces communication indices and metrics together, including reset', () => {
  const summary = {
    communications: [communication],
    fromUnixNano: 0n,
    toUnixNano: 100n,
    metrics: { count: { min: 3, max: 3 } },
  };
  useCommunicationStore.getState().setCommunications(summary);
  expect(useCommunicationStore.getState().communicationById.get('call')).toEqual(communication);
  expect(useCommunicationStore.getState().metrics).toEqual(summary.metrics);
  useCommunicationStore.getState().setCommunications({ ...summary, communications: [] });
  expect(useCommunicationStore.getState().communicationById.size).toBe(0);
  useCommunicationStore.getState().setCommunications(null);
  expect(useCommunicationStore.getState()).toEqual(useCommunicationStore.getInitialState());
});
