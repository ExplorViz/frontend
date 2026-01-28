import * as THREE from 'three';

export interface PaperEdge {
  id: string;
  P0: THREE.Vector3;
  P1: THREE.Vector3;
  originalLength: number;
  subdivisionPoints: THREE.Vector3[];
}

type CompatibilityEntry = { idx: number; c: number };

export class ForceDirectedBundlerPaper {
  private edges: PaperEdge[] = [];

  private readonly P0 = 1;
  private readonly S0 = 0.04;
  private readonly C = 6;
  private readonly I = [50, 33, 22, 15, 9, 7];
  private readonly K = 0.1;

  private currentCycle = 0;
  private currentIteration = 0;
  private active = false;

  // Sparse compatibility
  private compatibility: Array<CompatibilityEntry[]> = [];

  addEdge(id: string, start: THREE.Vector3, end: THREE.Vector3): void {
    if (this.active) {
      return;
    }

    const edge: PaperEdge = {
      id,
      P0: start.clone(),
      P1: end.clone(),
      originalLength: start.distanceTo(end),
      subdivisionPoints: [],
    };
    this.edges.push(edge);
  }

  start(): void {
    this.currentCycle = 0;
    this.currentIteration = 0;
    this.active = true;

    this.initializeSubdivisionPoints();
    this.precomputeCompatibility();
  }

  edgeCount(): number {
    return this.edges.length;
  }

  update(): boolean {
    if (!this.active) return false;

    if (this.currentIteration >= this.I[this.currentCycle]) {
      this.nextCycle();
      return this.active;
    }

    this.iterate();
    this.currentIteration++;
    return true;
  }

  stop(): void {
    this.active = false;
  }

  getControlPoints(edgeId: string): THREE.Vector3[] {
    const e = this.edges.find((e) => e.id === edgeId);
    return e ? e.subdivisionPoints.map((p) => p.clone()) : [];
  }

  private initializeSubdivisionPoints(): void {
    const P = this.P0 * Math.pow(2, this.currentCycle);

    this.edges.forEach((edge) => {
      edge.subdivisionPoints = [];
      for (let i = 0; i < P; i++) {
        const t = (i + 1) / (P + 1);
        edge.subdivisionPoints.push(
          new THREE.Vector3().lerpVectors(edge.P0, edge.P1, t)
        );
      }
    });
  }

  private iterate(): void {
    const P = this.edges[0]?.subdivisionPoints.length ?? 0;
    if (P === 0) return;

    const S = this.S0 / Math.pow(2, this.currentCycle);
    const newPositions: THREE.Vector3[][] = this.edges.map((e) =>
      e.subdivisionPoints.map((p) => p.clone())
    );

    for (let e = 0; e < this.edges.length; e++) {
      const edge = this.edges[e];
      const kP = this.K / (edge.originalLength * (P + 1));

      for (let i = 0; i < P; i++) {
        const p = edge.subdivisionPoints[i];
        const F = new THREE.Vector3();

        const prev = i === 0 ? edge.P0 : edge.subdivisionPoints[i - 1];
        const next = i === P - 1 ? edge.P1 : edge.subdivisionPoints[i + 1];

        F.add(prev.clone().sub(p).multiplyScalar(kP));
        F.add(next.clone().sub(p).multiplyScalar(kP));

        // Sparse compatibility
        const neighbors = this.compatibility[e];
        for (let ni = 0; ni < neighbors.length; ni++) {
          const { idx: oe, c: C } = neighbors[ni];

          // Early exit
          if (C < 0.01) break;

          const q = this.edges[oe].subdivisionPoints[i];
          const dir = q.clone().sub(p);
          if (dir.lengthSq() === 0) continue;

          dir.normalize().multiplyScalar(this.C * C);
          F.add(dir);
        }

        newPositions[e][i].add(F.multiplyScalar(S));
      }
    }

    for (let e = 0; e < this.edges.length; e++) {
      this.edges[e].subdivisionPoints = newPositions[e];
    }
  }

  private nextCycle(): void {
    this.currentCycle++;
    this.currentIteration = 0;

    if (this.currentCycle >= this.C) {
      this.active = false;
      return;
    }

    this.edges.forEach((edge) => {
      const old = edge.subdivisionPoints;
      const poly = [
        edge.P0.clone(),
        ...old.map((p) => p.clone()),
        edge.P1.clone(),
      ];

      const newPoints: THREE.Vector3[] = [];
      for (let i = 0; i < poly.length - 1; i++) {
        const a = poly[i];
        const b = poly[i + 1];

        newPoints.push(a.clone());
        const mid = a.clone().add(b).multiplyScalar(0.5);
        newPoints.push(mid);
      }
      newPoints.push(poly[poly.length - 1].clone());

      edge.subdivisionPoints = newPoints.slice(1, -1);
    });

    // this.precomputeCompatibility();
  }

  private precomputeCompatibility(): void {
    const n = this.edges.length;
    this.compatibility = Array.from({ length: n }, () => []);

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const c = this.edgeCompatibility(this.edges[i], this.edges[j]);
        const v = c > 0.01 ? c : 0;

        if (v > 0) {
          this.compatibility[i].push({ idx: j, c: v });
          this.compatibility[j].push({ idx: i, c: v });
        }
      }
    }

    this.compatibility.forEach((list) => list.sort((a, b) => b.c - a.c));
  }

  private edgeCompatibility(P: PaperEdge, Q: PaperEdge): number {
    const p = P.P1.clone().sub(P.P0);
    const q = Q.P1.clone().sub(Q.P0);

    const Ca = Math.abs(p.clone().normalize().dot(q.clone().normalize()));

    const lP = P.originalLength;
    const lQ = Q.originalLength;
    const lavg = (lP + lQ) / 2;
    const Cs = 2 / (lavg / Math.min(lP, lQ) + Math.max(lP, lQ) / lavg);

    const mp = P.P0.clone().add(P.P1).multiplyScalar(0.5);
    const mq = Q.P0.clone().add(Q.P1).multiplyScalar(0.5);
    const Cp = lavg / (lavg + mp.distanceTo(mq));

    const Cv = this.visibilityCompatibility(P, Q);

    return Ca * Cs * Cp * Cv;
  }

  private visibilityCompatibility(P: PaperEdge, Q: PaperEdge): number {
    const vPQ = this.visibility(P, Q);
    const vQP = this.visibility(Q, P);
    return Math.min(vPQ, vQP);
  }

  private visibility(P: PaperEdge, Q: PaperEdge): number {
    const u = P.P1.clone().sub(P.P0);
    const lenU = u.length();
    const lenUSq = lenU * lenU;

    const t0 = this.clampedT(P, Q.P0, u, lenUSq);
    const t1 = this.clampedT(P, Q.P1, u, lenUSq);

    const projLen = Math.abs(t1 - t0) * lenU;
    return projLen / lenU;
  }

  private clampedT(
    P: PaperEdge,
    x: THREE.Vector3,
    u: THREE.Vector3,
    lenUSq: number
  ): number {
    const ux = x.clone().sub(P.P0);
    const t = ux.dot(u) / lenUSq;
    return Math.max(0, Math.min(1, t));
  }
}
