import * as THREE from 'three';
import BoxLayout from 'explorviz-frontend/src/view-objects/layout-models/box-layout.ts';
import BaseMesh from 'explorviz-frontend/src/view-objects/3d/base-mesh.ts';

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

  // TODO: give problems in landscape-restructure.ts
  // Override
  changeTexture(texture: THREE.Texture | string) {
    if (texture instanceof String) {
      const textureLoader = new THREE.TextureLoader();
      const newTexture = new THREE.Texture();

      textureLoader.load(
        texture as string,
        (loadedTexture) => {
          newTexture.image = loadedTexture.image;
          newTexture.needsUpdate = true;
        },
        undefined,
        (error) => {
          console.error('Error loading texture:', error);
        }
      );

      texture = newTexture;
    }

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

      let width = 1;
      let height = 1;
      let depth = 1;
      if (this.geometry instanceof THREE.BoxGeometry) {
        width = this.geometry.parameters.width * this.scale.x;
        height = this.geometry.parameters.height * this.scale.y;
        depth = this.geometry.parameters.depth * this.scale.z;
      }

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
