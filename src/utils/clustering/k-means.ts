import * as THREE from 'three';
import { ClusterCentroid } from '../../stores/cluster-store';
import { getWorldPositionOfModel } from '../layout-helper';

export interface ClusteringResult {
  entityToCluster: Map<string, number>;
  centroids: Map<number, ClusterCentroid>;
}

/**
 * Calculates the Euclidean distance between two 3D points
 */
function euclideanDistance(
  point1: THREE.Vector3,
  point2: THREE.Vector3
): number {
  return point1.distanceTo(point2);
}

/**
 * Initializes k centroids using the k-means++ initialization algorithm
 */
function initializeCentroids(
  points: THREE.Vector3[],
  k: number
): THREE.Vector3[] {
  if (points.length === 0 || k === 0) {
    return [];
  }

  const centroids: THREE.Vector3[] = [];

  // First centroid: choose randomly
  const firstIndex = Math.floor(Math.random() * points.length);
  centroids.push(points[firstIndex].clone());

  // Choose remaining centroids using k-means++ algorithm
  for (let i = 1; i < k; i++) {
    const distances: number[] = [];

    // Calculate distance from each point to nearest centroid
    for (const point of points) {
      let minDistance = Infinity;
      for (const centroid of centroids) {
        const distance = euclideanDistance(point, centroid);
        minDistance = Math.min(minDistance, distance);
      }
      distances.push(minDistance);
    }

    // Choose next centroid with probability proportional to distance squared
    const sumSquaredDistances = distances.reduce(
      (sum, dist) => sum + dist * dist,
      0
    );

    let random = Math.random() * sumSquaredDistances;
    let selectedIndex = 0;

    for (let j = 0; j < distances.length; j++) {
      random -= distances[j] * distances[j];
      if (random <= 0) {
        selectedIndex = j;
        break;
      }
    }

    centroids.push(points[selectedIndex].clone());
  }

  return centroids;
}

/**
 * Assigns each point to the nearest centroid
 */
function assignClusters(
  points: THREE.Vector3[],
  centroids: THREE.Vector3[]
): number[] {
  const assignments: number[] = [];

  for (const point of points) {
    let minDistance = Infinity;
    let nearestCluster = 0;

    for (let i = 0; i < centroids.length; i++) {
      const distance = euclideanDistance(point, centroids[i]);
      if (distance < minDistance) {
        minDistance = distance;
        nearestCluster = i;
      }
    }

    assignments.push(nearestCluster);
  }

  return assignments;
}

/**
 * Updates centroids based on current cluster assignments
 */
function updateCentroids(
  points: THREE.Vector3[],
  assignments: number[],
  k: number
): THREE.Vector3[] {
  const newCentroids: THREE.Vector3[] = [];
  const clusterSums: THREE.Vector3[] = [];
  const clusterCounts: number[] = [];

  // Initialize
  for (let i = 0; i < k; i++) {
    clusterSums.push(new THREE.Vector3(0, 0, 0));
    clusterCounts.push(0);
  }

  // Sum points in each cluster
  for (let i = 0; i < points.length; i++) {
    const clusterId = assignments[i];
    clusterSums[clusterId].add(points[i]);
    clusterCounts[clusterId]++;
  }

  // Calculate new centroids
  for (let i = 0; i < k; i++) {
    if (clusterCounts[i] > 0) {
      newCentroids.push(clusterSums[i].divideScalar(clusterCounts[i]));
    } else {
      // If cluster is empty, keep the old centroid or reinitialize
      newCentroids.push(new THREE.Vector3(0, 0, 0));
    }
  }

  return newCentroids;
}

/**
 * Checks if centroids have converged (changed less than threshold)
 */
function hasConverged(
  oldCentroids: THREE.Vector3[],
  newCentroids: THREE.Vector3[],
  threshold: number = 0.01
): boolean {
  if (oldCentroids.length !== newCentroids.length) {
    return false;
  }

  for (let i = 0; i < oldCentroids.length; i++) {
    const distance = euclideanDistance(oldCentroids[i], newCentroids[i]);
    if (distance > threshold) {
      return false;
    }
  }

  return true;
}

/**
 * Performs k-means clustering on 3D points
 *
 * @param points Array of 3D points to cluster
 * @param k Number of clusters
 * @param maxIterations Maximum number of iterations (default: 100)
 * @param convergenceThreshold Threshold for convergence (default: 0.01)
 * @returns Mapping of point indices to cluster IDs and cluster centroids
 */
export function kMeansClustering(
  points: THREE.Vector3[],
  k: number,
  maxIterations: number = 100,
  convergenceThreshold: number = 0.01
): { assignments: number[]; centroids: THREE.Vector3[] } {
  if (points.length === 0) {
    return { assignments: [], centroids: [] };
  }

  if (k <= 0 || k > points.length) {
    k = Math.max(1, Math.min(k, points.length));
  }

  // Initialize centroids
  let centroids = initializeCentroids(points, k);
  let assignments: number[] = [];

  // Iterate until convergence or max iterations
  for (let iteration = 0; iteration < maxIterations; iteration++) {
    const oldCentroids = centroids.map((c) => c.clone());

    // Assign points to nearest centroids
    assignments = assignClusters(points, centroids);

    // Update centroids
    centroids = updateCentroids(points, assignments, k);

    // Check for convergence
    if (hasConverged(oldCentroids, centroids, convergenceThreshold)) {
      break;
    }
  }

  return { assignments, centroids };
}

/**
 * Clusters entities based on their 3D world positions
 *
 * @param entityIds Array of entity IDs (e.g. classes / packages) to cluster
 * @param normalizedClusterCount Normalized value from 0 to 1:
 *   - 0 = 1 cluster (all entities in one cluster)
 *   - 1 = one cluster per entity (each entity is its own cluster)
 * @returns Clustering result with entity-to-cluster mapping and centroids
 */
export function clusterEntities(
  entityIds: string[],
  normalizedClusterCount: number = 0.3
): ClusteringResult {
  if (entityIds.length === 0) {
    return {
      entityToCluster: new Map<string, number>(),
      centroids: new Map<number, ClusterCentroid>(),
    };
  }

  // Get world positions for each entity
  const points: THREE.Vector3[] = [];
  const validEntityIds: string[] = [];

  for (const entityId of entityIds) {
    const worldPosition = getWorldPositionOfModel(entityId);
    if (worldPosition) {
      validEntityIds.push(entityId);
      points.push(worldPosition);
    }
  }

  if (points.length === 0) {
    return {
      entityToCluster: new Map<string, number>(),
      centroids: new Map<number, ClusterCentroid>(),
    };
  }

  // Clamp normalized value to [0, 1]
  const normalized = Math.max(0, Math.min(1, normalizedClusterCount));

  // Calculate number of clusters from normalized value
  // normalized = 0 -> k = 1 (all entities in one cluster)
  // normalized = 1 -> k = n (one cluster per entity)
  const n = points.length;
  const k = Math.max(1, Math.min(n, 1 + Math.floor(normalized * (n - 1))));

  // Perform k-means clustering
  const { assignments, centroids } = kMeansClustering(points, k);

  // Create entity-to-cluster mapping
  const entityToCluster = new Map<string, number>();
  for (let i = 0; i < validEntityIds.length; i++) {
    entityToCluster.set(validEntityIds[i], assignments[i]);
  }

  // Create centroids map with IDs
  const centroidsMap = new Map<number, ClusterCentroid>();
  for (let i = 0; i < centroids.length; i++) {
    centroidsMap.set(i, {
      id: i,
      position: centroids[i],
    });
  }

  return {
    entityToCluster,
    centroids: centroidsMap,
  };
}
