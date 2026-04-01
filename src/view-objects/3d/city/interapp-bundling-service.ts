import { ForceDirectedBundler } from './force-directed-bundler';
import * as THREE from 'three';

class InterAppBundlingService {
  private static instance: InterAppBundlingService;
  private bundler: ForceDirectedBundler;
  private animationId: number | null = null;
  private subscribers: (() => void)[] = [];
  private isActive: boolean = false;
  private frameCount: number = 0;
  private readonly maxFrames = 300; // safety limit

  private constructor() {
    this.bundler = new ForceDirectedBundler({
      stiffness: 0.42,
      repulsion: 0.03,
      damping: 0.88,
      compatibilityThreshold: 0.25,
      stabilityThreshold: 0.008,
      bundleStrength: 1.8,
    });
  }

  public static getInstance(): InterAppBundlingService {
    if (!InterAppBundlingService.instance) {
      InterAppBundlingService.instance = new InterAppBundlingService();
    }
    return InterAppBundlingService.instance;
  }

  public getBundler(): ForceDirectedBundler {
    return this.bundler;
  }

  public addInterAppEdge(
    edgeId: string,
    startPoint: THREE.Vector3,
    endPoint: THREE.Vector3,
    app1Id: string,
    app2Id: string
  ): void {
    if (app1Id === app2Id) return;

    this.bundler.addInterAppEdge(edgeId, startPoint, endPoint, app1Id, app2Id);

    // Start animation
    if (!this.isActive) {
      this.startIntelligentAnimation();
    }
  }

  private startIntelligentAnimation(): void {
    if (this.animationId) {
      return;
    }

    this.isActive = true;
    this.frameCount = 0;

    const animate = () => {
      this.frameCount++;

      if (this.frameCount > this.maxFrames) {
        this.stopAnimation();
        return;
      }

      const stillMoving = this.bundler.update();

      this.notifySubscribers();

      // Check stability
      const stats = this.bundler.getStats();

      if (!stillMoving || stats.isStable) {
        this.stopAnimation();
        return;
      }

      this.animationId = requestAnimationFrame(animate);
    };

    this.animationId = requestAnimationFrame(animate);
  }

  public stopAnimation(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.isActive = false;

    this.notifySubscribers();
  }

  public subscribe(callback: () => void): () => void {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter((cb) => cb !== callback);
    };
  }

  private notifySubscribers(): void {
    this.subscribers.forEach((callback) => callback());
  }

  public removeEdge(edgeId: string): void {
    this.bundler.removeEdge(edgeId);

    if (this.bundler['edges'].size === 0) {
      this.stopAnimation();
    }
  }

  public clear(): void {
    this.bundler.clear();
    this.stopAnimation();
  }

  public getStatus(): {
    isActive: boolean;
    frameCount: number;
    stats: any;
  } {
    return {
      isActive: this.isActive,
      frameCount: this.frameCount,
      stats: this.bundler.getStats(),
    };
  }
}

export default InterAppBundlingService.getInstance();
