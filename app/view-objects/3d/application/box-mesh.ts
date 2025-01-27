import * as THREE from 'three';
import BoxLayout from 'explorviz-frontend/view-objects/layout-models/box-layout';
import BaseMesh from '../base-mesh';

export default abstract class BoxMesh<
  TGeometry extends THREE.BufferGeometry = THREE.BufferGeometry,
  TMaterial extends THREE.Material | THREE.Material[] = THREE.Material,
> extends BaseMesh<TGeometry, TMaterial> {
  layout: BoxLayout;

  constructor(
    layout: BoxLayout,
    defaultColor: THREE.Color,
    highlightingColor: THREE.Color
  ) {
    super(defaultColor, highlightingColor);

    this.layout = layout;

    // Set default dimensions to layout data
    this.height = layout.height;
    this.width = layout.width;
    this.depth = layout.depth;
  }

  // Override
  changeTexture(texture: THREE.Texture) {
    if (
      this.material instanceof THREE.MeshBasicMaterial ||
      this.material instanceof THREE.MeshLambertMaterial
    ) {
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;

      this.material.map = texture;
      //this.material.blending = THREE.NormalBlending;

      this.material.needsUpdate = true;

      // https://codepen.io/boytchev/pen/wvYeMrG

      const pos = this.geometry.getAttribute('position');
      const uv = this.geometry.getAttribute('uv');

      const width = this.geometry.parameters.width * this.scale.x;

      const height = this.geometry.parameters.height * this.scale.y;

      const depth = this.geometry.parameters.depth * this.scale.z;

      for (let i = 0; i < pos.count; i++) {
        const x = width * (pos.getX(i) + 0.5);
        const y = height * (pos.getY(i) + 0.5);
        const z = depth * (pos.getZ(i) + 0.5);

        if (i < 8) uv.setXY(i, z, y);
        else if (i < 16) uv.setXY(i, x, z);
        else uv.setXY(i, y, x);
      }
      uv.needsUpdate = true;
    }
  }

  private setterHelper(fn: () => void) {
    // Semantic Zoom Injection
    //if (this instanceof BaseMesh) this.restoreOriginalAppearence();

    fn();

    // Save new Original
    //if (this instanceof BaseMesh) {
    //  this.saveOriginalAppearence();
    //  this.restoreAppearence();
  }

  updateLayout(layout: BoxLayout, offset: THREE.Vector3 = new THREE.Vector3()) {
    this.layout = layout;
    const layoutPosition = this.layout.position.clone();

    // Box meshes origin is in the center
    const centerPoint = new THREE.Vector3(
      layoutPosition.x + this.layout.width / 2.0,
      layoutPosition.y + this.layout.height / 2.0,
      layoutPosition.z + this.layout.depth / 2.0
    );

    this.position.copy(centerPoint);
    this.position.sub(offset);

    this.height = layout.height;
    this.width = layout.width;
    this.depth = layout.depth;

    this.saveOriginalAppearence();
  }

  get width() {
    return this.scale.x;
  }

  set width(width: number) {
    this.setterHelper(() => (this.scale.x = width));
  }

  get height() {
    return this.scale.y;
  }

  set height(height: number) {
    this.setterHelper(() => (this.scale.y = height));
  }

  get depth() {
    return this.scale.z;
  }

  set depth(depth: number) {
    this.setterHelper(() => (this.scale.z = depth));
  }
}
