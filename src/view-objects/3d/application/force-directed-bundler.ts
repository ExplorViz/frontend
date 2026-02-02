import * as THREE from 'three';

export interface CommunicationEdge {
  id: string;
  startPoint: THREE.Vector3;
  endPoint: THREE.Vector3;
  controlPoints: THREE.Vector3[];
  appPair: string;
  stability: number;
}

export class ForceDirectedBundler {
  private edges: Map<string, CommunicationEdge> = new Map();
  private stiffness: number = 0.42;
  private repulsion: number = 0.03;
  private damping: number = 0.88;
  private compatibilityThreshold: number = 0.25;

  // Stability tracking
  private movementHistory: number[] = [];
  private readonly stabilityThreshold = 0.008; // Movement < 0.005 units = stable
  private readonly minStableFrames = 8; // Min. 8 stable Frames

  private bundleStrengthMultiplier: number = 1.8; // higher attraction

  constructor(
    config?: Partial<{
      stiffness: number;
      repulsion: number;
      damping: number;
      compatibilityThreshold: number;
      stabilityThreshold: number;
      bundleStrength: number;
    }>
  ) {
    Object.assign(this, config);
  }

  public addInterAppEdge(
    id: string,
    startPoint: THREE.Vector3,
    endPoint: THREE.Vector3,
    app1Id: string,
    app2Id: string
  ): void {
    if (app1Id === app2Id) return;

    const appPair = [app1Id, app2Id].sort().join('_');
    const controlPoints = this.createInitialControlPoints(startPoint, endPoint);

    this.edges.set(id, {
      id,
      startPoint: startPoint.clone(),
      endPoint: endPoint.clone(),
      controlPoints,
      appPair,
      stability: 0,
    });
  }

  private createInitialControlPoints(
    start: THREE.Vector3,
    end: THREE.Vector3
  ): THREE.Vector3[] {
    const points: THREE.Vector3[] = [];
    const segments = 3;
    const direction = new THREE.Vector3().subVectors(end, start);
    const length = direction.length();

    for (let i = 1; i <= segments; i++) {
      const t = i / (segments + 1);
      const point = new THREE.Vector3()
        .copy(start)
        .add(direction.clone().multiplyScalar(t));

      point.y += length * 0.12;
      points.push(point);
    }

    return points;
  }

  private calculateCompatibility(
    edge1: CommunicationEdge,
    edge2: CommunicationEdge
  ): number {
    // 1. APP-PAIR BONUS
    let appPairBonus = 1.0;
    if (edge1.appPair === edge2.appPair) {
      appPairBonus = 2.5;
    }

    // 2. ANGLE-COMPATIBILITY
    const dir1 = new THREE.Vector3()
      .subVectors(edge1.endPoint, edge1.startPoint)
      .normalize();
    const dir2 = new THREE.Vector3()
      .subVectors(edge2.endPoint, edge2.startPoint)
      .normalize();
    const angleComp = Math.max(0, dir1.dot(dir2));
    const angleCompSquared = angleComp * angleComp;

    // 3. POSITION-COMPATIBILITY
    const mid1 = new THREE.Vector3()
      .addVectors(edge1.startPoint, edge1.endPoint)
      .multiplyScalar(0.5);
    const mid2 = new THREE.Vector3()
      .addVectors(edge2.startPoint, edge2.endPoint)
      .multiplyScalar(0.5);
    const dist = mid1.distanceTo(mid2);
    const avgLength =
      (edge1.startPoint.distanceTo(edge1.endPoint) +
        edge2.startPoint.distanceTo(edge2.endPoint)) /
      2;

    // More compatibility for larger distances
    const positionComp = Math.exp(-dist / (avgLength * 1.5));

    // Compatibility sum
    return angleCompSquared * positionComp * appPairBonus;
  }
  /**
   * Returns after on interation if there is still movement
   * @returns true = still movement, false = system is stable
   */
  public update(): boolean {
    if (this.edges.size === 0) return false;

    const edgesArray = Array.from(this.edges.values());
    let totalMovement = 0;
    let maxMovement = 0;

    // Save old positions for movement detection
    const oldPositions = new Map<string, THREE.Vector3[]>();
    edgesArray.forEach((edge) => {
      oldPositions.set(
        edge.id,
        edge.controlPoints.map((p) => p.clone())
      );
    });

    edgesArray.forEach((edge, i) => {
      edge.controlPoints.forEach((point, pointIndex) => {
        const force = new THREE.Vector3(0, 0, 0);
        let compatibilitySum = 0;
        let compatibleEdges = 0;

        edgesArray.forEach((otherEdge, j) => {
          if (i === j || pointIndex >= otherEdge.controlPoints.length) return;

          const compatibility = this.calculateCompatibility(edge, otherEdge);

          if (compatibility > this.compatibilityThreshold) {
            const otherPoint = otherEdge.controlPoints[pointIndex];

            const attractionStrength =
              this.stiffness * compatibility * this.bundleStrengthMultiplier;
            const attraction = new THREE.Vector3()
              .subVectors(otherPoint, point)
              .multiplyScalar(attractionStrength);

            force.add(attraction);
            compatibilitySum += compatibility;
            compatibleEdges++;
          }
        });

        // Group attraction
        if (compatibleEdges > 0) {
          const avgAttraction = compatibilitySum / compatibleEdges;
          force.multiplyScalar(0.7 + 0.3 * avgAttraction);
        }

        const t = (pointIndex + 1) / (edge.controlPoints.length + 1);
        const targetHeight = edge.startPoint.distanceTo(edge.endPoint) * 0.18;
        const basePoint = new THREE.Vector3().lerpVectors(
          edge.startPoint,
          edge.endPoint,
          t
        );
        basePoint.y += targetHeight;

        const springForce = new THREE.Vector3()
          .subVectors(basePoint, point)
          .multiplyScalar(0.04);

        force.add(springForce);

        force.multiplyScalar(this.damping);
        point.add(force);
      });
    });

    // Calculate average movement
    const totalPoints = edgesArray.length * 3; // 3 control points per Edge
    const avgMovement = totalMovement / totalPoints;

    // Save movement history
    this.movementHistory.push(avgMovement);
    if (this.movementHistory.length > 20) {
      this.movementHistory.shift();
    }

    // Update stability for every edge
    edgesArray.forEach((edge) => {
      const oldPoints = oldPositions.get(edge.id)!;
      let edgeMovement = 0;
      edge.controlPoints.forEach((point, i) => {
        edgeMovement += point.distanceTo(oldPoints[i]);
      });

      edge.stability = Math.max(
        0,
        1 - edgeMovement / 3 / this.stabilityThreshold
      );
      edge.stability = Math.min(1, edge.stability);
    });

    // Check global stability
    const isStable = this.checkStability();

    return !isStable;
  }

  private checkStability(): boolean {
    if (this.movementHistory.length < this.minStableFrames) return false;

    // Check last frames
    const recentHistory = this.movementHistory.slice(-this.minStableFrames);
    const avgRecent =
      recentHistory.reduce((a, b) => a + b, 0) / recentHistory.length;
    const maxRecent = Math.max(...recentHistory);

    // Stable if average and max under threshold
    const isStable =
      avgRecent < this.stabilityThreshold &&
      maxRecent < this.stabilityThreshold * 2;

    return isStable;
  }

  public getEdgeControlPoints(edgeId: string): THREE.Vector3[] | null {
    const edge = this.edges.get(edgeId);
    if (!edge) return null;

    return edge.controlPoints.map((p) => p.clone());
  }

  public getEdgeStability(edgeId: string): number {
    const edge = this.edges.get(edgeId);
    return edge?.stability || 0;
  }

  public getGlobalStability(): number {
    if (this.edges.size === 0) return 1;

    const edgesArray = Array.from(this.edges.values());
    const avgStability =
      edgesArray.reduce((sum, edge) => sum + edge.stability, 0) /
      edgesArray.length;

    return avgStability;
  }

  public removeEdge(edgeId: string): void {
    this.edges.delete(edgeId);
  }

  public clear(): void {
    this.edges.clear();
    this.movementHistory = [];
  }

  public getStats(): {
    edgeCount: number;
    avgStability: number;
    isStable: boolean;
    recentMovement: number;
  } {
    const edgeCount = this.edges.size;
    const avgStability = this.getGlobalStability();
    const isStable = this.checkStability();
    const recentMovement =
      this.movementHistory.length > 0
        ? this.movementHistory[this.movementHistory.length - 1]
        : 0;

    return { edgeCount, avgStability, isStable, recentMovement };
  }
}
