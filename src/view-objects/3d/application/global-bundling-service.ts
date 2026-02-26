import * as THREE from 'three';
import { ForceDirectedBundlerPaper } from './force-directed-bundler';

class GlobalBundlingService {
  private static instance: GlobalBundlingService;
  private bundler = new ForceDirectedBundlerPaper();
  private animationId: number | null = null;
  private subscribers: (() => void)[] = [];

  // Edges which are already added
  private registeredEdges = new Set<string>();

  static getInstance(): GlobalBundlingService {
    if (!this.instance) {
      this.instance = new GlobalBundlingService();
    }
    return this.instance;
  }

  addEdge(
    edgeId: string,
    startPoint: THREE.Vector3,
    endPoint: THREE.Vector3,
    _options?: any
  ): void {
    if (this.registeredEdges.has(edgeId)) return;

    this.registeredEdges.add(edgeId);
    this.bundler.addEdge(edgeId, startPoint, endPoint);
  }

  getBundler(): this {
    return this;
  }

  getEdgeControlPoints(edgeId: string): THREE.Vector3[] {
    return this.bundler.getControlPoints(edgeId);
  }

  startCalculation(): void {
    if (this.animationId !== null) return;

    this.bundler.start();

    const loop = () => {
      const running = this.bundler.update();
      this.notifySubscribers();

      if (running) {
        this.animationId = requestAnimationFrame(loop);
      } else {
        this.animationId = null;
        this.notifySubscribers();
      }
    };

    this.animationId = requestAnimationFrame(loop);
  }

  private startScheduled = false;

  scheduleStart(): void {
    if (this.animationId !== null) return;
    if (this.startScheduled) return;

    this.startScheduled = true;

    requestAnimationFrame(() => {
      this.startScheduled = false;
      this.startCalculation();
    });
  }

  stopCalculation(): void {
    if (this.animationId) cancelAnimationFrame(this.animationId);
    this.animationId = null;
    this.bundler.stop();
  }

  clear(): void {
    this.stopCalculation();
    this.registeredEdges.clear();
  }

  reset(): void {
    this.stopCalculation();
    this.registeredEdges.clear();
    this.bundler = new ForceDirectedBundlerPaper();
  }

  edgeCount(): number {
    return this.bundler.edgeCount();
  }

  // Observer
  subscribe(cb: () => void): () => void {
    this.subscribers.push(cb);
    return () => {
      this.subscribers = this.subscribers.filter((x) => x !== cb);
    };
  }

  private notifySubscribers(): void {
    this.subscribers.forEach((cb) => cb());
  }
}

export default GlobalBundlingService.getInstance();
