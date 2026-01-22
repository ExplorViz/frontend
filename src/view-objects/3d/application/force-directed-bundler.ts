import * as THREE from 'three';

export interface CommunicationEdge {
  id: string;
  startPoint: THREE.Vector3;
  endPoint: THREE.Vector3;
  controlPoints: THREE.Vector3[];
  groupId?: string;
  stability: number;
  type: 'inter-app' | 'intra-app';
}

export class ForceDirectedBundler {
  private edges: Map<string, CommunicationEdge> = new Map();
  private stiffness: number = 0.42;
  private repulsion: number = 0.03;
  private damping: number = 0.88;
  private compatibilityThreshold: number = 0.25;
  private bundleStrength: number = 1.8;

  // Stability tracking
  private movementHistory: number[] = [];
  private readonly stabilityThreshold = 0.008;
  private readonly minStableFrames = 8;

  private groupingEnabled: boolean = true;
  private groupByApplication: boolean = true;
  private groupBySourceTarget: boolean = true;

  constructor(
    config?: Partial<{
      stiffness: number;
      repulsion: number;
      damping: number;
      compatibilityThreshold: number;
      stabilityThreshold: number;
      bundleStrength: number;
      groupingEnabled: boolean;
      groupByApplication: boolean;
      groupBySourceTarget: boolean;
    }>
  ) {
    Object.assign(this, config);
  }

  public addEdge(
    id: string,
    startPoint: THREE.Vector3,
    endPoint: THREE.Vector3,
    type: 'inter-app' | 'intra-app' = 'intra-app',
    app1Id?: string,
    app2Id?: string,
    sourceId?: string,
    targetId?: string
  ): void {
    const groupId = this.generateGroupId(
      type,
      app1Id,
      app2Id,
      sourceId,
      targetId
    );

    const controlPoints = this.createInitialControlPoints(startPoint, endPoint);

    this.edges.set(id, {
      id,
      startPoint: startPoint.clone(),
      endPoint: endPoint.clone(),
      controlPoints,
      groupId,
      stability: 0,
      type,
    });
  }

  private generateGroupId(
    type: 'inter-app' | 'intra-app',
    app1Id?: string,
    app2Id?: string,
    sourceId?: string,
    targetId?: string
  ): string | undefined {
    if (!this.groupingEnabled) return undefined;

    const parts: string[] = [];

    if (this.groupByApplication && type === 'inter-app' && app1Id && app2Id) {
      parts.push(`APP_${[app1Id, app2Id].sort().join('_')}`);
    }

    if (this.groupBySourceTarget && sourceId && targetId) {
      parts.push(`SRC_${[sourceId, targetId].sort().join('_')}`);
    }

    parts.push(`TYPE_${type}`);

    return parts.length > 0 ? parts.join('|') : undefined;
  }

  public addInterAppEdge(
    id: string,
    startPoint: THREE.Vector3,
    endPoint: THREE.Vector3,
    app1Id: string,
    app2Id: string
  ): void {
    this.addEdge(id, startPoint, endPoint, 'inter-app', app1Id, app2Id);
  }

  public addIntraAppEdge(
    id: string,
    startPoint: THREE.Vector3,
    endPoint: THREE.Vector3,
    sourceId: string,
    targetId: string,
    appId: string
  ): void {
    this.addEdge(
      id,
      startPoint,
      endPoint,
      'intra-app',
      appId,
      appId,
      sourceId,
      targetId
    );
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

      const heightMultiplier = length * 0.12;
      point.y += heightMultiplier;

      points.push(point);
    }

    return points;
  }

  private calculateCompatibility(
    edge1: CommunicationEdge,
    edge2: CommunicationEdge
  ): number {
    let groupBonus = 1.0;
    if (
      this.groupingEnabled &&
      edge1.groupId &&
      edge1.groupId === edge2.groupId
    ) {
      groupBonus = 2.5;
    }

    let typeBonus = 1.0;
    if (edge1.type === edge2.type) {
      typeBonus = 1.5;
    }

    const dir1 = new THREE.Vector3()
      .subVectors(edge1.endPoint, edge1.startPoint)
      .normalize();
    const dir2 = new THREE.Vector3()
      .subVectors(edge2.endPoint, edge2.startPoint)
      .normalize();
    const angleComp = Math.max(0, dir1.dot(dir2));
    const angleCompSquared = angleComp * angleComp;

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

    const positionComp = Math.exp(-dist / (avgLength * 1.5));

    return (
      angleCompSquared *
      positionComp *
      groupBonus *
      typeBonus *
      this.bundleStrength
    );
  }

  public update(): boolean {
    if (this.edges.size === 0) return false;

    const edgesArray = Array.from(this.edges.values());
    let totalMovement = 0;

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
            const attractionStrength = this.stiffness * compatibility;

            const attraction = new THREE.Vector3()
              .subVectors(otherPoint, point)
              .multiplyScalar(attractionStrength);

            force.add(attraction);
            compatibilitySum += compatibility;
            compatibleEdges++;
          }
        });

        if (this.repulsion > 0) {
          edgesArray.forEach((otherEdge, j) => {
            if (i === j || pointIndex >= otherEdge.controlPoints.length) return;

            const otherPoint = otherEdge.controlPoints[pointIndex];
            const distVec = new THREE.Vector3().subVectors(point, otherPoint);
            const distance = distVec.length();

            if (distance > 0 && distance < 5) {
              const repulsionForce = distVec
                .normalize()
                .multiplyScalar(this.repulsion / (distance * distance));
              force.add(repulsionForce);
            }
          });
        }

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

    edgesArray.forEach((edge) => {
      const oldPoints = oldPositions.get(edge.id)!;
      let edgeMovement = 0;
      edge.controlPoints.forEach((point, i) => {
        edgeMovement += point.distanceTo(oldPoints[i]);
      });

      totalMovement += edgeMovement;

      edge.stability = Math.max(
        0,
        1 - edgeMovement / edge.controlPoints.length / this.stabilityThreshold
      );
      edge.stability = Math.min(1, edge.stability);
    });

    const avgMovement = totalMovement / (edgesArray.length * 3);
    this.movementHistory.push(avgMovement);
    if (this.movementHistory.length > 20) {
      this.movementHistory.shift();
    }

    return !this.checkStability();
  }

  private checkStability(): boolean {
    if (this.movementHistory.length < this.minStableFrames) return false;

    const recentHistory = this.movementHistory.slice(-this.minStableFrames);
    const avgRecent =
      recentHistory.reduce((a, b) => a + b, 0) / recentHistory.length;
    const maxRecent = Math.max(...recentHistory);

    return (
      avgRecent < this.stabilityThreshold &&
      maxRecent < this.stabilityThreshold * 2
    );
  }

  public getEdgeControlPoints(edgeId: string): THREE.Vector3[] | null {
    const edge = this.edges.get(edgeId);
    return edge ? edge.controlPoints.map((p) => p.clone()) : null;
  }

  public getEdges(): Map<string, CommunicationEdge> {
    return this.edges;
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
    interAppCount: number;
    intraAppCount: number;
    avgStability: number;
    isStable: boolean;
    recentMovement: number;
  } {
    const edgesArray = Array.from(this.edges.values());
    const interAppCount = edgesArray.filter(
      (e) => e.type === 'inter-app'
    ).length;
    const intraAppCount = edgesArray.filter(
      (e) => e.type === 'intra-app'
    ).length;
    const avgStability =
      edgesArray.length > 0
        ? edgesArray.reduce((sum, edge) => sum + edge.stability, 0) /
          edgesArray.length
        : 1;
    const isStable = this.checkStability();
    const recentMovement =
      this.movementHistory.length > 0
        ? this.movementHistory[this.movementHistory.length - 1]
        : 0;

    return {
      edgeCount: edgesArray.length,
      interAppCount,
      intraAppCount,
      avgStability,
      isStable,
      recentMovement,
    };
  }

  public setGroupingOptions(options: {
    enabled?: boolean;
    byApplication?: boolean;
    bySourceTarget?: boolean;
  }): void {
    if (options.enabled !== undefined) this.groupingEnabled = options.enabled;
    if (options.byApplication !== undefined)
      this.groupByApplication = options.byApplication;
    if (options.bySourceTarget !== undefined)
      this.groupBySourceTarget = options.bySourceTarget;
  }
}
