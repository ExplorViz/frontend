import * as THREE from 'three';
import { Node } from '../../../utils/landscape-schemes/structure-data';
import PlaneMesh from './plane-mesh';
import PlaneLayout from '../../layout-models/plane-layout';

export default class NodeMesh extends PlaneMesh {
  dataModel: Node;

  material: THREE.MeshBasicMaterial;

  depth: number;

  defaultZ: number;

  constructor(
    layout: PlaneLayout,
    nodeModel: Node,
    defaultColor: THREE.Color,
    highlightingColor = new THREE.Color('red'),
    depth = 0,
    zPos = 0.02
  ) {
    super(defaultColor, highlightingColor, layout);

    this.dataModel = nodeModel;
    this.depth = depth;
    this.defaultZ = zPos;

    this.material = new THREE.MeshBasicMaterial({ color: defaultColor });
    if (depth <= 0) {
      this.geometry = new THREE.PlaneGeometry(layout.width, layout.height);
    } else {
      this.geometry = new THREE.BoxGeometry(layout.width, layout.height, depth);
    }
  }

  /**
   * Returns the display name for the node, which is either the node's
   * name, ip address or parent's name.
   *
   * @param parent The parent mesh of this node
   */
  getDisplayName() {
    const node = this.dataModel;

    if (node.hostName && node.hostName.length !== 0) {
      return node.hostName;
    }

    return node.ipAddress;
  }

  setToDefaultPosition(centerPoint: THREE.Vector2) {
    const centerX =
      this.layout.positionX + this.layout.width / 2 - centerPoint.x;
    const centerY =
      this.layout.positionY - this.layout.height / 2 - centerPoint.y;

    this.position.set(centerX, centerY, this.defaultZ);
  }
}
