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
  originObject3D: Mesh | undefined;

  constructor();
  constructor(rec?: Recipe) {
    this.recipe = rec;
  }
  public activate(): boolean {
    this.callbackFunction(this.originObject3D);
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
    this.originObject3D = obj3d;
  }
  private handleRecipe(): boolean {
    if (this.recipe == undefined) return false;
    if (this.originObject3D == undefined) return false;
    // Select between Vector add and override

    // Task 1 set visibility
    if (this.recipe.modifiedParams[0] == true)
      this.originObject3D.visible = this.recipe.visible;

    // Task 2 set position X
    // Task 3 set position Y
    // Task 4 set position Z
    if (this.recipe.valuesAreAbs == false) {
      this.originObject3D.position.add(
        new THREE.Vector3(
          this.recipe.positionX,
          this.recipe.positionY,
          this.recipe.positionZ
        )
      );
    } else {
      this.originObject3D.position.set(
        this.recipe.modifiedParams[1] == true
          ? this.recipe.positionX
          : this.originObject3D.position.x,
        this.recipe.modifiedParams[2] == true
          ? this.recipe.positionY
          : this.originObject3D.position.y,
        this.recipe.modifiedParams[3] == true
          ? this.recipe.positionZ
          : this.originObject3D.position.z
      );
    }

    // Task 5 set width
    // Task 6 set height
    // Task 7 set depth
    if (this.recipe.valuesAreAbs == false) {
      this.originObject3D.scale.add(
        new THREE.Vector3(
          this.recipe.width,
          this.recipe.height,
          this.recipe.depth
        )
      );
    } else {
      this.originObject3D.scale.set(
        this.recipe.modifiedParams[4] == true
          ? this.recipe.width
          : this.originObject3D.scale.x,
        this.recipe.modifiedParams[5] == true
          ? this.recipe.height
          : this.originObject3D.scale.y,
        this.recipe.modifiedParams[6] == true
          ? this.recipe.depth
          : this.originObject3D.scale.z
      );
    }

    // Task 8 set color
    // TODO Fix coloring Problem
    if (this.recipe.modifiedParams[7] == true) {
      throw new Error('Color changing is not yet implemented');
    }
    //this.object3D.material.color.set(this.recipe.color);
    //console.log('We colored!!');

    // Task 9 set radius
    // TODO Only for Circles

    return true;
  }
}
export class Recipe {
  // All Numbers are deltas and not absolute values.
  modifiedParams: Array<boolean> = [];
  visible: boolean = true;
  positionX: number = 0;
  positionY: number = 0;
  positionZ: number = 0;
  width: number = 0;
  height: number = 0;
  depth: number = 0;
  //colorchange: boolean = false;
  color: THREE.Color;
  radius: number = 0;
  valuesAreAbs: boolean = false;

  constructor() {
    this.modifiedParams = new Array(9);
    this.modifiedParams.fill(false);
    this.color = new THREE.Color(0xffffff); // Use hexadecimal value
  }

  public static generateFromMesh(mesh: Mesh): Recipe {
    const position = mesh.position;
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

  //TODO function implementieren
  changeHeightAccordingToCurrentPosition(currentMesh: Mesh, newHeight: number) {
    // use current y pos + height difference
    //const currentHeight = currentMesh.scale.y;
    const currentYPosition = currentMesh.position.y;
    this.setPositionY(currentYPosition + newHeight / 2);
    this.setHeight(newHeight);
  }

  setAbsValues(v: boolean) {
    this.valuesAreAbs = v;
    return this;
  }
  setVisible(visible: boolean): this {
    this.visible = visible;
    this.modifiedParams[0] = true;
    return this;
  }

  setPositionX(positionX: number): this {
    this.positionX = positionX;
    this.modifiedParams[1] = true;
    return this;
  }

  setPositionY(positionY: number): this {
    this.positionY = positionY;
    this.modifiedParams[2] = true;
    return this;
  }

  setPositionZ(positionZ: number): this {
    this.positionZ = positionZ;
    this.modifiedParams[3] = true;
    return this;
  }

  setWidth(width: number): this {
    this.width = width;
    this.modifiedParams[4] = true;
    return this;
  }

  setHeight(height: number): this {
    this.height = height;
    this.modifiedParams[5] = true;
    return this;
  }

  setDepth(depth: number): this {
    this.depth = depth;
    this.modifiedParams[6] = true;
    return this;
  }

  setColor(color: THREE.Color): this {
    this.color = color;
    this.modifiedParams[7] = true;
    return this;
  }

  setRadius(radius: number): this {
    this.radius = radius;
    this.modifiedParams[8] = true;
    return this;
  }
}

export class AppearenceExtension extends Appearence {
  // can be used to add further Objects to the appearence level of a `SemanticZoomableObject`
  objects3D: Array<Mesh> = [];

  public activate(): boolean {
    this.objects3D.forEach((foreignOjects) => {
      return this.originObject3D?.add(foreignOjects);
    });
    return super.activate() && true;
  }
  public deactivate(): boolean {
    this.objects3D.forEach((foreignOjects) => {
      this.originObject3D?.remove(foreignOjects);
    });
    return super.deactivate();
  }

  public addMesh(mesh: SemanticZoomableObject | Mesh) {
    this.objects3D.push(mesh);
  }
}

export default class SemanticZoomManager {
  deactivate() {
    this.isEnabled = false;
  }
  activate() {
    this.isEnabled = true;
  }
  /**
   * Is a Singleton
   * Has a List of all Objects3D types
   */
  NUMBER_OF_CLUSTERS = 6;
  isEnabled: boolean = false;
  zoomableObjects: Array<SemanticZoomableObject> = [];
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
    const currentState: Map<number, number> = new Map();
    this.zoomableObjects.forEach((element) => {
      const currentView = element.getCurrentAppearenceLevel();
      if (currentState.has(currentView))
        currentState.set(currentView, currentState.get(currentView) + 1);
      else currentState.set(currentView, 1);
    });
    let currentStatesAsString = '';
    currentState.forEach((v, key) => {
      currentStatesAsString = currentStatesAsString + key + ': ' + v + '\n';
    });
    this.debug(
      `Current State:\nNumber of Elements in Store: ${this.zoomableObjects.length}\n Mappings:\n${currentStatesAsString}`
    );
  }

  public forceLevel(level: number) {
    this.zoomableObjects.forEach((element) => {
      //element.
      element.showAppearence(level);
    });
  }

  reClusterAllMembers(): void {}

  triggerLevelDecision(cam: THREE.Camera): void {
    if (this.isEnabled == false) return;
    const distances: Array<number> = [];
    this.zoomableObjects.forEach((element) => {
      //TODO position not in SemanticlyZoomableObject
      // cast ?
      //if (element instanceof ComponentMesh) return;
      //if (element instanceof FoundationMesh) return;
      //if (element instanceof ClazzCommunicationMesh) return;
      const worldPos = new THREE.Vector3();
      element.getWorldPosition(worldPos);
      const distance = cam.position.distanceTo(worldPos);
      distances.push(distance);

      if (distance < 1) {
        if (element.getCurrentAppearenceLevel() != 1) {
          //console.log('Changed to 1');
          element.showAppearence(1);
          //element.highlight();
        }
      } else {
        if (element.getCurrentAppearenceLevel() != 0) {
          //console.log('Changed to 0');
          element.showAppearence(0);
          //element.unhighlight();
        }
      }
    });
    distances.sort((a, b) => a - b);
    //console.log(distances);
    this.logCurrentState();
  }
}
