import * as THREE from 'three';
import { MeshLineMaterial } from 'meshline';
import calculateColorBrightness from '../../utils/helpers/threejs-helpers';

export default abstract class BaseMesh<
  TGeometry extends THREE.BufferGeometry = THREE.BufferGeometry,
  TMaterial extends THREE.Material | THREE.Material[] = THREE.Material
> extends THREE.Mesh<TGeometry, TMaterial> {
  highlighted: boolean = false;

  defaultColor: THREE.Color;

  defaultOpacity: number;

  highlightingColor: THREE.Color;

  isHovered = false;

  constructor(
    defaultColor: THREE.Color = new THREE.Color(),
    highlightingColor = new THREE.Color('red'),
    defaultOpacity = 1
  ) {
    super();
    this.defaultColor = defaultColor;
    this.defaultOpacity = defaultOpacity;
    this.highlightingColor = highlightingColor;
  }

  highlight() {
    this.highlighted = true;
    if (
      this.material instanceof THREE.MeshLambertMaterial ||
      this.material instanceof THREE.MeshBasicMaterial ||
      this.material instanceof MeshLineMaterial
    ) {
      this.material.color = this.highlightingColor;
    }
  }

  unhighlight() {
    this.highlighted = false;
    if (
      this.material instanceof THREE.MeshLambertMaterial ||
      this.material instanceof THREE.MeshBasicMaterial ||
      this.material instanceof MeshLineMaterial
    ) {
      this.material.color = this.defaultColor;
      this.changeOpacity(this.defaultOpacity);
    }
  }

  /**
   * Alters the color of a given mesh such that it is clear which mesh
   * the mouse points at
   *
   * @param colorShift Specifies color shift: <1 is darker and >1 is lighter
   */
  applyHoverEffect(colorShift = 1.1): void {
    if (this.isHovered) return;

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
    }
    this.isHovered = true;
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
    }
    this.isHovered = false;
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
    }
  }

  changeOpacity(opacity: number) {
    const isTransparent = opacity < 1;
    if (this.material instanceof THREE.Material) {
      this.material.opacity = opacity;
      this.material.transparent = isTransparent;
    }
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
}
