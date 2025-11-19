import { extend, ThreeElement } from '@react-three/fiber';
import { VisualizationMode } from 'explorviz-frontend/src/stores/collaboration/local-user';
import { SceneLayers } from 'explorviz-frontend/src/stores/minimap-service';
import CommunicationArrowMesh from 'explorviz-frontend/src/view-objects/3d/application/communication-arrow-mesh';
import ClazzCommuMeshDataModel from 'explorviz-frontend/src/view-objects/3d/application/utils/clazz-communication-mesh-data-model';
import BaseMesh from 'explorviz-frontend/src/view-objects/3d/base-mesh.ts';
import CommunicationLayout from 'explorviz-frontend/src/view-objects/layout-models/communication-layout.ts';
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

  get layout() {
    return this._layout;
  }

  set layout(layout: CommunicationLayout) {
    this._layout = layout;
    this.render();
  }

  _curveHeight: number = 0.0;

  get curveHeight() {
    return this._curveHeight;
  }

  set curveHeight(curveHeight: number) {
    this._curveHeight = curveHeight;
    this.render();
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
  private _use3DHAPAlgorithm: boolean = true;

  get enableEdgeBundling(): boolean {
    return this._enableEdgeBundling;
  }

  set enableEdgeBundling(enabled: boolean) {
    this._enableEdgeBundling = enabled;
    this.render();
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
    this._beta = Math.max(0, Math.min(1, value));
    if (this._enableEdgeBundling && this.isBundledLayout()) {
      this.render();
    }
  }

  get use3DHAPAlgorithm(): boolean {
    return this._use3DHAPAlgorithm;
  }

  set use3DHAPAlgorithm(value: boolean) {
    this._use3DHAPAlgorithm = value;
    if (this._enableEdgeBundling && this.isBundledLayout()) {
      this.render();
    }
  }

  constructor(dataModel: ClazzCommuMeshDataModel) {
    super();
    this.dataModel = dataModel;

    this.material = new THREE.MeshBasicMaterial({
      color: this.defaultColor,
    });
    this.material.transparent = true;
  }

  // Initialize 3D-HAP system for this communication
  public initializeHAPSystem(
    hapSystem: HierarchicalAttractionSystem,
    originHAP: HAPNode,
    destinationHAP: HAPNode
  ): void {
    this._hapSystem = hapSystem;
    this._originHAP = originHAP;
    this._destinationHAP = destinationHAP;
    this.render();
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
    if (!this.layout) return;

    // console.log('Rendering communication:', {
    //   enableEdgeBundling: this._enableEdgeBundling,
    //   use3DHAPAlgorithm: this._use3DHAPAlgorithm,
    //   hasHAPSystem: !!this._hapSystem,
    //   hasHAPNodes: !!(this._originHAP && this._destinationHAP),
    //   beta: this._beta,
    //   isBidirectional: this.dataModel.communication.isBidirectional,
    //   layoutType: this.layout.constructor.name,
    // });

    // Handle recursive communication
    if (this.dataModel.communication.isRecursive) {
      this.renderRecursiveCommunication();
      return;
    }

    if (!this._enableEdgeBundling || !this.isBundledLayout()) {
      // Original algorithm
      this.renderOriginalAlgorithm(curveSegments);
    } else {
      // Edge Bundling is active
      if (
        this._use3DHAPAlgorithm &&
        this._hapSystem &&
        this._originHAP &&
        this._destinationHAP
      ) {
        // console.log('Using 3D-HAP Algorithm with gradient coloring');
        // Use 3D-HAP algorithm with color gradients
        this.renderWith3DHAPGradient(curveSegments);
      } else {
        // console.log('Using existing Edge Bundling Algorithm');
        // Fallback to existing edge bundling algorithm
        this.renderWithEdgeBundling(curveSegments);
      }
    }

    this.addArrows();
  }

  // Render using original algorithm (no edge bundling)
  private renderOriginalAlgorithm(curveSegments: number): void {
    this.geometry = new THREE.TubeGeometry(
      this.layout.getCurve({ yOffset: this.curveHeight }),
      this.curveHeight === 0 ? 1 : curveSegments,
      this.layout.lineThickness
    );

    // Reset to original material
    this.material = new THREE.MeshBasicMaterial({
      color: this.defaultColor,
      transparent: true,
    });
  }

  // Check if layout is BundledCommunicationLayout
  private isBundledLayout(): boolean {
    return this.layout instanceof BundledCommunicationLayout;
  }

  // Get layout as BundledCommunicationLayout if possible
  private getBundledLayout(): BundledCommunicationLayout | null {
    return this.isBundledLayout()
      ? (this.layout as unknown as BundledCommunicationLayout)
      : null;
  }

  /**
   * Create gradient-colored geometry for 3D-HAP edges
   * Implements color scheme: Green (origin) -> Red (destination)
   */
  private createGradientColoredGeometry(
    curve: THREE.Curve<THREE.Vector3>,
    segments: number
  ): THREE.BufferGeometry {
    const tubeGeometry = new THREE.TubeGeometry(
      curve,
      segments,
      this.layout.lineThickness
    );
    const geometry = tubeGeometry;
    const positionAttribute = geometry.getAttribute('position');
    const vertexCount = positionAttribute.count;
    const colors = new Float32Array(vertexCount * 3);

    for (let i = 0; i < vertexCount; i++) {
      const t = i / (vertexCount - 1);

      if (this.dataModel.communication.isBidirectional) {
        // Deep purple gradient for bidirectional
        colors[i * 3] = 0.4 + t * 0.3; // R: 0.4 -> 0.7
        colors[i * 3 + 1] = 0.2; // G low and constant
        colors[i * 3 + 2] = 0.6 - t * 0.2; // B: 0.6 -> 0.4
      } else {
        // Deep Green (0,0.8,0) -> Deep Red (0.9,0,0)
        if (t < 0.5) {
          // Deep green to yellow-green
          colors[i * 3] = t * 1.0; // R: 0 -> 0.5
          colors[i * 3 + 1] = 0.8; // G stays very high
          colors[i * 3 + 2] = 0.1; // B very low
        } else {
          // Yellow-green to deep red
          colors[i * 3] = 0.5 + (t - 0.5) * 0.8; // R: 0.5 -> 0.9
          colors[i * 3 + 1] = 0.8 - (t - 0.5) * 1.6; // G: 0.8 -> 0.0
          colors[i * 3 + 2] = 0.1; // B very low
        }
      }
    }

    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return geometry;
  }

  // Render with 3D Hierarchical Edge Bundling algorithm with gradient coloring
  private renderWith3DHAPGradient(curveSegments: number): void {
    const bundledLayout = this.getBundledLayout();
    if (
      !bundledLayout ||
      !this._hapSystem ||
      !this._originHAP ||
      !this._destinationHAP
    ) {
      // Fallback to existing algorithm if 3D-HAP not available
      this.renderWithEdgeBundling(curveSegments);
      return;
    }

    // Ensure HAP information is up to date
    bundledLayout.setHAPNodes(this._originHAP, this._destinationHAP);
    bundledLayout.setBeta(this._beta);

    const curve = bundledLayout.getCurveWithHeight(this.curveHeight);

    // Use gradient-colored geometry
    this.geometry = this.createGradientColoredGeometry(curve, curveSegments);

    // Use vertex color material
    this.material = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
    });

    // console.log('3D-HAP gradient rendering completed:', {
    //   curvePoints: curve.getPoints().length,
    //   segments: curveSegments,
    //   isBidirectional: this.dataModel.communication.isBidirectional,
    // });
  }

  // Render with existing edge bundling algorithm (fallback)
  private renderWithEdgeBundling(curveSegments: number): void {
    const bundledLayout = this.getBundledLayout();
    if (!bundledLayout) return;

    const curve = bundledLayout.getCurveWithHeight(this.curveHeight);
    this.geometry = new THREE.TubeGeometry(
      curve,
      curveSegments,
      this.layout.lineThickness
    );

    // Apply custom material for bundled edges
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
      this.layout.lineThickness *= 5;
      this.geometry.dispose();
      this.render();
      super.applyHoverEffect();

      this.getArrowMeshes().forEach((arrowMesh) => {
        arrowMesh.applyHoverEffect(arg);
      });
    } else if (!this.isHovered) {
      super.applyHoverEffect();
    }
  }

  resetHoverEffect(mode?: VisualizationMode): void {
    if (this.isHovered) {
      super.resetHoverEffect();
      if (mode === 'vr') {
        this.layout.lineThickness /= 5;
        this.geometry.dispose();
        this.render();
      }

      this.getArrowMeshes().forEach((arrowMesh) => {
        arrowMesh.resetHoverEffect(mode);
      });
    }
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
      // New 3D-HAP properties
      beta?: number;
      use3DHAPAlgorithm?: boolean;
      hapSystem?: HierarchicalAttractionSystem;
      originHAP?: HAPNode;
      destinationHAP?: HAPNode;
    };
  }
}
