import {
  EdgeBundlingConfig,
  HierarchicalAttractionSystem,
  HAPNode,
} from './edge-bundling-utils';
import CommunicationLayout from 'explorviz-frontend/src/view-objects/layout-models/communication-layout';
import ClassCommunication from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/class-communication';
import ComponentCommunication from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/component-communication';
import * as THREE from 'three';

export class BundledCommunicationLayout extends CommunicationLayout {
  private _controlPoints: THREE.Vector3[] = [];
  private _bundlingConfig: EdgeBundlingConfig;
  private _hapSystem: HierarchicalAttractionSystem;
  private _originHAP: HAPNode | null = null;
  private _destinationHAP: HAPNode | null = null;
  private _beta: number = 0.8;
  private _scatterRadius: number = 0.5;
  private _streamline: boolean = true;
  private _leafPackagesOnly: boolean = false;

  constructor(
    model: ClassCommunication | ComponentCommunication,
    startPoint: THREE.Vector3,
    endPoint: THREE.Vector3,
    lineThickness: number = 1,
    config?: Partial<EdgeBundlingConfig>,
    hapSystem?: HierarchicalAttractionSystem
  ) {
    super(model);

    this.startPoint = startPoint;
    this.endPoint = endPoint;
    this.lineThickness = lineThickness;
    this._streamline = true;

    this._bundlingConfig = {
      bundleStrength: config?.bundleStrength ?? 0.3,
      compatibilityThreshold: config?.compatibilityThreshold ?? 0.6,
      iterations: config?.iterations ?? 50,
      stepSize: config?.stepSize ?? 0.1,
    };

    this._hapSystem = hapSystem || new HierarchicalAttractionSystem();

    this.initializeControlPoints();
  }

  // Set HAP nodes for origin and destination
  public setHAPNodes(originHAP: HAPNode, destinationHAP: HAPNode): void {
    this._originHAP = originHAP;
    this._destinationHAP = destinationHAP;
    this.updatePathFromHAP();
  }

  public setScatterRadius(radius: number): void {
    this._scatterRadius = Math.max(0, Math.min(30, radius));
    if (this._originHAP && this._destinationHAP) {
      this.updatePathFromHAP();
    }
  }

  public setStreamline(streamline: boolean): void {
    if (this._streamline !== streamline) {
      this._streamline = streamline;
      if (this._originHAP && this._destinationHAP) {
        this.updatePathFromHAP();
      }
    }
  }

  public getStreamline(): boolean {
    return this._streamline;
  }

  // Set leaf packages only
  public setLeafPackagesOnly(leafOnly: boolean): void {
    if (this._leafPackagesOnly !== leafOnly) {
      this._leafPackagesOnly = leafOnly;
      if (this._originHAP && this._destinationHAP) {
        this.updatePathFromHAP();
      }
    }
  }

  public getLeafPackagesOnly(): boolean {
    return this._leafPackagesOnly;
  }

  public getScatterRadius(): number {
    return this._scatterRadius;
  }

  // Update path using 3D-HAP algorithm
  private updatePathFromHAP(): void {
    if (!this._originHAP || !this._destinationHAP) {
      this.initializeControlPoints();
      return;
    }

    const hapPath = this._hapSystem.findHAPPath(
      this._originHAP,
      this._destinationHAP,
      this._streamline,
      this._leafPackagesOnly
    );
    const edgePath = this._hapSystem.calculateEdgePath(
      this.startPoint,
      this.endPoint,
      hapPath,
      this._beta,
      this._scatterRadius,
      this._streamline
    );

    // Remove start and end points to get control points only
    this._controlPoints = edgePath.slice(1, -1);
  }

  // Set attraction power beta factor
  public setBeta(beta: number): void {
    this._beta = Math.max(0, Math.min(1, beta));
    if (this._originHAP && this._destinationHAP) {
      this.updatePathFromHAP();
    }
  }

  public getBeta(): number {
    return this._beta;
  }

  private initializeControlPoints(): void {
    // Fallback to original control points if no HAP system available
    const midPoint = new THREE.Vector3()
      .addVectors(this.startPoint, this.endPoint)
      .multiplyScalar(0.5);

    const direction = new THREE.Vector3()
      .subVectors(this.endPoint, this.startPoint)
      .normalize();

    const perpendicular = new THREE.Vector3(-direction.z, 0, direction.x);

    this._controlPoints = [
      new THREE.Vector3().addVectors(
        this.startPoint,
        direction.clone().multiplyScalar(0.33)
      ),
      midPoint.clone().add(perpendicular.multiplyScalar(2)),
      new THREE.Vector3().addVectors(
        this.startPoint,
        direction.clone().multiplyScalar(0.66)
      ),
    ];
  }

  public updateControlPoints(points: THREE.Vector3[]): void {
    this._controlPoints = points.map((p) => p.clone());
  }

  public getControlPoints(): THREE.Vector3[] {
    return this._controlPoints.map((p) => p.clone());
  }

  public getBundlingConfig(): EdgeBundlingConfig {
    return { ...this._bundlingConfig };
  }

  public setBundlingConfig(config: Partial<EdgeBundlingConfig>): void {
    this._bundlingConfig = { ...this._bundlingConfig, ...config };
  }

  public getCurveWithHeight(yOffset: number = 0): THREE.CatmullRomCurve3 {
    const points = [this.startPoint];

    this._controlPoints.forEach((point) => {
      const elevatedPoint = point.clone();
      elevatedPoint.y += yOffset;
      points.push(elevatedPoint);
    });

    points.push(this.endPoint);

    return new THREE.CatmullRomCurve3(points);
  }

  public override getCurve(options?: {
    yOffset?: number;
  }): THREE.CatmullRomCurve3 {
    const yOffset = options?.yOffset ?? 0;
    return this.getCurveWithHeight(yOffset);
  }

  override copy(): BundledCommunicationLayout {
    const copy = new BundledCommunicationLayout(
      this.model,
      this.startPoint,
      this.endPoint,
      this.lineThickness,
      this._bundlingConfig,
      this._hapSystem
    );
    copy.updateControlPoints(this._controlPoints);
    copy.setBeta(this._beta);
    copy.setScatterRadius(this._scatterRadius);
    copy.setStreamline(this._streamline);
    copy.setLeafPackagesOnly(this._leafPackagesOnly);
    if (this._originHAP && this._destinationHAP) {
      copy.setHAPNodes(this._originHAP, this._destinationHAP);
    }
    return copy;
  }
}
