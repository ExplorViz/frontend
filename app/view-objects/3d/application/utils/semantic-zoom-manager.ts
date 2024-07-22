import debugLogger from 'ember-debug-logger';
import * as THREE from 'three';
import { Mesh } from 'three';
import { Font } from 'three/examples/jsm/loaders/FontLoader';

export interface SemanticZoomableObject {
  // Should be the visibility property of the Mesh
  visible: boolean;
  // appearenceLevel number i is == 0 default appearence
  //              > 0 if appearence selected
  //              < 0 hide all and itsself
  appearenceLevel: number;
  // Callback that triggers before the activation of any Appearence that is not 0
  callBeforeAppearenceAboveZero: (currentMesh: Mesh | undefined) => void;
  // Callback that is triggered before the default Appearence gets restored
  callBeforeAppearenceZero: (currentMesh: Mesh | undefined) => void;
  // Maps a Number 0-inf to one Appearence
  appearencesMap: Map<number, Appearence>;
  // Displays the Appearence i
  showAppearence(i: number): boolean;
  // Return the currently active Appearence Level
  getCurrentAppearenceLevel(): number;
  // Regsiters a new Appearence for an index i
  setAppearence(i: number, ap: Appearence): void;
  // Returns the number of available level of Appearences - 1 (-1 because of the default Appearence of 0)
  getNumberOfLevels(): number;
  // Callback Setter
  setCallBeforeAppearenceAboveZero(
    fn: (currentMesh: Mesh | undefined) => void
  ): void;
  // Callback Setter
  setCallBeforeAppearenceZero(
    fn: (currentMesh: Mesh | undefined) => void
  ): void;
}

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
    if (
      this.recipe.valuesAreAbs == false &&
      this.originObject3D.geometry instanceof THREE.BoxGeometry
    ) {
      const new_geometry = new THREE.BoxGeometry(
        this.recipe.modifiedParams[4] == true
          ? this.recipe.width + this.originObject3D.geometry.parameters.width
          : this.originObject3D.geometry.parameters.width,
        this.recipe.modifiedParams[5] == true
          ? this.recipe.height + this.originObject3D.geometry.parameters.height
          : this.originObject3D.geometry.parameters.height,
        this.recipe.modifiedParams[6] == true
          ? this.recipe.depth + this.originObject3D.geometry.parameters.depth
          : this.originObject3D.geometry.parameters.depth
      );
      this.originObject3D.geometry.dispose();
      this.originObject3D.geometry = new_geometry;
    } else if (this.originObject3D.geometry instanceof THREE.BoxGeometry) {
      const new_geometry = new THREE.BoxGeometry(
        this.recipe.modifiedParams[4] == true
          ? this.recipe.width
          : this.originObject3D.geometry.parameters.width,
        this.recipe.modifiedParams[5] == true
          ? this.recipe.height
          : this.originObject3D.geometry.parameters.height,
        this.recipe.modifiedParams[6] == true
          ? this.recipe.depth
          : this.originObject3D.geometry.parameters.depth
      );
      this.originObject3D.geometry.dispose();
      this.originObject3D.geometry = new_geometry;

      // this.originObject3D.scale.set(
      //   this.recipe.modifiedParams[4] == true
      //     ? this.recipe.width
      //     : this.originObject3D.scale.x,
      //   this.recipe.modifiedParams[5] == true
      //     ? this.recipe.height
      //     : this.originObject3D.scale.y,
      //   this.recipe.modifiedParams[6] == true
      //     ? this.recipe.depth
      //     : this.originObject3D.scale.z
      // );
    }
    // Task 8 set width
    // Task 9 set height
    // Task 10 set depth
    if (this.recipe.valuesAreAbs == false) {
      this.originObject3D.scale.add(
        new THREE.Vector3(
          this.recipe.scalewidth,
          this.recipe.scaleheight,
          this.recipe.scaledepth
        )
      );
    } else {
      this.originObject3D.scale.set(
        this.recipe.modifiedParams[7] == true
          ? this.recipe.scalewidth
          : this.originObject3D.scale.x,
        this.recipe.modifiedParams[8] == true
          ? this.recipe.scaleheight
          : this.originObject3D.scale.y,
        this.recipe.modifiedParams[9] == true
          ? this.recipe.scaledepth
          : this.originObject3D.scale.z
      );
    }

    // Task 11 set color
    // TODO Fix coloring Problem
    if (this.recipe.modifiedParams[10] == true) {
      throw new Error('Color changing is not yet implemented');
    }
    //this.object3D.material.color.set(this.recipe.color);
    //console.log('We colored!!');

    // Task 12 set radius
    // TODO Only for Circles

    //Task 13
    if (
      this.recipe.modifiedParams[12] == true &&
      this.recipe.geometry != undefined
    ) {
      this.originObject3D.geometry = this.recipe.geometry;
    }
    //Task 14
    if (
      this.recipe.modifiedParams[13] == true &&
      this.recipe.material != undefined
    ) {
      this.originObject3D.material = this.recipe.material;
    }
    return true;
  }
}
export class Recipe {
  //TODO alter the Recipe such that each value can be absolute or relativ

  // All Numbers are deltas and not absolute values.
  modifiedParams: Array<boolean> = [];
  visible: boolean = true;
  positionX: number = 0;
  positionY: number = 0;
  positionZ: number = 0;
  width: number = 0;
  height: number = 0;
  depth: number = 0;
  scalewidth: number = 0;
  scaleheight: number = 0;
  scaledepth: number = 0;

  geometry: THREE.BufferGeometry | undefined = undefined;
  material: THREE.Material | THREE.Material[] | undefined = undefined;

  //colorchange: boolean = false;
  color: THREE.Color;
  radius: number = 0;
  valuesAreAbs: boolean = false;

  constructor() {
    this.modifiedParams = new Array(12);
    this.modifiedParams.fill(false);
    this.color = new THREE.Color(0xffffff); // Use hexadecimal value
  }

  public static generateFromMesh(mesh: Mesh): Recipe {
    const position = mesh.position;
    //if (mesh instanceof BoxMesh) position = mesh.layout.position;
    const freshRecipe = new Recipe()
      .setAbsValues(true)
      .setVisible(mesh.visible)
      .setPositionX(position.x)
      .setPositionY(position.y)
      .setPositionZ(position.z)
      .setGeometry(mesh.geometry)
      .setMaterial(mesh.material)
      .setScaleWidth(mesh.scale.x)
      .setScaleDepth(mesh.scale.z)
      .setScaleHeight(mesh.scale.y);
    if (mesh instanceof THREE.BoxGeometry)
      freshRecipe
        .setWidth(mesh.geometry.parameters.width)
        .setHeight(mesh.geometry.parameters.height)
        .setDepth(mesh.geometry.parameters.depth);
    return freshRecipe;
    //.setColor(mesh.material.color)
    //.setRadius(0)
  }

  //TODO function implementieren
  changeAxisSizeAccordingToCurrentPosition(
    currentMesh: Mesh,
    newValue: number,
    axis: string
  ) {
    // TODO only handles BoxGeometries! Handle other aswell
    // TODO add function to increase size on the opposite site
    if (!(currentMesh.geometry instanceof THREE.BoxGeometry)) return;
    let currentValue = 0;
    let currentPosition = 0;
    if (axis == 'y') {
      currentValue = currentMesh.geometry.parameters.height;
      currentPosition = currentMesh.position.y;
      this.setPositionY(currentPosition - currentValue / 2 + newValue / 2);
      this.setHeight(newValue);
      this.setScaleHeight(1);
    } else if (axis == 'x') {
      currentValue = currentMesh.geometry.parameters.width;
      currentPosition = currentMesh.position.x;
      this.setPositionX(currentPosition - currentValue / 2 + newValue / 2);
      this.setWidth(newValue);
      this.setScaleWidth(1);
    } else if (axis == 'z') {
      currentValue = currentMesh.geometry.parameters.depth;
      currentPosition = currentMesh.position.z;
      this.setPositionZ(currentPosition - currentValue / 2 + newValue / 2);
      this.setDepth(newValue);
      this.setScaleDepth(1);
    }
    this.setAbsValues(true);
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
    this.scaledepth = depth;
    this.modifiedParams[6] = true;
    return this;
  }

  setScaleWidth(width: number): this {
    this.scalewidth = width;
    this.modifiedParams[7] = true;
    return this;
  }

  setScaleHeight(height: number): this {
    this.scaleheight = height;
    this.modifiedParams[8] = true;
    return this;
  }

  setScaleDepth(depth: number): this {
    this.scaledepth = depth;
    this.modifiedParams[9] = true;
    return this;
  }

  setColor(color: THREE.Color): this {
    this.color = color;
    this.modifiedParams[10] = true;
    return this;
  }

  setRadius(radius: number): this {
    this.radius = radius;
    this.modifiedParams[11] = true;
    return this;
  }

  setGeometry(geo: THREE.BufferGeometry): this {
    this.geometry = geo;
    this.modifiedParams[12] = true;
    return this;
  }
  setMaterial(tx: THREE.Material): this {
    this.material = tx;
    this.modifiedParams[13] = true;
    return this;
  }
}

export class AppearenceExtension extends Appearence {
  // can be used to add further Objects to the appearence level of a `SemanticZoomableObject`
  objects3D: Array<Mesh> = [];
  //TODO improve rendinger Options
  objects3Drescale: Array<boolean> = [];

  public activate(): boolean {
    const parentResults = super.activate();
    this.objects3D.forEach((foreignOjects, idx) => {
      if (this.objects3Drescale[idx] == true)
        this.counterParentScaling(foreignOjects);
      return this.originObject3D?.add(foreignOjects);
    });
    return parentResults || this.objects3D.length > 0 ? true : false;
  }
  public deactivate(): boolean {
    this.objects3D.forEach((foreignOjects) => {
      this.originObject3D?.remove(foreignOjects);
    });
    return super.deactivate();
  }

  public addMesh(
    mesh: SemanticZoomableObject | Mesh,
    rescale: boolean = false
  ) {
    this.objects3D.push(mesh);
    this.objects3Drescale.push(rescale);
  }
  public addMeshToScene() {}

  private counterParentScaling(child: Mesh) {
    const originScale = this.originObject3D?.scale;
    if (originScale == undefined) {
      child.scale.set(1, 1, 1);
      return;
    }
    const childScale = new THREE.Vector3(1, 1, 1);
    childScale.divide(originScale);
    child.scale.set(childScale.x, childScale.y, childScale.z);
    return;
  }
}

export default class SemanticZoomManager {
  deactivate() {
    this.isEnabled = false;
    this.forceLevel(0);
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

  // TODO Does it make sense to store the Font here? Dont like it!
  private _configFont: Font | undefined;

  public get configFont(): Font | undefined {
    return this._configFont;
  }
  public set configFont(value: Font | undefined) {
    this._configFont = value;
  }

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
      if (element.visible == false) return;
      const worldPos = new THREE.Vector3();
      element.getWorldPosition(worldPos);
      const distance = cam.position.distanceTo(worldPos);
      distances.push(distance);
      if (distance < 1) {
        if (element.getCurrentAppearenceLevel() != 2) {
          //console.log('Changed to 2');
          element.showAppearence(2);
        }
      } else if (distance < 1.5) {
        if (element.getCurrentAppearenceLevel() != 1) {
          //console.log('Changed to 1');
          element.showAppearence(1);
        }
      } else {
        if (element.getCurrentAppearenceLevel() != 0) {
          //console.log('Changed to 0');
          element.showAppearence(0);
        }
      }
    });
    distances.sort((a, b) => a - b);
    //console.log(distances);
    this.logCurrentState();
  }
}
