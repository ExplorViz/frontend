import { ForceDirectedBundler } from './force-directed-bundler';
import * as THREE from 'three';

class GlobalBundlingService {
  private static instance: GlobalBundlingService;
  private bundler: ForceDirectedBundler;
  private animationId: number | null = null;
  private subscribers: (() => void)[] = [];
  private isActive: boolean = false;
  private frameCount: number = 0;
  private readonly maxFrames = 300;

  private config = {
    defaultConfig: {
      stiffness: 0.42,
      repulsion: 0.01,
      damping: 0.88,
      compatibilityThreshold: 0.25,
      stabilityThreshold: 0.008,
      bundleStrength: 1.8,
      groupingEnabled: true,
      groupByApplication: true,
      groupBySourceTarget: true,
    },

    hapConfig: {
      stiffness: 0.3,
      compatibilityThreshold: 0.4,
      bundleStrength: 1.2,
    },
  };

  private constructor() {
    this.bundler = new ForceDirectedBundler(this.config.defaultConfig);
  }

  public static getInstance(): GlobalBundlingService {
    if (!GlobalBundlingService.instance) {
      GlobalBundlingService.instance = new GlobalBundlingService();
    }
    return GlobalBundlingService.instance;
  }

  public getBundler(): ForceDirectedBundler {
    return this.bundler;
  }
  public addEdge(
    edgeId: string,
    startPoint: THREE.Vector3,
    endPoint: THREE.Vector3,
    options: {
      type: 'inter-app' | 'intra-app';
      app1Id?: string;
      app2Id?: string;
      sourceId?: string;
      targetId?: string;
      use3DHAP?: boolean;
      isCircleLayout?: boolean;
    }
  ): void {
    const {
      type,
      app1Id,
      app2Id,
      sourceId,
      targetId,
      use3DHAP = false,
      isCircleLayout = false,
    } = options;

    if (isCircleLayout && use3DHAP && type === 'intra-app') {
      return;
    }

    const groupId = this.generateGroupId(
      type,
      app1Id,
      app2Id,
      sourceId,
      targetId,
      isCircleLayout
    );

    const controlPoints = this.createInitialControlPoints(
      startPoint,
      endPoint,
      isCircleLayout
    );

    this.getBundler().getEdges().set(edgeId, {
      id: edgeId,
      startPoint: startPoint.clone(),
      endPoint: endPoint.clone(),
      controlPoints,
      groupId,
      stability: 0,
      type,
    });

    if (!this.isActive && this.getBundler().getEdges().size > 0) {
      this.startAnimation();
    }
  }

  private generateGroupId(
    type: 'inter-app' | 'intra-app',
    app1Id?: string,
    app2Id?: string,
    sourceId?: string,
    targetId?: string,
    isCircleLayout: boolean = false
  ): string | undefined {
    const bundlerAny = this.bundler as any;
    if (!bundlerAny.groupingEnabled) return undefined;

    const parts: string[] = [];

    if (isCircleLayout && app1Id) {
      parts.push(`CIRCLE_APP_${app1Id}`);
    } else if (type === 'inter-app' && app1Id && app2Id) {
      parts.push(`APP_${[app1Id, app2Id].sort().join('_')}`);
    }

    if (sourceId && targetId) {
      parts.push(`EDGE_${[sourceId, targetId].sort().join('_')}`);
    }

    parts.push(`TYPE_${type}`);
    if (isCircleLayout) {
      parts.push(`LAYOUT_CIRCLE`);
    }

    return parts.length > 0 ? parts.join('|') : undefined;
  }

  private createInitialControlPoints(
    start: THREE.Vector3,
    end: THREE.Vector3,
    isCircleLayout: boolean = false
  ): THREE.Vector3[] {
    const points: THREE.Vector3[] = [];

    if (isCircleLayout) {
      const direction = new THREE.Vector3().subVectors(end, start);
      const length = direction.length();
      const midPoint = new THREE.Vector3()
        .addVectors(start, end)
        .multiplyScalar(0.5);

      midPoint.y += length * 0.3;

      return [midPoint];
    } else {
      const segments = 3;
      const direction = new THREE.Vector3().subVectors(end, start);
      const length = direction.length();

      for (let i = 1; i <= segments; i++) {
        const t = i / (segments + 1);
        const point = new THREE.Vector3()
          .copy(start)
          .add(direction.clone().multiplyScalar(t));

        const heightMultiplier = length * 0.15;
        point.y += heightMultiplier;

        points.push(point);
      }
    }

    return points;
  }

  public configure(settings: {
    enableEdgeBundling: boolean;
    use3DHAPAlgorithm: boolean;
    bundleStrength: number;
    compatibilityThreshold: number;
    bundlingIterations?: number;
    bundlingStepSize?: number;
  }): void {
    const {
      enableEdgeBundling,
      use3DHAPAlgorithm,
      bundleStrength,
      compatibilityThreshold,
    } = settings;

    if (!enableEdgeBundling) {
      this.clear();
      return;
    }

    const baseConfig = use3DHAPAlgorithm
      ? { ...this.config.defaultConfig, ...this.config.hapConfig }
      : this.config.defaultConfig;

    const userConfig = {
      ...baseConfig,
      bundleStrength: bundleStrength * baseConfig.bundleStrength,
      compatibilityThreshold: compatibilityThreshold,
    };

    this.bundler = new ForceDirectedBundler(userConfig);

    this.bundler.setGroupingOptions({
      enabled: true,
      byApplication: true,
      bySourceTarget: !use3DHAPAlgorithm,
    });
  }

  private startAnimation(): void {
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
    this.subscribers = [];
  }

  public getStatus(): {
    isActive: boolean;
    frameCount: number;
    stats: any;
    config: any;
  } {
    return {
      isActive: this.isActive,
      frameCount: this.frameCount,
      stats: this.bundler.getStats(),
      config: this.config.defaultConfig,
    };
  }

  public shouldUseForceDirected(
    communicationModel: any,
    use3DHAPAlgorithm: boolean
  ): boolean {
    if (!use3DHAPAlgorithm) {
      return true;
    }

    const isInterApp =
      communicationModel.sourceApp.id !== communicationModel.targetApp.id;
    return isInterApp;
  }
}

export default GlobalBundlingService.getInstance();
