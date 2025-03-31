import * as THREE from 'three';
import CommunicationLayout from 'explorviz-frontend/src/view-objects/layout-models/communication-layout.ts';
import BaseMesh from 'explorviz-frontend/src/view-objects/3d/base-mesh.ts';
import CommunicationArrowMesh from 'explorviz-frontend/src/view-objects/3d/application/communication-arrow-mesh';
import ClazzCommuMeshDataModel from 'explorviz-frontend/src/view-objects/3d/application/utils/clazz-communication-mesh-data-model';
import SemanticZoomManager from './utils/semantic-zoom-manager';
import { VisualizationMode } from 'explorviz-frontend/src/stores/collaboration/local-user';
import { SceneLayers } from 'explorviz-frontend/src/stores/minimap-service';

export default class ClazzCommunicationMesh extends BaseMesh {
  dataModel: ClazzCommuMeshDataModel;

  layout: CommunicationLayout;
  _layout_original: CommunicationLayout;
  potentialBidirectionalArrow!: CommunicationArrowMesh | undefined;

  curveHeight: number = 0.0;

  applicationCenter: THREE.Vector3 = new THREE.Vector3();

  constructor(
    layout: CommunicationLayout,
    dataModel: ClazzCommuMeshDataModel,
    defaultColor: THREE.Color,
    highlightingColor: THREE.Color
  ) {
    super(defaultColor, highlightingColor);
    this.layout = layout;
    this._layout_original = layout.copy();
    this.dataModel = dataModel;

    this.material = new THREE.MeshBasicMaterial({
      color: defaultColor,
    });
    this.material.transparent = true;
    SemanticZoomManager.instance.add(this);
    this.saveCurrentlyActiveLayout();
    // this.setCallBeforeAppearenceZero(() => {
    //   this.layout = this._layout_original;
    // });
    // this.setCallBeforeAppearenceAboveZero(() => {
    //   this.layout = this._layout_original;
    // });

    this.setAppearence(2, () => {
      this.layout.lineThickness = this._layout_original.lineThickness / 2;
      this.geometry.dispose();
      this.render(this.applicationCenter, this.curveHeight);
    });
    this.setAppearence(3, () => {
      this.layout.lineThickness = this._layout_original.lineThickness / 3;
      this.geometry.dispose();
      this.render(this.applicationCenter, this.curveHeight);
    });
    this.setAppearence(4, () => {
      this.layout.lineThickness = this._layout_original.lineThickness / 4;
      this.geometry.dispose();
      this.render(this.applicationCenter, this.curveHeight);
    });
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
    // this.getWorldPosition(this.layout.startPoint);
    // this.getWorldPosition(this.layout.endPoint);
    // const worldPosStart = this.layout.startPoint;
    // const worldPosEnd = this.layout.endPoint;
    return [...orignalWorldPos, worldPosStart, worldPosEnd];
  }

  saveCurrentlyActiveLayout() {
    this._layout_original = this.layout.copy();

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
  renderAsLine(applicationCenter: THREE.Vector3) {
    const { layout } = this;
    const { startPoint } = layout;
    const { endPoint } = layout;

    const start = new THREE.Vector3();
    start.subVectors(startPoint, applicationCenter);

    const end = new THREE.Vector3();
    end.subVectors(endPoint, applicationCenter);

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
    this.position.copy(
      new THREE.Vector3().subVectors(layout.startPoint, applicationCenter)
    );
    this.geometry = new THREE.SphereGeometry(0.5);

    return;
  }

  /**
   * Renders the communication mesh as cylinder geometry.
   *
   * @param applicationCenter The center point of the application.
   * @param curveHeight Max height of the communication. Default 0.0
   * @param desiredSegments The number of segments (tubes) the geometry persists of. Default 20
   */
  render(
    applicationCenter = new THREE.Vector3(),
    curveHeight = 0.0,
    desiredSegments = 20
  ) {
    // Handle recursive communication
    if (this.dataModel.communication.isRecursive) {
      this.renderRecursiveCommunication(applicationCenter);
      return;
    }

    this.applicationCenter = applicationCenter;
    this.curveHeight = curveHeight;
    const { layout } = this;

    const start = new THREE.Vector3();
    start.subVectors(layout.startPoint, applicationCenter);

    const end = new THREE.Vector3();
    end.subVectors(layout.endPoint, applicationCenter);

    // Determine middle
    const dir = end.clone().sub(start);
    const length = dir.length();
    const halfVector = dir.normalize().multiplyScalar(length * 0.5);
    const middle = start.clone().add(halfVector);
    middle.y += curveHeight;

    const curve = new THREE.QuadraticBezierCurve3(start, middle, end);

    let curveSegments = desiredSegments;
    // Render straigt tube if curve height of 0.0 is provided
    if (curveHeight === 0.0) {
      curveSegments = 1;
    }

    this.geometry = new THREE.TubeGeometry(
      curve,
      curveSegments,
      layout.lineThickness
    );
  }

  /**
   * Adds communication arrows on top of the communication mesh
   * to visualize communication direction
   *
   * @param applicationCenter The application's center point
   * @param width The width of the arrow. Default 1.0
   * @param yOffset Units to move the communication arrows up by. Default 1.0
   * @param color The color of the arrows. Default black
   */
  addArrows(
    applicationCenter = new THREE.Vector3(),
    width: number,
    yOffset: number,
    color: THREE.Color
  ) {
    const { layout } = this;
    // Scale arrow with communication line thickness
    const { startPoint } = layout;
    const { endPoint } = layout;

    const arrowWidth = width + layout.lineThickness / 2;

    const start = new THREE.Vector3();
    const end = new THREE.Vector3();

    if (!this.dataModel.communication.isRecursive) {
      start.subVectors(startPoint, applicationCenter);
      end.subVectors(endPoint, applicationCenter);
    }

    this.addArrow(start, end, arrowWidth, yOffset, color);

    // Add 2nd arrow to visualize bidirectional communication
    if (this.dataModel.communication.isBidirectional) {
      this.addArrow(end, start, arrowWidth, yOffset, color);
    } else {
      // save arrow for potential upcoming use
      this.potentialBidirectionalArrow = this.createArrowMesh(
        end,
        start,
        arrowWidth,
        yOffset,
        color
      );
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
   * @param width The width of the arrow.
   * @param yOffset Units to move the communication arrow up by. Default 1.0
   * @param color The color of the arrow.
   */
  private addArrow(
    start: THREE.Vector3,
    end: THREE.Vector3,
    width: number,
    yOffset: number,
    color: THREE.Color
  ) {
    const dir = new THREE.Vector3().subVectors(end, start);
    const len = dir.length();
    // Do not draw precisely in the middle to leave a
    // small gap in case of bidirectional communication
    const halfVector = dir.normalize().multiplyScalar(len * 0.51);
    const middle = start.clone().add(halfVector);

    // Normalize the direction vector (convert to vector of length 1)
    dir.normalize();

    // Arrow properties
    const origin = new THREE.Vector3(middle.x, middle.y + yOffset, middle.z);
    const headWidth = Math.max(0.5, width);
    const headLength = Math.min(2 * headWidth, 0.3 * len);
    const length = headLength + 0.00001; // body of arrow not visible

    if (this.dataModel.communication) {
      const arrow = new CommunicationArrowMesh(
        this.dataModel.communication,
        dir,
        origin,
        length,
        color,
        headLength,
        headWidth
      );
      this.add(arrow);
      // debugger;
      // arrow.saveTheParent();
      if (SemanticZoomManager.instance.isEnabled) {
        arrow.layers.disableAll();
        //this.remove(arrow);
        // arrow.layers.disableAll();
        // arrow.layers.set(2);
      }
      SemanticZoomManager.instance.add(arrow);
    }
  }

  private createArrowMesh(
    start: THREE.Vector3,
    end: THREE.Vector3,
    width: number,
    yOffset: number,
    color: THREE.Color
  ) {
    const dir = new THREE.Vector3().subVectors(end, start);
    const len = dir.length();
    // Do not draw precisely in the middle to leave a
    // small gap in case of bidirectional communication
    const halfVector = dir.normalize().multiplyScalar(len * 0.51);
    const middle = start.clone().add(halfVector);

    // Normalize the direction vector (convert to vector of length 1)
    dir.normalize();

    // Arrow properties
    const origin = new THREE.Vector3(middle.x, middle.y + yOffset, middle.z);
    const headWidth = Math.max(0.5, width);
    const headLength = Math.min(2 * headWidth, 0.3 * len);
    const length = headLength + 0.00001; // body of arrow not visible

    if (this.dataModel.communication) {
      return new CommunicationArrowMesh(
        this.dataModel.communication,
        dir,
        origin,
        length,
        color,
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
      this.render(this.applicationCenter, this.curveHeight);
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
        this.render(this.applicationCenter, this.curveHeight);
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
