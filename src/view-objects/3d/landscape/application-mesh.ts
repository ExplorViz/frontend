import * as THREE from 'three';
import PlaneMesh from './plane-mesh';
import PlaneLayout from '../../layout-models/plane-layout';
import { Application } from '../../../utils/landscape-schemes/structure-data';

export default class ApplicationMesh extends PlaneMesh {
  dataModel: Application;

  material: THREE.MeshBasicMaterial;

  depth: number;

  defaultZ: number;

  constructor(
    layout: PlaneLayout,
    applicationModel: Application,
    defaultColor: THREE.Color,
    highlightingColor = new THREE.Color('red'),
    depth = 0,
    zPos = 0.03
  ) {
    super(defaultColor, highlightingColor, layout);

    this.dataModel = applicationModel;
    this.depth = depth;
    this.defaultZ = zPos;

    this.material = new THREE.MeshBasicMaterial({ color: defaultColor });
    if (depth <= 0) {
      this.geometry = new THREE.PlaneGeometry(layout.width, layout.height);
    } else {
      this.geometry = new THREE.BoxGeometry(layout.width, layout.height, depth);
    }
  }

  setToDefaultPosition(centerPoint: THREE.Vector2) {
    const centerX =
      this.layout.positionX + this.layout.width / 2 - centerPoint.x;
    const centerY =
      this.layout.positionY - this.layout.height / 2 - centerPoint.y;

    this.position.set(centerX, centerY, this.defaultZ);
  }
}
