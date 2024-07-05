import THREE, { Mesh, Object3D } from 'three'


export interface SemanticZoomableObject {
  // number i is == 0 if not shown
  //              > 0 if appearence selected
  //              < 0 Ignored
  showAppearence(i: number): boolean
  getCurrentAppearenceLevel(): number
  setAppearence(i: number, ap: Appearence, thismesh: Mesh): void
  getNumberOfLevels(): number

}

class Appearence {

  // is like a recipe to tell the original/base 3d Object how to change

  // is the Appearence currently active.
  activated: boolean = false;
  // triggered when `activate` gets called
  callbackFunction: ((currentMesh: Mesh|undefined) => void) = (() => { });
  recipe: Recipe | undefined;
  object3D: Mesh | undefined;


  constructor(object3D: Mesh);
  constructor(object3D: Mesh,rec?: Recipe) {
    this.object3D = object3D
    this.recipe = rec;
  }
  public activate(): boolean {
    this.callbackFunction(this.object3D);
    this.handleRecipe()
    this.activated = true;
    return false;
  }
  public deactivate(): boolean {
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
    this.object3D = obj3d;
  }
  private handleRecipe(): boolean {

    if (this.recipe == undefined) return false;
    if (this.object3D == undefined) return false;
    // Task 1 set visibility
    this.object3D.visible = this.recipe.visible
    // Task 2 set position X
    // Task 3 set position Y
    // Task 4 set position Z
    this.object3D.position.add(
      new THREE.Vector3(
        this.recipe.positionX,
        this.recipe.positionY,
        this.recipe.positionZ
      )
    )
    // Task 5 set width
    // Task 6 set height
    // Task 7 set depth
    this.object3D.scale.add(
      new THREE.Vector3(
        this.recipe.width,
        this.recipe.height,
        this.recipe.depth
      )
    );
    // Task 8 set color
    // TODO Fix coloring Problem
    //this.object3D.material.color.set(this.recipe.color);
    // Task 9 set radius
    // TODO Only for Circles


    return true;
  }
}
class Recipe {
  // All Numbers are deltas and not absolute values.
  visible: boolean = true
  positionX: number | undefined = undefined
  positionY: number | undefined = undefined
  positionZ: number | undefined = undefined
  width: number | undefined = undefined
  height: number | undefined = undefined
  depth: number | undefined = undefined
  color: THREE.Color | undefined = undefined
  radius: number | undefined = undefined

  setVisible(visible: boolean): this {
    this.visible = visible;
    return this;
  }

  setPositionX(positionX: number): this {
    this.positionX = positionX;
    return this;
  }

  setPositionY(positionY: number): this {
    this.positionY = positionY;
    return this;
  }

  setPositionZ(positionZ: number): this {
    this.positionZ = positionZ;
    return this;
  }

  setWidth(width: number): this {
    this.width = width;
    return this;
  }

  setHeight(height: number): this {
    this.height = height;
    return this;
  }

  setDepth(depth: number): this {
    this.depth = depth;
    return this;
  }

  setColor(color: THREE.Color): this {
    this.color = color;
    return this;
  }

  setRadius(radius: number): this {
    this.radius = radius;
    return this;
  }

}

class AppearenceExtension extends Appearence {
  objects3D: Array<Mesh> = new Array();
  // can be used to add further Objects to the appearence level of a `SemanticZoomableObject`
}


export default class SemanticZoomManager {

  zoomableObjects: Array<SemanticZoomableObject> = new Array();


  constructor(){}

  

}