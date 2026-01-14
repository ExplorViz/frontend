import { extend, ThreeElement } from '@react-three/fiber';
import { VisualizationMode } from 'explorviz-frontend/src/stores/collaboration/local-user';
import { SceneLayers } from 'explorviz-frontend/src/stores/minimap-service';
import CommunicationLayout from 'explorviz-frontend/src/utils/layout/communication-layout';
import CommunicationArrowMesh from 'explorviz-frontend/src/view-objects/3d/application/communication-arrow-mesh';
import ClazzCommuMeshDataModel from 'explorviz-frontend/src/view-objects/3d/application/utils/clazz-communication-mesh-data-model';
import BaseMesh from 'explorviz-frontend/src/view-objects/3d/base-mesh.ts';
import * as THREE from 'three';
import { BundledCommunicationLayout } from './bundled-communication-layout';
import {
  EdgeBundlingConfig,
  EdgeBundlingProcessor,
  HAPNode,
  HierarchicalAttractionSystem,
} from './edge-bundling-utils';

export default class ClazzCommunicationMesh extends BaseMesh {
  dataModel: ClazzCommuMeshDataModel;

  _layout: CommunicationLayout | undefined;

  public _needsRender = true;
  private _lastBeta = 0.8;
  private _lastHAPNodes: { originId?: string; destinationId?: string } = {};
  private _streamline: boolean = true;
  private _leafPackagesOnly: boolean = false;

  private static hoverGeometryCache = new Map<
    string,
    {
      geometry: THREE.BufferGeometry;
      timestamp: number;
      usageCount: number;
    }
  >();

  private static readonly MAX_HOVER_CACHE_SIZE = 200;
  private static readonly CACHE_CLEANUP_INTERVAL = 30000; // 30 Sekunden
  private static lastCacheCleanup = Date.now();

  private _preHoverState: {
    geometry: THREE.BufferGeometry;
    material: THREE.Material;
    lineThickness: number;
    position: THREE.Vector3;
    needsRender: boolean;
  } | null = null;

  private _isInHoverMode = false;

  get layout() {
    return this._layout;
  }

  set layout(layout: CommunicationLayout) {
    this._layout = layout;
    this._needsRender = true;
    this.render();
  }

  _curveHeight: number = 0.0;

  get curveHeight() {
    return this._curveHeight;
  }

  set curveHeight(curveHeight: number) {
    if (Math.abs(this._curveHeight - curveHeight) > 0.001) {
      if (this.geometry) {
        this.releaseSharedGeometry(this.geometry);
      }

      this._curveHeight = curveHeight;
      this._needsRender = true;
      this.requestRender();
    }
  }

  _arrowColor = new THREE.Color('black');

  get arrowColor() {
    return this._arrowColor;
  }

  set arrowColor(color: THREE.Color) {
    this._arrowColor = color;
  }

  _arrowWidth = 1;

  get arrowWidth() {
    return this._arrowWidth;
  }

  set arrowWidth(width: number) {
    if (this.layout && width > 0) {
      this._arrowWidth = width + this.layout.lineThickness / 2;
      this.addArrows();
    } else {
      this._arrowWidth = width;
    }
  }

  _arrowOffset = 1;

  get arrowOffset() {
    return this._arrowOffset;
  }

  set arrowOffset(offset: number) {
    this._arrowOffset = offset;
    this.addArrows();
  }

  get streamline(): boolean {
    return this._streamline;
  }

  set streamline(value: boolean) {
    if (this._streamline !== value) {
      this._streamline = value;
      this._needsRender = true;
      this.requestRender();
    }
  }

  get leafPackagesOnly(): boolean {
    return this._leafPackagesOnly;
  }

  set leafPackagesOnly(value: boolean) {
    if (this._leafPackagesOnly !== value) {
      this._leafPackagesOnly = value;
      this._needsRender = true;
      this.requestRender();
    }
  }

  potentialBidirectionalArrow!: CommunicationArrowMesh | undefined;

  applicationCenter: THREE.Vector3 = new THREE.Vector3();

  // Edge Bundling properties
  private _enableEdgeBundling: boolean = false;
  private _bundleGroupId: string | null = null;

  // 3D-HAP properties
  private _hapSystem: HierarchicalAttractionSystem | null = null;
  private _originHAP: HAPNode | null = null;
  private _destinationHAP: HAPNode | null = null;
  private _beta: number = 0.8;
  private _use3DHAPAlgorithm: boolean = false;
  private _scatterRadius: number = 0.5;

  // Shared geometries cache
  private static sharedGeometries: Map<string, THREE.BufferGeometry> =
    new Map();
  private static geometryUsageCount: Map<string, number> = new Map();

  get enableEdgeBundling(): boolean {
    return this._enableEdgeBundling;
  }

  set enableEdgeBundling(enabled: boolean) {
    if (this._enableEdgeBundling !== enabled) {
      this._enableEdgeBundling = enabled;
      this._needsRender = true;
    }
  }

  get bundleGroupId(): string | null {
    return this._bundleGroupId;
  }

  set bundleGroupId(id: string | null) {
    this._bundleGroupId = id;
    this.render();
  }

  get beta(): number {
    return this._beta;
  }

  set beta(value: number) {
    if (Math.abs(this._beta - value) > 0.001) {
      this._beta = Math.max(0, Math.min(1, value));
      this._lastBeta = this._beta;
      this._needsRender = true;
    }
  }

  get use3DHAPAlgorithm(): boolean {
    return this._use3DHAPAlgorithm;
  }

  set use3DHAPAlgorithm(value: boolean) {
    if (this._use3DHAPAlgorithm !== value) {
      this._use3DHAPAlgorithm = value;
      this._needsRender = true;
    }
  }

  get scatterRadius(): number {
    return this._scatterRadius;
  }

  set scatterRadius(value: number) {
    const oldValue = this._scatterRadius;
    const newValue = Math.max(0, Math.min(30, value));

    if (Math.abs(oldValue - newValue) > 0.001) {
      this._scatterRadius = newValue;
      this._needsRender = true;
      this.requestRender();
    }
  }

  constructor(
    dataModel: ClazzCommuMeshDataModel,
    options?: { use3DHAPAlgorithm?: boolean }
  ) {
    super();
    this.dataModel = dataModel;
    this._use3DHAPAlgorithm = options?.use3DHAPAlgorithm ?? false;
    this.material = new THREE.MeshBasicMaterial({
      color: this.defaultColor,
    });
    this.material.transparent = true;
  }

  // Initialize 3D-HAP system for this communication
  public initializeHAPSystem(
    hapSystem: HierarchicalAttractionSystem,
    originHAP: HAPNode,
    destinationHAP: HAPNode,
    streamline?: boolean
  ): void {
    // Check if changes occured
    const newHAPIds = {
      originId: originHAP.id,
      destinationId: destinationHAP.id,
    };

    const hasChanged =
      this._originHAP?.id !== originHAP.id ||
      this._destinationHAP?.id !== destinationHAP.id;

    if (hasChanged) {
      this._hapSystem = hapSystem;
      this._originHAP = originHAP;
      this._destinationHAP = destinationHAP;
      this._lastHAPNodes = newHAPIds;
      this._needsRender = true;
    }

    if (streamline !== undefined) {
      this._streamline = streamline;
    }

    this._needsRender = true;
  }

  /**
   * Override PoI in order to get start, center and end point
   * @returns Array of PoI
   */
  getPoI(): Array<THREE.Vector3> {
    let worldPosStart = new THREE.Vector3();
    let worldPosEnd = new THREE.Vector3();
    const orignalWorldPos: Array<THREE.Vector3> = super.getPoI();
    const start = new THREE.Vector3();
    start.subVectors(this.layout.startPoint, this.applicationCenter);

    const end = new THREE.Vector3();
    end.subVectors(this.layout.endPoint, this.applicationCenter);
    worldPosStart = this.localToWorld(start);
    worldPosEnd = this.localToWorld(end);
    return [...orignalWorldPos, worldPosStart, worldPosEnd];
  }

  saveCurrentlyActiveLayout() {
    this.layers.enable(SceneLayers.Communication);
  }

  getModelId() {
    return this.dataModel.id;
  }

  /**
   * Turns the mesh and its arrows transparent, if value in [0,1). Fully transparent at 0.0
   *
   * @param opacity Desired transparency of mesh and its arrows. Default 0.3
   */
  turnTransparent(opacity = 0.3) {
    super.turnTransparent(opacity);

    this.children.forEach((childObject) => {
      if (childObject instanceof CommunicationArrowMesh) {
        childObject.turnTransparent(opacity);
      }
    });
  }

  /**
   * Turns mesh and communication arrows back to fully opaque.
   */
  turnOpaque() {
    super.turnOpaque();
    this.children.forEach((childObject) => {
      if (childObject instanceof CommunicationArrowMesh) {
        childObject.turnOpaque();
      }
    });
  }

  show() {
    super.show();
    this.children.forEach((childObject) => {
      if (childObject instanceof CommunicationArrowMesh) {
        childObject.show();
      }
    });
  }

  hide() {
    super.hide();
    this.children.forEach((childObject) => {
      if (childObject instanceof CommunicationArrowMesh) {
        childObject.hide();
      }
    });
  }

  /**
   * Renders the communication mesh as straight cylinder geometry.
   *
   * @param applicationCenter The center point of the application
   */
  renderAsLine() {
    const { layout } = this;
    const { startPoint } = layout;
    const { endPoint } = layout;

    const start = startPoint;
    const end = endPoint;

    const direction = new THREE.Vector3().subVectors(end, start);
    const orientation = new THREE.Matrix4();
    orientation.lookAt(start, end, new THREE.Object3D().up);
    orientation.multiply(
      new THREE.Matrix4().set(1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1)
    );

    const { lineThickness } = layout;
    const edgeGeometry = new THREE.CylinderGeometry(
      lineThickness,
      lineThickness,
      direction.length(),
      20,
      1
    );
    this.geometry = edgeGeometry;
    this.applyMatrix4(orientation);

    // Set position to center of pipe
    this.position.copy(end.add(start).divideScalar(2));
  }

  renderRecursiveCommunication(applicationCenter = new THREE.Vector3()) {
    this.applicationCenter = applicationCenter;
    const { layout } = this;

    // Place sphere for communication above corresponding class
    this.position.copy(layout.startPoint);
    this.geometry = new THREE.SphereGeometry(0.5);

    return;
  }

  /**
   * Enhanced render method with edge bundling support
   *
   * @param curveSegments The number of segments (tubes) the geometry persists of. Default 20
   */
  render(curveSegments = 20) {
    if (this._isInHoverMode) {
      return;
    }

    if (!this.layout || !this.layout.startPoint || !this.layout.endPoint) {
      this.cleanupIfNeeded();
      this._needsRender = false;
      return;
    }

    const start = this.layout.startPoint;
    const end = this.layout.endPoint;
    if (isNaN(start.x) || isNaN(end.x)) {
      this.cleanupIfNeeded();
      this._needsRender = false;
      return;
    }

    if (this._enableEdgeBundling && this._use3DHAPAlgorithm) {
      if (!this._hapSystem || !this._originHAP || !this._destinationHAP) {
        this.renderWithEdgeBundling(curveSegments); // Fallback
        return;
      }
    }

    if (!this._needsRender || !this.layout) {
      return;
    }

    // Handle recursive communication
    if (this.dataModel.communication.isRecursive) {
      this.renderRecursiveCommunication();
      return;
    }

    if (!this._enableEdgeBundling || !this.isBundledLayout()) {
      // Original algorithm
      this.renderOriginalAlgorithm(curveSegments);
    } else {
      if (
        this._use3DHAPAlgorithm &&
        this._hapSystem &&
        this._originHAP &&
        this._destinationHAP
      ) {
        this.renderWith3DHAPGradient(curveSegments);
      } else {
        this.renderWithEdgeBundling(curveSegments);
      }
    }

    this.addArrows();
    this._needsRender = false;
  }

  private cleanupIfNeeded(): void {
    if (this.geometry && this.geometry.getAttribute('position')?.count > 0) {
      this.releaseSharedGeometry(this.geometry);
      this.geometry = new THREE.BufferGeometry();
    }
  }

  public requestRender(): void {
    this._needsRender = true;
  }

  private renderOriginalAlgorithm(curveSegments: number): void {
    const curve = this.layout.getCurve({ yOffset: this.curveHeight });

    // Release old geometry before assigning new one
    const oldGeometry = this.geometry;
    this.geometry = this.getSharedGeometry(
      curve,
      this.curveHeight === 0 ? 1 : curveSegments
    );

    // If geometry changed, release the old one
    if (oldGeometry && oldGeometry !== this.geometry) {
      this.releaseSharedGeometry(oldGeometry);
    }

    this.material = new THREE.MeshBasicMaterial({
      color: this.defaultColor,
      transparent: true,
    });
  }

  /**
   * Override disposeRecursively to clean up shared geometries
   * This is called by the parent class disposal mechanism
   */
  public disposeRecursively(): void {
    // Clean up shared geometries
    if (this.geometry) {
      this.releaseSharedGeometry(this.geometry);
    }

    super.disposeRecursively();

    this.clearHAPSystem();

    // Clean up child arrows
    this.getArrowMeshes().forEach((arrow) => {
      if (arrow.disposeRecursively) {
        arrow.disposeRecursively();
      }
    });
  }

  private isBundledLayout(): boolean {
    return this.layout instanceof BundledCommunicationLayout;
  }

  // Get layout as BundledCommunicationLayout if possible
  private getBundledLayout(): BundledCommunicationLayout | null {
    return this.isBundledLayout()
      ? (this.layout as unknown as BundledCommunicationLayout)
      : null;
  }

  // Directions of Edges is displayed by color
  private createGradientColoredGeometry(
    baseGeometry: THREE.BufferGeometry,
    curve: THREE.Curve<THREE.Vector3>
  ): THREE.BufferGeometry {
    if (!baseGeometry || !baseGeometry.getAttribute) {
      return new THREE.BufferGeometry();
    }

    const geometry = baseGeometry.clone();
    const positionAttribute = geometry.getAttribute('position');
    if (!positionAttribute) {
      return baseGeometry.clone();
    }
    const vertexCount = positionAttribute.count;
    if (vertexCount === 0) {
      return baseGeometry.clone();
    }
    const colors = new Float32Array(vertexCount * 3);

    const isBidirectional = this.dataModel.communication.isBidirectional;

    for (let i = 0; i < vertexCount; i++) {
      const vertexPosition = new THREE.Vector3(
        positionAttribute.getX(i),
        positionAttribute.getY(i),
        positionAttribute.getZ(i)
      );

      const t = this.calculateVertexT(vertexPosition, curve);

      if (isBidirectional) {
        // Bidirectional: Uniform green (both directions active)
        colors[i * 3] = 0.0; // R: 0
        colors[i * 3 + 1] = 0.7; // G: strong green
        colors[i * 3 + 2] = 0.0; // B: 0
      } else {
        // Unidirectional: Green -> Red
        if (t < 0.5) {
          // Green origin side
          const greenIntensity = 0.3 + 0.7 * (1 - t * 2);
          colors[i * 3] = 0.0;
          colors[i * 3 + 1] = greenIntensity;
          colors[i * 3 + 2] = 0.0;
        } else {
          // Red destination side
          const redIntensity = 0.3 + 0.7 * ((t - 0.5) * 2);
          colors[i * 3] = redIntensity;
          colors[i * 3 + 1] = 0.0;
          colors[i * 3 + 2] = 0.0;
        }
      }
    }

    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return geometry;
  }

  /**
   * Calculate position along curve (0 = origin, 1 = destination)
   */
  private calculateVertexT(
    vertexPosition: THREE.Vector3,
    curve: THREE.Curve<THREE.Vector3>
  ): number {
    const start = curve.getPoint(0);
    const end = curve.getPoint(1);

    const lineDirection = new THREE.Vector3()
      .subVectors(end, start)
      .normalize();
    const vertexDirection = new THREE.Vector3().subVectors(
      vertexPosition,
      start
    );

    const projectedLength = vertexDirection.dot(lineDirection);
    const totalLength = start.distanceTo(end);

    return Math.min(1, Math.max(0, projectedLength / totalLength));
  }

  /**
   * Get or create shared geometry for identical curves
   */
  private getSharedGeometry(
    curve: THREE.Curve<THREE.Vector3>,
    segments: number
  ): THREE.BufferGeometry {
    if (!curve) {
      return new THREE.BufferGeometry();
    }

    try {
      const start = curve.getPoint(0);
      const end = curve.getPoint(1);

      if (
        !start ||
        !end ||
        isNaN(start.x) ||
        isNaN(start.y) ||
        isNaN(start.z) ||
        isNaN(end.x) ||
        isNaN(end.y) ||
        isNaN(end.z)
      ) {
        return new THREE.BufferGeometry();
      }
    } catch (error) {
      return new THREE.BufferGeometry();
    }

    const key = this.generateGeometryKey(curve, segments);

    if (!ClazzCommunicationMesh.sharedGeometries.has(key)) {
      try {
        const geometry = new THREE.TubeGeometry(
          curve,
          segments,
          this.layout.lineThickness
        );
        ClazzCommunicationMesh.sharedGeometries.set(key, geometry);
        ClazzCommunicationMesh.geometryUsageCount.set(key, 1);
      } catch (geometryError) {
        return new THREE.BufferGeometry();
      }
    }

    return ClazzCommunicationMesh.sharedGeometries.get(key)!;
  }

  /**
   * Generate unique key for geometry caching
   */
  private generateGeometryKey(
    curve: THREE.Curve<THREE.Vector3>,
    segments: number
  ): string {
    if (this._use3DHAPAlgorithm && this._originHAP && this._destinationHAP) {
      return `HAP_${this._originHAP.id}_${this._destinationHAP.id}_${this._beta}_${this._scatterRadius}_${this._streamline ? 'S' : 'F'}_${this._leafPackagesOnly ? 'L' : 'A'}_H${this._curveHeight.toFixed(2)}_EB${this._enableEdgeBundling ? 'ON' : 'OFF'}_${segments}_${this.layout.lineThickness}`;
    } else {
      const start = curve.getPoint(0);
      const end = curve.getPoint(1);
      const mid = curve.getPoint(0.5);

      return `CURVE_${start.x.toFixed(2)}_${start.y.toFixed(2)}_${start.z.toFixed(2)}_${end.x.toFixed(2)}_${end.y.toFixed(2)}_${end.z.toFixed(2)}_${mid.x.toFixed(2)}_${mid.y.toFixed(2)}_${mid.z.toFixed(2)}_H${this._curveHeight.toFixed(2)}_EB${this._enableEdgeBundling ? 'ON' : 'OFF'}_${segments}_${this.layout.lineThickness}`;
    }
  }

  public releaseSharedGeometry(geometry: THREE.BufferGeometry): void {
    let foundKey: string | null = null;
    ClazzCommunicationMesh.sharedGeometries.forEach((geo, key) => {
      if (geo === geometry) {
        foundKey = key;
      }
    });

    if (foundKey) {
      const count =
        ClazzCommunicationMesh.geometryUsageCount.get(foundKey) || 0;
      if (count <= 1) {
        ClazzCommunicationMesh.sharedGeometries.delete(foundKey);
        ClazzCommunicationMesh.geometryUsageCount.delete(foundKey);
      } else {
        ClazzCommunicationMesh.geometryUsageCount.set(foundKey, count - 1);
      }
    }
  }

  private isLayoutValid(
    layout: CommunicationLayout | BundledCommunicationLayout | null
  ): boolean {
    if (!layout) return false;

    if (!layout.startPoint || !layout.endPoint) return false;

    const start = layout.startPoint;
    const end = layout.endPoint;

    return (
      !isNaN(start.x) &&
      !isNaN(start.y) &&
      !isNaN(start.z) &&
      !isNaN(end.x) &&
      !isNaN(end.y) &&
      !isNaN(end.z)
    );
  }
  /**
   * Modified render methods that use shared geometries
   */
  private renderWith3DHAPGradient(curveSegments: number): void {
    if (!this._hapSystem || !this._originHAP || !this._destinationHAP) {
      this.renderWithEdgeBundling(curveSegments); // Fallback
      return;
    }

    const bundledLayout = this.getBundledLayout();
    if (!bundledLayout || !this.isLayoutValid(bundledLayout)) {
      return;
    }
    if (
      !bundledLayout ||
      !this._hapSystem ||
      !this._originHAP ||
      !this._destinationHAP
    ) {
      this.renderWithEdgeBundling(curveSegments);
      return;
    }

    bundledLayout.setHAPNodes(this._originHAP, this._destinationHAP);
    bundledLayout.setBeta(this._beta);
    bundledLayout.setScatterRadius(this._scatterRadius);
    bundledLayout.setStreamline(this._streamline);

    const curve = bundledLayout.getCurveWithHeight(this.curveHeight);

    // Use shared geometry instead of creating new one
    const sharedGeometry = this.getSharedGeometry(curve, curveSegments);

    // Create vertex colors on the shared geometry
    this.geometry = this.createGradientColoredGeometry(sharedGeometry, curve);

    this.material = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
    });
  }

  private renderWithEdgeBundling(curveSegments: number): void {
    const bundledLayout = this.getBundledLayout();
    if (!bundledLayout) return;

    const curve = bundledLayout.getCurveWithHeight(this.curveHeight);

    // Use shared geometry
    this.geometry = this.getSharedGeometry(curve, curveSegments);

    this.material = new THREE.MeshBasicMaterial({
      color: this.defaultColor,
      transparent: true,
      opacity: 0.8,
    });
  }

  // Update edge bundling based on group of communications
  public updateEdgeBundling(
    allCommunications: ClazzCommunicationMesh[],
    config?: Partial<EdgeBundlingConfig>
  ): void {
    if (!this.layout || !this._enableEdgeBundling) return;

    // If using 3D-HAP algorithm, no need for compatibility-based bundling
    if (this._use3DHAPAlgorithm && this._hapSystem) {
      return;
    }

    // Otherwise use existing compatibility-based bundling
    const bundledLayout = this.getBundledLayout();
    if (!bundledLayout) return;

    const compatibleEdges = allCommunications.filter(
      (comm) =>
        comm !== this &&
        comm.bundleGroupId === this.bundleGroupId &&
        comm.layout &&
        comm.isBundledLayout() &&
        !comm.use3DHAPAlgorithm // Only bundle with other non-HAP edges
    );

    if (compatibleEdges.length > 0) {
      // Extract control points for bundling
      const edges: THREE.Vector3[][] = [bundledLayout.getControlPoints()];

      compatibleEdges.forEach((comm) => {
        const commBundledLayout = comm.getBundledLayout();
        if (commBundledLayout) {
          edges.push(commBundledLayout.getControlPoints());
        }
      });

      // Apply edge bundling algorithm
      if (config) {
        bundledLayout.setBundlingConfig(config);
      }

      const bundledEdges = EdgeBundlingProcessor.applyEdgeBundling(
        edges,
        bundledLayout.getBundlingConfig()
      );

      // Update control points
      if (bundledEdges.length > 0) {
        bundledLayout.updateControlPoints(bundledEdges[0]);
        this.render();
      }
    }
  }

  /**
   * Static method to clear all shared geometries
   */
  public static clearSharedGeometries(): void {
    ClazzCommunicationMesh.sharedGeometries.forEach((geometry) => {
      geometry.dispose();
    });
    ClazzCommunicationMesh.sharedGeometries.clear();
    ClazzCommunicationMesh.geometryUsageCount.clear();
  }

  // Get HAP information for debugging
  public getHAPInfo(): {
    hasHAPSystem: boolean;
    hasHAPNodes: boolean;
    beta: number;
    use3DHAP: boolean;
  } {
    return {
      hasHAPSystem: !!this._hapSystem,
      hasHAPNodes: !!(this._originHAP && this._destinationHAP),
      beta: this._beta,
      use3DHAP: this._use3DHAPAlgorithm,
    };
  }

  // Clear HAP system (for cleanup)
  public clearHAPSystem(): void {
    this._hapSystem = null;
    this._originHAP = null;
    this._destinationHAP = null;
    this.render();
  }

  /**
   * Adds communication arrows on top of the communication mesh
   * to visualize communication direction
   */
  addArrows() {
    if (!this.layout) return;

    // Remove arrows when edge bundling is active
    if (this._enableEdgeBundling) {
      this.removeExistingArrows();
      return;
    }

    // Remove old arrows which might exist
    for (let i = this.children.length - 1; i >= 0; i--) {
      const arrow = this.children[i];
      this.remove(arrow);
    }

    if (this.arrowWidth <= 0) return;

    const { layout } = this;
    const { startPoint } = layout;
    const { endPoint } = layout;

    const start = new THREE.Vector3();
    const end = new THREE.Vector3();

    if (!this.dataModel.communication.isRecursive) {
      start.copy(startPoint);
      end.copy(endPoint);
    }

    this.addArrow(start, end);

    // Add 2nd arrow to visualize bidirectional communication
    if (this.dataModel.communication.isBidirectional) {
      this.addArrow(end, start);
    } else {
      // Save arrow for potential upcoming use
      this.potentialBidirectionalArrow = this.createArrowMesh(end, start);
    }
  }

  private removeExistingArrows(): void {
    for (let i = this.children.length - 1; i >= 0; i--) {
      const child = this.children[i];
      if (child instanceof CommunicationArrowMesh) {
        this.remove(child);
        if (child.disposeRecursively) {
          child.disposeRecursively();
        }
      }
    }
  }

  addBidirectionalArrow() {
    if (
      this.dataModel.communication.isBidirectional &&
      this.potentialBidirectionalArrow
    ) {
      this.add(this.potentialBidirectionalArrow);
    }
  }

  /**
   * Adds a single communication arrow.
   *
   * @param start The start point of the communication.
   * @param end The end point of the communication.
   */
  private addArrow(start: THREE.Vector3, end: THREE.Vector3) {
    const dir = new THREE.Vector3().subVectors(end, start);
    const len = dir.length();

    // Do not draw precisely in the middle to leave a
    // small gap in case of bidirectional communication
    const halfVector = dir.normalize().multiplyScalar(len * 0.51);
    const middle = start.clone().add(halfVector);

    // Normalize the direction vector (convert to vector of length 1)
    dir.normalize();

    // Arrow properties
    const origin = new THREE.Vector3(
      middle.x,
      middle.y + this.arrowOffset + this.curveHeight / 2,
      middle.z
    );
    const headWidth = Math.max(0.5, this.arrowWidth);
    const headLength = Math.min(2 * headWidth, 0.3 * len);
    const length = headLength + 0.00001; // body of arrow not visible

    const arrow = new CommunicationArrowMesh(
      this.dataModel.communication,
      dir,
      origin,
      length,
      this.arrowColor,
      headLength,
      headWidth
    );

    this.add(arrow);
  }

  private createArrowMesh(start: THREE.Vector3, end: THREE.Vector3) {
    const dir = new THREE.Vector3().subVectors(end, start);
    const len = dir.length();
    // Do not draw precisely in the middle to leave a
    // small gap in case of bidirectional communication
    const halfVector = dir.normalize().multiplyScalar(len * 0.51);
    const middle = start.clone().add(halfVector);

    // Normalize the direction vector (convert to vector of length 1)
    dir.normalize();

    // Arrow properties
    const origin = new THREE.Vector3(
      middle.x,
      middle.y + this.arrowOffset,
      middle.z
    );
    const headWidth = Math.max(0.5, this.arrowWidth);
    const headLength = Math.min(2 * headWidth, 0.3 * len);
    const length = headLength + 0.00001; // body of arrow not visible

    if (this.dataModel.communication) {
      return new CommunicationArrowMesh(
        this.dataModel.communication,
        dir,
        origin,
        length,
        this.arrowColor,
        headLength,
        headWidth
      );
    }
    return undefined;
  }

  canBeIntersected() {
    return true;
  }

  applyHoverEffect(arg?: VisualizationMode | number): void {
    if (arg === 'vr' && !this.isHovered) {
      this.savePreHoverState();

      const originalThickness = this.layout.lineThickness;
      const hoverThickness = originalThickness * 5;

      const hoverGeometry = this.getHoverGeometry(hoverThickness);

      this.switchToHoverDisplay(hoverGeometry, hoverThickness);

      super.applyHoverEffect();

      this.getArrowMeshes().forEach((arrowMesh) => {
        arrowMesh.applyHoverEffect(arg);
      });

      this._isInHoverMode = true;
    } else if (!this.isHovered) {
      super.applyHoverEffect();
    }
  }

  private savePreHoverState(): void {
    this._preHoverState = {
      geometry: this.geometry,
      material: this.material,
      lineThickness: this.layout.lineThickness,
      position: this.position.clone(),
      needsRender: this._needsRender,
    };
  }

  private getHoverGeometry(hoverThickness: number): THREE.BufferGeometry {
    const cacheKey = this.generateHoverCacheKey(hoverThickness);

    this.cleanupHoverCacheIfNeeded();

    if (ClazzCommunicationMesh.hoverGeometryCache.has(cacheKey)) {
      const cacheEntry =
        ClazzCommunicationMesh.hoverGeometryCache.get(cacheKey)!;
      cacheEntry.usageCount++;
      cacheEntry.timestamp = Date.now();

      return cacheEntry.geometry;
    }

    const geometry = this.createSimpleHoverGeometry(hoverThickness);

    ClazzCommunicationMesh.hoverGeometryCache.set(cacheKey, {
      geometry,
      timestamp: Date.now(),
      usageCount: 1,
    });

    this.limitHoverCacheSize();

    return geometry;
  }

  private createSimpleHoverGeometry(
    hoverThickness: number
  ): THREE.BufferGeometry {
    const start = this.layout.startPoint;
    const end = this.layout.endPoint;
    const direction = new THREE.Vector3().subVectors(end, start);
    const length = direction.length();

    if (length < 0.001) {
      return new THREE.SphereGeometry(hoverThickness * 2, 8, 8);
    }

    const geometry = new THREE.CylinderGeometry(
      hoverThickness,
      hoverThickness,
      length,
      12, // Radial segments
      1, // Hight segments
      false // closed
    );

    const orientation = new THREE.Matrix4();
    orientation.lookAt(start, end, new THREE.Object3D().up);
    orientation.multiply(
      new THREE.Matrix4().set(1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1)
    );

    geometry.applyMatrix4(orientation);

    return geometry;
  }

  private switchToHoverDisplay(
    hoverGeometry: THREE.BufferGeometry,
    hoverThickness: number
  ): void {
    this.geometry = hoverGeometry;

    const start = this.layout.startPoint;
    const end = this.layout.endPoint;
    this.position.copy(end.add(start).divideScalar(2));

    this.layout.lineThickness = hoverThickness;

    this.material = new THREE.MeshBasicMaterial({
      color: this.highlightingColor || 0xffff00,
      transparent: true,
      opacity: 0.9,
    });

    this._needsRender = false;
  }

  resetHoverEffect(mode?: VisualizationMode): void {
    if (this.isHovered && this._isInHoverMode) {
      if (mode === 'vr' && this._preHoverState) {
        this.restorePreHoverState();
      }

      super.resetHoverEffect();

      this.getArrowMeshes().forEach((arrowMesh) => {
        arrowMesh.resetHoverEffect(mode);
      });

      this._isInHoverMode = false;
    } else if (this.isHovered) {
      super.resetHoverEffect();
    }
  }

  private restorePreHoverState(): void {
    if (!this._preHoverState) return;

    this.geometry = this._preHoverState.geometry;

    this.material = this._preHoverState.material;

    this.layout.lineThickness = this._preHoverState.lineThickness;

    this.position.copy(this._preHoverState.position);

    this._needsRender = this._preHoverState.needsRender;

    if (this._needsRender) {
      requestAnimationFrame(() => {
        if (this._needsRender && !this._isInHoverMode) {
          this.render();
        }
      });
    }

    this._preHoverState = null;
  }

  private generateHoverCacheKey(hoverThickness: number): string {
    const start = this.layout.startPoint;
    const end = this.layout.endPoint;

    const round = (val: number) => Math.round(val * 10) / 10;

    return (
      `hover_${round(start.x)}_${round(start.y)}_${round(start.z)}_` +
      `${round(end.x)}_${round(end.y)}_${round(end.z)}_` +
      `${round(hoverThickness)}`
    );
  }

  private cleanupHoverCacheIfNeeded(): void {
    const now = Date.now();

    if (
      now - ClazzCommunicationMesh.lastCacheCleanup >
      ClazzCommunicationMesh.CACHE_CLEANUP_INTERVAL
    ) {
      let deletedCount = 0;
      const maxAge = 60000;

      for (const [
        key,
        entry,
      ] of ClazzCommunicationMesh.hoverGeometryCache.entries()) {
        if (now - entry.timestamp > maxAge && entry.usageCount === 1) {
          entry.geometry.dispose();
          ClazzCommunicationMesh.hoverGeometryCache.delete(key);
          deletedCount++;
        }
      }

      ClazzCommunicationMesh.lastCacheCleanup = now;
    }
  }

  private limitHoverCacheSize(): void {
    if (
      ClazzCommunicationMesh.hoverGeometryCache.size <=
      ClazzCommunicationMesh.MAX_HOVER_CACHE_SIZE
    ) {
      return;
    }

    const entries = Array.from(
      ClazzCommunicationMesh.hoverGeometryCache.entries()
    );
    entries.sort((a, b) => {
      const scoreA = a[1].usageCount * 1000 + (Date.now() - a[1].timestamp);
      const scoreB = b[1].usageCount * 1000 + (Date.now() - b[1].timestamp);
      return scoreA - scoreB;
    });

    const toRemove = Math.floor(entries.length / 2);
    for (let i = 0; i < toRemove; i++) {
      const [key, entry] = entries[i];
      entry.geometry.dispose();
      ClazzCommunicationMesh.hoverGeometryCache.delete(key);
    }
  }

  public static clearHoverCache(): void {
    ClazzCommunicationMesh.hoverGeometryCache.forEach((entry) => {
      entry.geometry.dispose();
    });

    ClazzCommunicationMesh.hoverGeometryCache.clear();
    ClazzCommunicationMesh.lastCacheCleanup = Date.now();
  }

  public static getHoverCacheStats(): {
    size: number;
    totalUsage: number;
    avgUsage: number;
  } {
    let totalUsage = 0;
    let minUsage = Infinity;
    let maxUsage = 0;

    ClazzCommunicationMesh.hoverGeometryCache.forEach((entry) => {
      totalUsage += entry.usageCount;
      minUsage = Math.min(minUsage, entry.usageCount);
      maxUsage = Math.max(maxUsage, entry.usageCount);
    });

    const avgUsage =
      ClazzCommunicationMesh.hoverGeometryCache.size > 0
        ? totalUsage / ClazzCommunicationMesh.hoverGeometryCache.size
        : 0;

    return {
      size: ClazzCommunicationMesh.hoverGeometryCache.size,
      totalUsage,
      avgUsage,
    };
  }

  getArrowMeshes() {
    const arrowMeshes: CommunicationArrowMesh[] = [];
    this.children.forEach((childObject) => {
      if (childObject instanceof CommunicationArrowMesh) {
        arrowMeshes.push(childObject);
      }
    });
    return arrowMeshes;
  }
}

extend({ ClazzCommunicationMesh });

// Add types to ThreeElements elements so primitives pick up on it
declare module '@react-three/fiber' {
  interface ThreeElements {
    clazzCommunicationMesh: ThreeElement<typeof ClazzCommunicationMesh> & {
      enableEdgeBundling?: boolean;
      bundleGroupId?: string | null;
      bundlingConfig?: {
        bundleStrength: number;
        compatibilityThreshold: number;
        iterations: number;
        stepSize: number;
      };
      // 3D-HAP properties
      beta?: number;
      use3DHAPAlgorithm?: boolean;
      hapSystem?: HierarchicalAttractionSystem;
      originHAP?: HAPNode;
      destinationHAP?: HAPNode;
      scatterRadius?: number;
    };
  }
}
