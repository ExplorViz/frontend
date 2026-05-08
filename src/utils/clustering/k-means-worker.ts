/// <reference lib="webworker" />

/**
 * Web Worker for k-means++ clustering.
 *
 * Works entirely on flat Float32Array / Int32Array buffers (no THREE.js) so
 * the ArrayBuffers can be *transferred* (zero-copy) between main thread and
 * worker via the Transferable mechanism.
 *
 * Protocol
 * --------
 * Input  (main r-> worker):
 *   { id, points: Float32Array, k, maxIterations?, convergenceThreshold? }
 *   `points` is packed as [x0,y0,z0, x1,y1,z1, …] and its buffer is
 *   transferred so the main thread must not use it after posting.
 *
 * Output (worker -> main, with transfer):
 *   { id, assignments: Int32Array, centroids: Float32Array }
 *   Both buffers are transferred back.
 */

interface KMeansInput {
  id: number;
  points: Float32Array;
  k: number;
  maxIterations?: number;
  convergenceThreshold?: number;
}

interface KMeansOutput {
  id: number;
  assignments: Int32Array;
  centroids: Float32Array;
}

// ---------------------------------------------------------------------------
// Core k-means helpers (raw array, no object allocation in hot path)
// ---------------------------------------------------------------------------

/**
 * Squared Euclidean distance between point[pi] (packed x,y,z) and a
 * centroid described by (cx, cy, cz).
 * Using squared distance avoids Math.sqrt in the assignment hot-path.
 */
function sqDist(
  points: Float32Array,
  pi: number,
  cx: number,
  cy: number,
  cz: number
): number {
  const dx = points[pi * 3] - cx;
  const dy = points[pi * 3 + 1] - cy;
  const dz = points[pi * 3 + 2] - cz;
  return dx * dx + dy * dy + dz * dz;
}

/**
 * k-means++ initialization.
 * Returns a Float32Array of length k*3 with the initial centroid coordinates.
 */
function initializeCentroids(
  points: Float32Array,
  n: number,
  k: number
): Float32Array {
  const centroids = new Float32Array(k * 3);
  const distances = new Float32Array(n);

  // First centroid: a random data point
  const fi = Math.floor(Math.random() * n) * 3;
  centroids[0] = points[fi];
  centroids[1] = points[fi + 1];
  centroids[2] = points[fi + 2];

  for (let ci = 1; ci < k; ci++) {
    // Min squared distance from each point to the nearest existing centroid
    let sumSq = 0;
    for (let pi = 0; pi < n; pi++) {
      let minSq = Infinity;
      for (let cj = 0; cj < ci; cj++) {
        const d = sqDist(
          points,
          pi,
          centroids[cj * 3],
          centroids[cj * 3 + 1],
          centroids[cj * 3 + 2]
        );
        if (d < minSq) minSq = d;
      }
      distances[pi] = minSq;
      sumSq += minSq;
    }

    // Sample next centroid proportional to squared distance
    let r = Math.random() * sumSq;
    let selectedPi = n - 1;
    for (let pi = 0; pi < n; pi++) {
      r -= distances[pi];
      if (r <= 0) {
        selectedPi = pi;
        break;
      }
    }

    const si = selectedPi * 3;
    centroids[ci * 3] = points[si];
    centroids[ci * 3 + 1] = points[si + 1];
    centroids[ci * 3 + 2] = points[si + 2];
  }

  return centroids;
}

/**
 * Lloyd's algorithm on packed Float32Array points.
 * Pre-allocated scratch buffers are reused across iterations to keep GC
 * pressure minimal.
 */
function kMeansRaw(
  points: Float32Array,
  k: number,
  maxIterations: number,
  convergenceThreshold: number
): { assignments: Int32Array; centroids: Float32Array } {
  const n = points.length / 3;

  if (n === 0 || k === 0) {
    return { assignments: new Int32Array(0), centroids: new Float32Array(0) };
  }

  k = Math.max(1, Math.min(k, n));

  let centroids = initializeCentroids(points, n, k);
  const assignments = new Int32Array(n);
  const clusterSums = new Float32Array(k * 3);
  const clusterCounts = new Int32Array(k);
  const prevCentroids = new Float32Array(k * 3);

  // Compare squared movement to avoid sqrt in convergence check
  const convThresholdSq = convergenceThreshold * convergenceThreshold;

  for (let iter = 0; iter < maxIterations; iter++) {
    prevCentroids.set(centroids);

    // ------------------------------------------------------------------
    // Assignment step: nearest centroid by squared Euclidean distance
    // ------------------------------------------------------------------
    for (let pi = 0; pi < n; pi++) {
      const px = points[pi * 3];
      const py = points[pi * 3 + 1];
      const pz = points[pi * 3 + 2];
      let minSq = Infinity;
      let nearest = 0;
      for (let ci = 0; ci < k; ci++) {
        const dx = px - centroids[ci * 3];
        const dy = py - centroids[ci * 3 + 1];
        const dz = pz - centroids[ci * 3 + 2];
        const sq = dx * dx + dy * dy + dz * dz;
        if (sq < minSq) {
          minSq = sq;
          nearest = ci;
        }
      }
      assignments[pi] = nearest;
    }

    // ------------------------------------------------------------------
    // Update step: recompute centroids as cluster means
    // ------------------------------------------------------------------
    clusterSums.fill(0);
    clusterCounts.fill(0);

    for (let pi = 0; pi < n; pi++) {
      const ci = assignments[pi];
      clusterSums[ci * 3] += points[pi * 3];
      clusterSums[ci * 3 + 1] += points[pi * 3 + 1];
      clusterSums[ci * 3 + 2] += points[pi * 3 + 2];
      clusterCounts[ci]++;
    }

    for (let ci = 0; ci < k; ci++) {
      const cnt = clusterCounts[ci];
      if (cnt > 0) {
        const inv = 1 / cnt;
        centroids[ci * 3] = clusterSums[ci * 3] * inv;
        centroids[ci * 3 + 1] = clusterSums[ci * 3 + 1] * inv;
        centroids[ci * 3 + 2] = clusterSums[ci * 3 + 2] * inv;
      }
      // Empty clusters retain their previous position
    }

    // ------------------------------------------------------------------
    // Convergence check (squared threshold, no sqrt)
    // ------------------------------------------------------------------
    let converged = true;
    for (let ci = 0; ci < k; ci++) {
      const dx = centroids[ci * 3] - prevCentroids[ci * 3];
      const dy = centroids[ci * 3 + 1] - prevCentroids[ci * 3 + 1];
      const dz = centroids[ci * 3 + 2] - prevCentroids[ci * 3 + 2];
      if (dx * dx + dy * dy + dz * dz > convThresholdSq) {
        converged = false;
        break;
      }
    }
    if (converged) break;
  }

  return { assignments, centroids };
}

// ---------------------------------------------------------------------------
// Worker message handler
// ---------------------------------------------------------------------------

self.onmessage = (event: MessageEvent<KMeansInput>) => {
  const {
    id,
    points,
    k,
    maxIterations = 100,
    convergenceThreshold = 0.01,
  } = event.data;

  const { assignments, centroids } = kMeansRaw(
    points,
    k,
    maxIterations,
    convergenceThreshold
  );

  const output: KMeansOutput = { id, assignments, centroids };

  // Transfer typed array buffers back to avoid copying
  self.postMessage(output, [assignments.buffer, centroids.buffer]);
};
