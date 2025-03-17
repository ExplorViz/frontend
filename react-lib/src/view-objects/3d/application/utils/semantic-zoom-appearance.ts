import * as THREE from 'three';
import { Mesh } from 'three';
import { Recipe } from './semantic-zoom-recipe';

/**
 * Appearence class stores an recipe of how to change the appearence of any SemanticZoomableObject.
 * It handles the recipe
 *
 */
// TODO integrate Appearence class in the SemanticZoomableObjectBaseMixin
export class Appearence {
  // is like a recipe to tell the original/base 3d Object how to change

  // is the Appearence currently active.
  activated: boolean = false;
  // triggered when `activate` gets called
  callBeforeActivation: (currentMesh: Mesh | undefined) => void = () => {};
  callAfterActivation: (currentMesh: Mesh | undefined) => void = () => {};
  callAfterDeactivation: (currentMesh: Mesh | undefined) => void = () => {};

  recipe: Recipe | undefined;
  originObject3D: Mesh | undefined;

  constructor();
  constructor(rec?: Recipe) {
    this.recipe = rec;
  }
  public activate(): boolean {
    this.callBeforeActivation(this.originObject3D);
    const success = this.handleRecipe();
    this.activated = true;
    this.callAfterActivation(this.originObject3D);
    return success;
  }
  public deactivate(): boolean {
    this.callAfterDeactivation(this.originObject3D);
    this.activated = false;
    return false;
  }
  public isEnabled(): boolean {
    return false;
  }
  public setRecipe(rec: Recipe) {
    this.recipe = rec;
  }
  public setObject3D(obj3d: Mesh) {
    this.originObject3D = obj3d;
  }
  private handleRecipe(): boolean {
    if (this.recipe == undefined) return false;
    if (this.originObject3D == undefined) return false;
    // Select between Vector add and override

    // Task 1 set visibility
    if (this.recipe.modifiedParams[0])
      this.originObject3D.visible = this.recipe.visible;

    // Task 2 set position X
    // Task 3 set position Y
    // Task 4 set position Z
    if (!this.recipe.valuesAreAbs) {
      this.originObject3D.position.add(
        new THREE.Vector3(
          this.recipe.positionX,
          this.recipe.positionY,
          this.recipe.positionZ
        )
      );
    } else {
      this.originObject3D.position.set(
        this.recipe.modifiedParams[1]
          ? this.recipe.positionX
          : this.originObject3D.position.x,
        this.recipe.modifiedParams[2]
          ? this.recipe.positionY
          : this.originObject3D.position.y,
        this.recipe.modifiedParams[3]
          ? this.recipe.positionZ
          : this.originObject3D.position.z
      );
    }

    // Task 5 set width
    // Task 6 set height
    // Task 7 set depth
    if (
      !this.recipe.valuesAreAbs &&
      this.originObject3D.geometry instanceof THREE.BoxGeometry
    ) {
      const new_geometry = new THREE.BoxGeometry(
        this.recipe.modifiedParams[4]
          ? this.recipe.width + this.originObject3D.geometry.parameters.width
          : this.originObject3D.geometry.parameters.width,
        this.recipe.modifiedParams[5]
          ? this.recipe.height + this.originObject3D.geometry.parameters.height
          : this.originObject3D.geometry.parameters.height,
        this.recipe.modifiedParams[6]
          ? this.recipe.depth + this.originObject3D.geometry.parameters.depth
          : this.originObject3D.geometry.parameters.depth
      );
      this.originObject3D.geometry.dispose();
      this.originObject3D.geometry = new_geometry;
    } else if (this.originObject3D.geometry instanceof THREE.BoxGeometry) {
      const new_geometry = new THREE.BoxGeometry(
        this.recipe.modifiedParams[4]
          ? this.recipe.width
          : this.originObject3D.geometry.parameters.width,
        this.recipe.modifiedParams[5]
          ? this.recipe.height
          : this.originObject3D.geometry.parameters.height,
        this.recipe.modifiedParams[6]
          ? this.recipe.depth
          : this.originObject3D.geometry.parameters.depth
      );
      this.originObject3D.geometry.dispose();
      this.originObject3D.geometry = new_geometry;

      // this.originObject3D.scale.set(
      //   this.recipe.modifiedParams[4]
      //     ? this.recipe.width
      //     : this.originObject3D.scale.x,
      //   this.recipe.modifiedParams[5]
      //     ? this.recipe.height
      //     : this.originObject3D.scale.y,
      //   this.recipe.modifiedParams[6]
      //     ? this.recipe.depth
      //     : this.originObject3D.scale.z
      // );
    }
    // Task 8 set width
    // Task 9 set height
    // Task 10 set depth
    if (!this.recipe.valuesAreAbs) {
      this.originObject3D.scale.add(
        new THREE.Vector3(
          this.recipe.scalewidth,
          this.recipe.scaleheight,
          this.recipe.scaledepth
        )
      );
    } else {
      this.originObject3D.scale.set(
        this.recipe.modifiedParams[7]
          ? this.recipe.scalewidth
          : this.originObject3D.scale.x,
        this.recipe.modifiedParams[8]
          ? this.recipe.scaleheight
          : this.originObject3D.scale.y,
        this.recipe.modifiedParams[9]
          ? this.recipe.scaledepth
          : this.originObject3D.scale.z
      );
    }

    // Task 11 set color
    // TODO Fix coloring Problem
    if (this.recipe.modifiedParams[10]) {
      throw new Error('Color changing is not yet implemented');
    }
    //this.object3D.material.color.set(this.recipe.color);
    //console.log('We colored!!');

    // Task 12 set radius
    // TODO Only for Circles

    //Task 13
    if (this.recipe.modifiedParams[12] && this.recipe.geometry != undefined) {
      this.originObject3D.geometry = this.recipe.geometry;
    }
    //Task 14
    if (this.recipe.modifiedParams[13] && this.recipe.material != undefined) {
      this.originObject3D.material = this.recipe.material;
    }
    // Task 15 Restore Childs
    if (this.recipe.modifiedParams[14] && this.originObject3D != undefined) {
      while (this.originObject3D.children.length) {
        this.originObject3D.remove(this.originObject3D.children[0]);
      }
      this.recipe.childs.forEach((element) => {
        this.originObject3D!.add(element);
      });
    }
    return true;
  }
}
