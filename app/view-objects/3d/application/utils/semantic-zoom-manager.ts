import debugLogger from 'ember-debug-logger';
import * as THREE from 'three';
import { Mesh } from 'three';

export interface SemanticZoomableObject {
  appearenceLevel: number;
  // number i is == 0 default appearence
  //              > 0 if appearence selected
  //              < 0 hide all and itsself
  appearencesMap: Map<number, Appearence>;
  showAppearence(i: number): boolean;
  getCurrentAppearenceLevel(): number;
  setAppearence(i: number, ap: Appearence): void;
  getNumberOfLevels(): number;
}

export class Appearence {
  // is like a recipe to tell the original/base 3d Object how to change

  // is the Appearence currently active.
  activated: boolean = false;
  // triggered when `activate` gets called
  callbackFunction: (currentMesh: Mesh | undefined) => void = () => {};
  recipe: Recipe | undefined;
  object3D: Mesh | undefined;

  constructor();
  constructor(rec?: Recipe) {
    this.recipe = rec;
  }
  public activate(): boolean {
    this.callbackFunction(this.object3D);
    const success = this.handleRecipe();
    this.activated = true;
    return success;
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
    // Select between Vector add and override

    // Task 1 set visibility
    this.object3D.visible = this.recipe.visible;
    // Task 2 set position X
    // Task 3 set position Y
    // Task 4 set position Z

    if (this.recipe.valuesAreAbs == false) {
      this.object3D.position.add(
        new THREE.Vector3(
          this.recipe.positionX,
          this.recipe.positionY,
          this.recipe.positionZ
        )
      );
    } else {
      this.object3D.position.set(
        this.recipe.positionX,
        this.recipe.positionY,
        this.recipe.positionZ
      );
    }
    // Task 5 set width
    // Task 6 set height
    // Task 7 set depth
    if (this.recipe.valuesAreAbs == false) {
      this.object3D.scale.add(
        new THREE.Vector3(
          this.recipe.width,
          this.recipe.height,
          this.recipe.depth
        )
      );
    } else {
      this.object3D.scale.set(
        this.recipe.width,
        this.recipe.height,
        this.recipe.depth
      );
    }
    // Task 8 set color
    // TODO Fix coloring Problem
    if (this.recipe.colorchange == true)
      //this.object3D.material.color.set(this.recipe.color);
      console.log('We colored!!');
    // Task 9 set radius
    // TODO Only for Circles

    return true;
  }
}
export class Recipe {
  // All Numbers are deltas and not absolute values.
  visible: boolean = true;
  positionX: number = 0;
  positionY: number = 0;
  positionZ: number = 0;
  width: number = 0;
  height: number = 0;
  depth: number = 0;
  colorchange: boolean = false;
  color: THREE.Color;
  radius: number = 0;
  valuesAreAbs: boolean = false;

  constructor() {
    this.color = new THREE.Color(0xffffff); // Use hexadecimal value
  }

  public static generateFromMesh(mesh: Mesh): Recipe {
    let position = mesh.position;
    debugger;
    //if (mesh instanceof BoxMesh) position = mesh.layout.position;
    return new Recipe()
      .setAbsValues(true)
      .setVisible(mesh.visible)
      .setPositionX(position.x)
      .setPositionY(position.y)
      .setPositionZ(position.z)
      .setWidth(mesh.scale.x)
      .setHeight(mesh.scale.y)
      .setDepth(mesh.scale.z);
    //.setColor(mesh.material.color)
    //.setRadius(0)
  }

  setAbsValues(v: boolean) {
    this.valuesAreAbs = v;
    return this;
  }
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
    this.colorchange = true;
    this.color = color;
    return this;
  }

  setRadius(radius: number): this {
    this.radius = radius;
    return this;
  }
}

export class AppearenceExtension extends Appearence {
  objects3D: Array<Mesh> = new Array();
  // can be used to add further Objects to the appearence level of a `SemanticZoomableObject`
}

export default class SemanticZoomManager {
  /**
   * Is a Singleton
   * Has a List of all Objects3D types
   */
  zoomableObjects: Array<SemanticZoomableObject> = new Array();
  clusterMembershipByCluster: Map<number, SemanticZoomableObject> = new Map();
  clusterMembershipByObject: Map<SemanticZoomableObject, number> = new Map();

  static #instance: SemanticZoomManager;

  debug = debugLogger('SemanticZoomManager');

  /**
   *
   */
  constructor() {}

  public static get instance(): SemanticZoomManager {
    if (!SemanticZoomManager.#instance) {
      SemanticZoomManager.#instance = new SemanticZoomManager();
    }

    return SemanticZoomManager.#instance;
  }

  public add(obj3d: SemanticZoomableObject) {
    this.zoomableObjects.push(obj3d);
  }
  public logCurrentState() {
    this.debug(
      `Current State:\nNumber of Elements in Store: ${this.zoomableObjects.length}`
    );
  }

  public forceLevel(level: number) {
    this.zoomableObjects.forEach((element) => {
      //element.
      element.showAppearence(level);
    });
  }
}
