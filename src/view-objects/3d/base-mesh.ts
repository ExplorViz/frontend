import * as THREE from 'three';
import calculateColorBrightness from 'explorviz-frontend/src/utils/helpers/threejs-helpers';
import { MeshLineMaterial } from 'meshline';

export default abstract class BaseMesh<
  TGeometry extends THREE.BufferGeometry = THREE.BufferGeometry,
  TMaterial extends THREE.Material | THREE.Material[] = THREE.Material,
> extends THREE.Mesh<TGeometry, TMaterial> {
  // @tracked
  private _highlighted: boolean = false;

  set highlighted(value: boolean) {
    if (value) {
      this.highlight();
    } else {
      this.unhighlight();
    }
  }

  get highlighted(): boolean {
    return this._highlighted;
  }

  _defaultColor: THREE.Color = new THREE.Color();

  get defaultColor(): THREE.Color {
    return this._defaultColor;
  }

  set defaultColor(value: THREE.Color) {
    this._defaultColor = value.clone();

    if (
      (this.material instanceof THREE.MeshBasicMaterial ||
        this.material instanceof THREE.MeshLambertMaterial) &&
      !this._highlighted
    ) {
      this.material.color = value;
    }
  }

  defaultOpacity: number = 1;

  _highlightingColor: THREE.Color = new THREE.Color('red');

  get highlightingColor(): THREE.Color {
    return this._highlightingColor;
  }

  set highlightingColor(value: THREE.Color) {
    this._highlightingColor = value;
  }

  private _isHovered = false;

  set isHovered(value: boolean) {
    if (value) {
      this.applyHoverEffect();
    } else {
      this.resetHoverEffect();
    }
  }

  get isHovered(): boolean {
    return this._isHovered;
  }

  getPoI(): Array<THREE.Vector3> {
    const worldPos = new THREE.Vector3();
    this.getWorldPosition(worldPos);
    return [worldPos];
  }

  show() {
    if (this.material instanceof THREE.Material) {
      this.material.visible = true;
      this.material.needsUpdate = true;
    }

    this.children.forEach((childObj) => {
      if (childObj instanceof BaseMesh) {
        childObj.show();
      }
    });
  }

  hide() {
    if (this.material instanceof THREE.Material) {
      this.material.visible = false;
      this.material.needsUpdate = true;
    }

    this.children.forEach((childObj) => {
      if (childObj instanceof BaseMesh) {
        childObj.hide();
      }
    });
  }

  get texturePath(): string | null {
    if (
      this.material instanceof THREE.MeshBasicMaterial ||
      this.material instanceof THREE.MeshLambertMaterial ||
      this.material instanceof MeshLineMaterial
    ) {
      return this.material.map ? this.material.map.image.src : null;
    }
    return null;
  }

  changeTexture(
    texture: THREE.Texture,
    repeatX: number = 5,
    repeatY: number = repeatX
  ) {
    if (
      this.material instanceof THREE.MeshBasicMaterial ||
      this.material instanceof THREE.MeshLambertMaterial ||
      this.material instanceof MeshLineMaterial
    ) {
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.offset.set(0, 0);
      texture.repeat.set(repeatX, repeatY);

      this.material.map = texture;
      this.material.blending = THREE.NormalBlending;

      this.material.needsUpdate = true;
    }
  }

  changeColor(color: THREE.Color) {
    if (
      this.material instanceof THREE.MeshBasicMaterial ||
      this.material instanceof THREE.MeshLambertMaterial ||
      this.material instanceof MeshLineMaterial
    ) {
      this.defaultColor = color;
      this.material.needsUpdate = true;
    }
  }

  highlight() {
    this._highlighted = true;
    if (
      this.material instanceof THREE.MeshLambertMaterial ||
      this.material instanceof THREE.MeshBasicMaterial ||
      this.material instanceof MeshLineMaterial
    ) {
      this.material.color = this.highlightingColor;
    }
  }

  unhighlight() {
    this._highlighted = false;
    if (
      this.material instanceof THREE.MeshLambertMaterial ||
      this.material instanceof THREE.MeshBasicMaterial ||
      this.material instanceof MeshLineMaterial
    ) {
      this.material.color = this.defaultColor;
    }
  }

  replayBlinkEffect(duration = 1000): void {
    if (
      this.material instanceof THREE.MeshLambertMaterial ||
      this.material instanceof THREE.MeshBasicMaterial ||
      this.material instanceof MeshLineMaterial
    ) {
      this.material.color = new THREE.Color('yellow');
    }

    setTimeout(() => {
      if (
        this.material instanceof THREE.MeshLambertMaterial ||
        this.material instanceof THREE.MeshBasicMaterial ||
        this.material instanceof MeshLineMaterial
      ) {
        if (this.highlighted) {
          this.material.color = this.highlightingColor;
        } else {
          this.material.color = this.defaultColor;
        }
      }
    }, duration);
  }

  /**
   * Alters the color of a given mesh such that it is clear which mesh
   * the mouse points at
   *
   * @param colorShift Specifies color shift: <1 is darker and >1 is lighter
   */
  applyHoverEffect(colorShift = 1.1): void {
    if (this._isHovered) return;

    // Calculate and apply brighter color to material ('hover effect')
    if (
      this.material instanceof THREE.MeshLambertMaterial ||
      this.material instanceof THREE.MeshBasicMaterial ||
      this.material instanceof MeshLineMaterial
    ) {
      this.material.color = calculateColorBrightness(
        new THREE.Color(this.material.color),
        colorShift
      );
      this._isHovered = true;
    }
  }

  /**
   * Restores original color of mesh which had a hover effect
   */
  resetHoverEffect(): void {
    if (
      this.material instanceof THREE.MeshLambertMaterial ||
      this.material instanceof THREE.MeshBasicMaterial ||
      this.material instanceof MeshLineMaterial
    ) {
      const { highlighted, defaultColor, highlightingColor } = this;

      // Restore normal color (depends on highlighting status)
      this.material.color = highlighted ? highlightingColor : defaultColor;

      this._isHovered = false;
    }
  }

  updateColor() {
    if (
      this.material instanceof THREE.MeshLambertMaterial ||
      this.material instanceof THREE.MeshBasicMaterial ||
      this.material instanceof MeshLineMaterial
    ) {
      if (this.highlighted) {
        this.material.color = this.highlightingColor;
      } else {
        this.material.color = this.defaultColor;
      }
      this.material.needsUpdate = true;
    }
  }

  changeOpacity(opacity: number) {
    const isTransparent = opacity < 1;
    if (this.material instanceof THREE.Material) {
      this.material.opacity = opacity;
      this.material.transparent = isTransparent;
      this.material.needsUpdate = true;
    }

    this.children.forEach((childObj) => {
      if (childObj instanceof BaseMesh) {
        childObj.changeOpacity(opacity);
      }
    });
  }

  turnOpaque() {
    this.changeOpacity(1.0);
  }

  turnTransparent(opacity = 0.3) {
    this.changeOpacity(opacity);
  }

  deleteFromParent() {
    if (this.parent) {
      this.parent.remove(this);
    }
  }

  /**
   * Disposes the mesh's geometry and material
   * and does so recursively for the child BaseMeshes
   */
  disposeRecursively() {
    this.traverse((child) => {
      if (child instanceof BaseMesh) {
        if (child.geometry) {
          child.geometry.dispose();
        }
        if (child.material instanceof THREE.Material) {
          child.material.dispose();
        } else {
          for (let j = 0; j < child.material.length; j++) {
            const material = child.material[j];
            material.dispose();
          }
        }
      }
    });
  }

  set scaleAll(all: number) {
    this.scale.x += all;
    this.scale.y += all;
    this.scale.z += all;
  }
}
