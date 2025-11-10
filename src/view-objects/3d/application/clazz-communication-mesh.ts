// import { extend, ThreeElement } from '@react-three/fiber';
// import { VisualizationMode } from 'explorviz-frontend/src/stores/collaboration/local-user';
// import { SceneLayers } from 'explorviz-frontend/src/stores/minimap-service';
// import CommunicationArrowMesh from 'explorviz-frontend/src/view-objects/3d/application/communication-arrow-mesh';
// import ClazzCommuMeshDataModel from 'explorviz-frontend/src/view-objects/3d/application/utils/clazz-communication-mesh-data-model';
// import BaseMesh from 'explorviz-frontend/src/view-objects/3d/base-mesh.ts';
// import CommunicationLayout from 'explorviz-frontend/src/view-objects/layout-models/communication-layout.ts';
// import * as THREE from 'three';

// export default class ClazzCommunicationMesh extends BaseMesh {
//   dataModel: ClazzCommuMeshDataModel;

//   _layout: CommunicationLayout | undefined;

//   get layout() {
//     return this._layout;
//   }

//   set layout(layout: CommunicationLayout) {
//     this._layout = layout;
//     this.render();
//   }

//   _curveHeight: number = 0.0;

//   get curveHeight() {
//     return this._curveHeight;
//   }

//   set curveHeight(curveHeight: number) {
//     this._curveHeight = curveHeight;
//     this.render();
//   }

//   _arrowColor = new THREE.Color('black');

//   get arrowColor() {
//     return this._arrowColor;
//   }

//   set arrowColor(color: THREE.Color) {
//     this._arrowColor = color;
//   }

//   _arrowWidth = 1;

//   get arrowWidth() {
//     return this._arrowWidth;
//   }

//   set arrowWidth(width: number) {
//     if (this.layout) {
//       this._arrowWidth = width + this.layout.lineThickness / 2;
//       this.addArrows();
//     } else {
//       this._arrowWidth = width;
//     }
//   }

//   _arrowOffset = 1;

//   get arrowOffset() {
//     return this._arrowOffset;
//   }

//   set arrowOffset(offset: number) {
//     this._arrowOffset = offset;
//     this.addArrows();
//   }

//   // _layout_original: CommunicationLayout;
//   potentialBidirectionalArrow!: CommunicationArrowMesh | undefined;

//   applicationCenter: THREE.Vector3 = new THREE.Vector3();

//   constructor(dataModel: ClazzCommuMeshDataModel) {
//     super();
//     this.dataModel = dataModel;

//     // this._layout_original = this.layout.copy();

//     this.material = new THREE.MeshBasicMaterial({
//       color: this.defaultColor,
//     });
//     this.material.transparent = true;
//   }

//   /**
//    * Override PoI in order to get start, center and end point
//    * @returns Array of PoI
//    */
//   getPoI(): Array<THREE.Vector3> {
//     let worldPosStart = new THREE.Vector3();
//     let worldPosEnd = new THREE.Vector3();
//     const orignalWorldPos: Array<THREE.Vector3> = super.getPoI();
//     const start = new THREE.Vector3();
//     start.subVectors(this.layout.startPoint, this.applicationCenter);

//     const end = new THREE.Vector3();
//     end.subVectors(this.layout.endPoint, this.applicationCenter);
//     worldPosStart = this.localToWorld(start);
//     worldPosEnd = this.localToWorld(end);
//     // this.getWorldPosition(this.layout.startPoint);
//     // this.getWorldPosition(this.layout.endPoint);
//     // const worldPosStart = this.layout.startPoint;
//     // const worldPosEnd = this.layout.endPoint;
//     return [...orignalWorldPos, worldPosStart, worldPosEnd];
//   }

//   saveCurrentlyActiveLayout() {
//     this._layout_original = this.layout.copy();

//     this.layers.enable(SceneLayers.Communication);
//   }

//   getModelId() {
//     return this.dataModel.id;
//   }

//   /**
//    * Turns the mesh and its arrows transparent, if value in [0,1). Fully transparent at 0.0
//    *
//    * @param opacity Desired transparency of mesh and its arrows. Default 0.3
//    */
//   turnTransparent(opacity = 0.3) {
//     super.turnTransparent(opacity);

//     this.children.forEach((childObject) => {
//       if (childObject instanceof CommunicationArrowMesh) {
//         childObject.turnTransparent(opacity);
//       }
//     });
//   }

//   /**
//    * Turns mesh and communication arrows back to fully opaque.
//    */
//   turnOpaque() {
//     super.turnOpaque();
//     this.children.forEach((childObject) => {
//       if (childObject instanceof CommunicationArrowMesh) {
//         childObject.turnOpaque();
//       }
//     });
//   }

//   show() {
//     super.show();
//     this.children.forEach((childObject) => {
//       if (childObject instanceof CommunicationArrowMesh) {
//         childObject.show();
//       }
//     });
//   }

//   hide() {
//     super.hide();
//     this.children.forEach((childObject) => {
//       if (childObject instanceof CommunicationArrowMesh) {
//         childObject.hide();
//       }
//     });
//   }

//   /**
//    * Renders the communication mesh as straight cylinder geometry.
//    *
//    * @param applicationCenter The center point of the application
//    */
//   renderAsLine() {
//     const { layout } = this;
//     const { startPoint } = layout;
//     const { endPoint } = layout;

//     const start = startPoint; //new THREE.Vector3();
//     // start.subVectors(startPoint, applicationCenter);

//     const end = endPoint; // new THREE.Vector3();
//     // end.subVectors(endPoint, applicationCenter);

//     const direction = new THREE.Vector3().subVectors(end, start);
//     const orientation = new THREE.Matrix4();
//     orientation.lookAt(start, end, new THREE.Object3D().up);
//     orientation.multiply(
//       new THREE.Matrix4().set(1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1)
//     );

//     const { lineThickness } = layout;
//     const edgeGeometry = new THREE.CylinderGeometry(
//       lineThickness,
//       lineThickness,
//       direction.length(),
//       20,
//       1
//     );
//     this.geometry = edgeGeometry;
//     this.applyMatrix4(orientation);

//     // Set position to center of pipe
//     this.position.copy(end.add(start).divideScalar(2));
//   }

//   renderRecursiveCommunication(applicationCenter = new THREE.Vector3()) {
//     this.applicationCenter = applicationCenter;
//     const { layout } = this;

//     // Place sphere for communication above corresponding class
//     this.position.copy(layout.startPoint);
//     this.geometry = new THREE.SphereGeometry(0.5);

//     return;
//   }

//   /**
//    * Renders the communication mesh as cylinder geometry.
//    *
//    * @param curveSegments The number of segments (tubes) the geometry persists of. Default 20
//    */
//   render(curveSegments = 20) {
//     if (!this.layout) return;

//     // Handle recursive communication
//     if (this.dataModel.communication.isRecursive) {
//       this.renderRecursiveCommunication();
//       return;
//     }

//     this.geometry = new THREE.TubeGeometry(
//       this.layout.getCurve({ yOffset: this.curveHeight }),
//       this.curveHeight === 0 ? 1 : curveSegments,
//       this.layout.lineThickness
//     );

//     this.addArrows();
//   }

//   /**
//    * Adds communication arrows on top of the communication mesh
//    * to visualize communication direction
//    *
//    * @param applicationCenter The application's center point
//    * @param width The width of the arrow. Default 1.0
//    * @param yOffset Units to move the communication arrows up by. Default 1.0
//    * @param color The color of the arrows. Default black
//    */
//   addArrows() {
//     if (!this.layout) return;

//     // Remove old arrows which might exist
//     for (let i = this.children.length - 1; i >= 0; i--) {
//       const arrow = this.children[i];
//       this.remove(arrow);
//     }

//     const { layout } = this;
//     // Scale arrow with communication line thickness
//     const { startPoint } = layout;
//     const { endPoint } = layout;

//     const start = new THREE.Vector3();
//     const end = new THREE.Vector3();

//     if (!this.dataModel.communication.isRecursive) {
//       start.copy(startPoint);
//       end.copy(endPoint);
//     }

//     this.addArrow(start, end);

//     // Add 2nd arrow to visualize bidirectional communication
//     if (this.dataModel.communication.isBidirectional) {
//       this.addArrow(end, start);
//     } else {
//       // Save arrow for potential upcoming use
//       this.potentialBidirectionalArrow = this.createArrowMesh(end, start);
//     }
//   }

//   addBidirectionalArrow() {
//     if (
//       this.dataModel.communication.isBidirectional &&
//       this.potentialBidirectionalArrow
//     ) {
//       this.add(this.potentialBidirectionalArrow);
//     }
//   }

//   /**
//    * Adds a single communication arrow.
//    *
//    * @param start The start point of the communication.
//    * @param end The end point of the communication.
//    * @param width The width of the arrow.
//    * @param yOffset Units to move the communication arrow up by. Default 1.0
//    * @param color The color of the arrow.
//    */
//   private addArrow(start: THREE.Vector3, end: THREE.Vector3) {
//     const dir = new THREE.Vector3().subVectors(end, start);
//     const len = dir.length();

//     // Do not draw precisely in the middle to leave a
//     // small gap in case of bidirectional communication
//     const halfVector = dir.normalize().multiplyScalar(len * 0.51);
//     const middle = start.clone().add(halfVector);

//     // Normalize the direction vector (convert to vector of length 1)
//     dir.normalize();

//     // Arrow properties
//     const origin = new THREE.Vector3(
//       middle.x,
//       middle.y + this.arrowOffset + this.curveHeight / 2,
//       middle.z
//     );
//     const headWidth = Math.max(0.5, this.arrowWidth);
//     const headLength = Math.min(2 * headWidth, 0.3 * len);
//     const length = headLength + 0.00001; // body of arrow not visible

//     const arrow = new CommunicationArrowMesh(
//       this.dataModel.communication,
//       dir,
//       origin,
//       length,
//       this.arrowColor,
//       headLength,
//       headWidth
//     );

//     this.add(arrow);
//   }

//   private createArrowMesh(start: THREE.Vector3, end: THREE.Vector3) {
//     const dir = new THREE.Vector3().subVectors(end, start);
//     const len = dir.length();
//     // Do not draw precisely in the middle to leave a
//     // small gap in case of bidirectional communication
//     const halfVector = dir.normalize().multiplyScalar(len * 0.51);
//     const middle = start.clone().add(halfVector);

//     // Normalize the direction vector (convert to vector of length 1)
//     dir.normalize();

//     // Arrow properties
//     const origin = new THREE.Vector3(
//       middle.x,
//       middle.y + this.arrowOffset,
//       middle.z
//     );
//     const headWidth = Math.max(0.5, this.arrowWidth);
//     const headLength = Math.min(2 * headWidth, 0.3 * len);
//     const length = headLength + 0.00001; // body of arrow not visible

//     if (this.dataModel.communication) {
//       return new CommunicationArrowMesh(
//         this.dataModel.communication,
//         dir,
//         origin,
//         length,
//         this.arrowColor,
//         headLength,
//         headWidth
//       );
//     }
//     return undefined;
//   }

//   canBeIntersected() {
//     return true;
//   }

//   applyHoverEffect(arg?: VisualizationMode | number): void {
//     if (arg === 'vr' && !this.isHovered) {
//       this.layout.lineThickness *= 5;
//       this.geometry.dispose();
//       this.render();
//       super.applyHoverEffect();

//       this.getArrowMeshes().forEach((arrowMesh) => {
//         arrowMesh.applyHoverEffect(arg);
//       });
//     } else if (!this.isHovered) {
//       super.applyHoverEffect();
//     }
//   }

//   resetHoverEffect(mode?: VisualizationMode): void {
//     if (this.isHovered) {
//       super.resetHoverEffect();
//       if (mode === 'vr') {
//         this.layout.lineThickness /= 5;
//         this.geometry.dispose();
//         this.render();
//       }

//       this.getArrowMeshes().forEach((arrowMesh) => {
//         arrowMesh.resetHoverEffect(mode);
//       });
//     }
//   }

//   getArrowMeshes() {
//     const arrowMeshes: CommunicationArrowMesh[] = [];
//     this.children.forEach((childObject) => {
//       if (childObject instanceof CommunicationArrowMesh) {
//         arrowMeshes.push(childObject);
//       }
//     });
//     return arrowMeshes;
//   }
// }

// extend({ ClazzCommunicationMesh });

// // Add types to ThreeElements elements so primitives pick up on it
// declare module '@react-three/fiber' {
//   interface ThreeElements {
//     clazzCommunicationMesh: ThreeElement<typeof ClazzCommunicationMesh>;
//   }
// }

import { extend, ThreeElement } from '@react-three/fiber';
import { VisualizationMode } from 'explorviz-frontend/src/stores/collaboration/local-user';
import { SceneLayers } from 'explorviz-frontend/src/stores/minimap-service';
import CommunicationArrowMesh from 'explorviz-frontend/src/view-objects/3d/application/communication-arrow-mesh';
import ClazzCommuMeshDataModel from 'explorviz-frontend/src/view-objects/3d/application/utils/clazz-communication-mesh-data-model';
import BaseMesh from 'explorviz-frontend/src/view-objects/3d/base-mesh.ts';
import CommunicationLayout from 'explorviz-frontend/src/view-objects/layout-models/communication-layout.ts';
import { BundledCommunicationLayout } from './bundled-communication-layout';
import { EdgeBundlingProcessor, EdgeBundlingConfig } from './edge-bundling-utils';
import * as THREE from 'three';

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
    if (this.layout) {
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

  // Edge Bundling Properties
  private _enableEdgeBundling: boolean = false;
  private _bundleGroupId: string | null = null;

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

  constructor(dataModel: ClazzCommuMeshDataModel) {
    super();
    this.dataModel = dataModel;

    this.material = new THREE.MeshBasicMaterial({
      color: this.defaultColor,
    });
    this.material.transparent = true;
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

    // Handle recursive communication
    if (this.dataModel.communication.isRecursive) {
      this.renderRecursiveCommunication();
      return;
    }

    if (!this._enableEdgeBundling || !this.isBundledLayout()) {
      // ORIGINALER ALGORITHMUS - so wie vor Edge Bundling
      this.geometry = new THREE.TubeGeometry(
        this.layout.getCurve({ yOffset: this.curveHeight }),
        this.curveHeight === 0 ? 1 : curveSegments,
        this.layout.lineThickness
      );
    } else {
      // If Edge Bundling is turned on: use bundled algorithm 
      this.renderWithEdgeBundling(curveSegments);
    }

    this.addArrows();
  }

  /**
   * Check if layout is BundledCommunicationLayout
   */
  private isBundledLayout(): boolean {
    return this.layout instanceof BundledCommunicationLayout;
  }

  /**
   * Get layout as BundledCommunicationLayout if possible
   */
  private getBundledLayout(): BundledCommunicationLayout | null {
    return this.isBundledLayout() ? this.layout as unknown as BundledCommunicationLayout : null;
  }

  /**
   * Render with edge bundling algorithm
   */
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
      opacity: 0.8
    });
  }

  /**
   * Update edge bundling based on group of communications
   */
  public updateEdgeBundling(
    allCommunications: ClazzCommunicationMesh[],
    config?: Partial<EdgeBundlingConfig>
  ): void {
    if (!this.layout || !this._enableEdgeBundling) return;

    const bundledLayout = this.getBundledLayout();
    if (!bundledLayout) return;

    const compatibleEdges = allCommunications.filter(comm => 
      comm !== this && 
      comm.bundleGroupId === this.bundleGroupId &&
      comm.layout &&
      comm.isBundledLayout()
    );

    if (compatibleEdges.length > 0) {
      // Extract control points for bundling
      const edges: THREE.Vector3[][] = [
        bundledLayout.getControlPoints()
      ];

      compatibleEdges.forEach(comm => {
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
    };
  }
}