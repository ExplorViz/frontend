import * as THREE from 'three';
import BaseMesh from '../base-mesh';
import PlaneLayout from '../../layout-models/plane-layout';

export default abstract class PlaneMesh extends BaseMesh {
  layout: PlaneLayout;

  constructor(defaultColor: THREE.Color, highlightingColor: THREE.Color, layout: PlaneLayout) {
    super(defaultColor, highlightingColor);
    this.layout = layout;
  }
}
