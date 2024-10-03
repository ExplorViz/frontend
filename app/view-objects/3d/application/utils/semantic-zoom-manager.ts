import debugLogger from 'ember-debug-logger';
import { getStoredSettings } from 'explorviz-frontend/utils/settings/local-storage-settings';
import { ApplicationSettings } from 'explorviz-frontend/utils/settings/settings-schemas';
import * as THREE from 'three';
import { Mesh } from 'three';
import Configuration from 'explorviz-frontend/services/configuration';
import UserSettings from 'explorviz-frontend/services/user-settings';
import LocalUser from 'collaboration/services/local-user';
import CommunicationRendering from 'explorviz-frontend/utils/application-rendering/communication-rendering';
import { Font } from 'three/examples/jsm/loaders/FontLoader';

// Mixin Version for SemanticZoomableObject that implement the Interface `SemanticZoomableObject` with basic functionality

type Constructor = new (...args: any[]) => any;

/**
 * This Mixin can extend any kind of THREE Object class and implmenet the basic function of the `SemanticZoomableObject` Interface
 * Is gets the orignal class as a parameter and returns a new extended class that can be used to instanciate
 * const extendedClass = SemanticZoomableObjectBaseMixin(orignalClass)
 * extendedClass(orignal params);
 * @template Base
 * @param base
 * @returns
 */
export function SemanticZoomableObjectBaseMixin<Base extends Constructor>(
  base: Base
) {
  return class extends base implements SemanticZoomableObject {
    overrideVisibility: boolean = false;
    canUseOrignal: boolean = true;
    useOrignalAppearence(yesno: boolean): void {
      this.canUseOrignal = yesno;
    }
    getPoI(): Array<THREE.Vector3> {
      const worldPos = new THREE.Vector3();
      this.getWorldPosition(worldPos);
      return [worldPos];
    }
    // Mixins may not declare private/protected properties
    // however, you can use ES2020 private fields
    // Variables
    visible: boolean = true;

    appearenceLevel: number = 0;

    appearencesMap: Map<number, Appearence | (() => void)> = new Map();

    originalAppearence: Recipe | undefined = undefined;
    callBeforeAppearenceAboveZero: (currentMesh: Mesh | undefined) => void =
      () => {};
    callBeforeAppearenceZero: (currentMesh: Mesh | undefined) => void =
      () => {};

    // Functions
    showAppearence(
      i: number,
      fromBeginning: boolean = true,
      includeOrignal: boolean = true
    ): boolean {
      if (i == 0 && this.originalAppearence != undefined) {
        // return to default look
        this.callBeforeAppearenceZero(this);
        this.restoreOriginalAppearence();
        this.appearencesMap.forEach((v, k) => {
          if (k != 0 && v instanceof Appearence) v.deactivate();
        });
        this.appearenceLevel = i;
        return true;
      } else if (i == 0 && this.originalAppearence == undefined) {
        // Save Orignal
        this.saveOriginalAppearence();
        this.appearenceLevel = i;
        return true;
      }
      // Check if the required level is registered, else abort
      const targetAppearence = this.appearencesMap.get(i);
      if (targetAppearence == undefined) return false;

      // Possible manipulation before any changes
      this.callBeforeAppearenceAboveZero(this);

      // Start with Original Appearence
      if (includeOrignal == true) this.restoreOriginalAppearence();

      // Make sure to return to default Appearence first
      //this.restoreOriginalAppearence();
      if (targetAppearence instanceof Appearence) {
        targetAppearence.activate();
        this.appearencesMap.forEach((v) => {
          if (v != targetAppearence && v instanceof Appearence) v.deactivate();
        });
      } else {
        //console.log(`Calling Function with Level: ${i}`);
        if (fromBeginning == true) {
          this.appearencesMap.forEach((v, idx) => {
            if (idx < i) {
              if (v instanceof Appearence) v.activate();
              else v();
            }
          });
        }
        targetAppearence();
      }

      this.appearenceLevel = i;
      return true;
    }

    getCurrentAppearenceLevel(): number {
      return this.appearenceLevel;
    }
    setAppearence(i: number, ap: Appearence | (() => void)): void {
      if (ap instanceof Appearence) ap.setObject3D(this);
      this.appearencesMap.set(i, ap);
    }
    getNumberOfLevels(): number {
      return Array.from(this.appearencesMap.keys()).length;
    }
    saveOriginalAppearence(): void {
      this.originalAppearence = Recipe.generateFromMesh(this);
    }
    restoreAppearence() {
      this.showAppearence(this.appearenceLevel, false, false);
    }
    restoreOriginalAppearence() {
      const tmpAppearence = new Appearence();
      if (this.originalAppearence == undefined) return;
      tmpAppearence.setRecipe(this.originalAppearence);
      tmpAppearence.setObject3D(this);
      tmpAppearence.activate();
      this.appearenceLevel = 0;
    }
    setCallBeforeAppearenceAboveZero(
      fn: (currentMesh: THREE.Mesh | undefined) => void
    ): void {
      this.callBeforeAppearenceAboveZero = fn;
    }
    setCallBeforeAppearenceZero(
      fn: (currentMesh: THREE.Mesh | undefined) => void
    ): void {
      this.callBeforeAppearenceZero = fn;
    }
  };
}

/**
 * Semantic zoomable object Interface
 */
export interface SemanticZoomableObject {
  // Should be the visibility property of the Mesh
  visible: boolean;
  // Overrides the default behaviour such that if it is not visibile, it does not get triggered
  // Now gets triggered even if not visible (maybe makes it visible).
  overrideVisibility: boolean;
  canUseOrignal: boolean;
  // appearenceLevel number i is == 0 default appearence
  //              > 0 if appearence selected
  //              < 0 hide all and itsself
  //appearenceLevel: number;
  // Callback that triggers before the activation of any Appearence that is not 0
  callBeforeAppearenceAboveZero: (currentMesh: Mesh | undefined) => void;
  // Callback that is triggered before the default Appearence gets restored
  callBeforeAppearenceZero: (currentMesh: Mesh | undefined) => void;
  // Maps a Number 0-inf to one Appearence
  //appearencesMap: Map<number, Appearence>;
  // Displays the Appearence i
  showAppearence(
    i: number,
    fromBeginning: boolean,
    includeOrignal: boolean
  ): boolean;
  // Return the currently active Appearence Level
  getCurrentAppearenceLevel(): number;
  // Regsiters a new Appearence for an index i
  setAppearence(i: number, ap: Appearence | (() => void)): void;
  // Returns the number of available level of Appearences - 1 (-1 because of the default Appearence of 0)
  getNumberOfLevels(): number;
  // saveOriginalAppearence saves the orignal appearence
  saveOriginalAppearence(): void;
  // Callback Setter
  setCallBeforeAppearenceAboveZero(
    fn: (currentMesh: Mesh | undefined) => void
  ): void;
  // Callback Setter
  setCallBeforeAppearenceZero(
    fn: (currentMesh: Mesh | undefined) => void
  ): void;
  // true (default) allows to trigger the orignal appearence save/restore,
  // with false it does not trigger the orignal, therefor not usefull in combination with any Recipe
  useOrignalAppearence(yesno: boolean): void;
  // Clustering Business
  // getPoI stands for getPointsOfInterest and represents a list of
  // interresting points of a 3d Object in the absolute world.
  //
  getPoI(): Array<THREE.Vector3>;
}

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
    // Task 15 Restore Childs
    if (
      this.recipe.modifiedParams[14] == true &&
      this.originObject3D != undefined
    ) {
      while (this.originObject3D.children.length) {
        this.originObject3D.remove(this.originObject3D.children[0]);
      }
      this.recipe.childs.forEach((element) => {
        this.originObject3D.add(element);
      });
    }
    return true;
  }
}
/**
 * Recipe stores inforatiom of what to change on the 3D OBject itsself and can save the orignal appearence
 */
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

  childs: Array<THREE.Object3D> = [];
  valuesAreAbs: boolean = false;

  constructor() {
    this.modifiedParams = new Array(13);
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
      .setScaleHeight(mesh.scale.y)
      .setCurrentChilds(mesh.children);
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
  setCurrentChilds(children: THREE.Object3D<THREE.Object3DEventMap>[]) {
    this.childs = [...children];
    this.modifiedParams[14] = true;
    return this;
  }
}

/**
 * Appearence extension can be used to add further 3D objects to the original object itsself.
 */
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
    this.objects3D.push(
      mesh as Mesh<THREE.BufferGeometry<THREE.NormalBufferAttributes>>
    );
    this.objects3Drescale.push(rescale);
  }
  //public addMeshToScene() {}

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

/**
 * SemanticZoomManager is a Singleton and stores all objects that can change there appearence.
 * It uses a cluster algorithm and a decision algorithm based on the distances to the camera to trigger another appearence for each object.
 * Has a List of all Objects3D types
 */
export default class SemanticZoomManager {
  NUMBER_OF_CLUSTERS = 6;
  isEnabled: boolean = false;
  zoomableObjects: Array<SemanticZoomableObject> = [];
  //clusterMembershipByCluster: Map<number, SemanticZoomableObject> = new Map();
  //clusterMembershipByObject: Map<SemanticZoomableObject, number> = new Map();

  // Cluster Map
  preClustered: Map<THREE.Vector3, Array<SemanticZoomableObject>> | undefined;
  clusterManager: ClusteringAlgInterface | undefined;

  // Singleton
  static #instance: SemanticZoomManager;
  debug = debugLogger('SemanticZoomManager');

  // Zoom Level Map
  // - map: start from
  // -  Appearence 1: 0 - x
  // -  Appearence 2: x - y
  // -  Appearence 3: y - z

  zoomLevelMap: Array<number> = [];
  alreadyCreatedZoomLevelMap: boolean = false;

  // Settings from Service
  configuration: Configuration | undefined;
  userSettings: UserSettings | undefined;
  localUser: LocalUser | undefined;
  appCommRendering: CommunicationRendering | undefined;
  font: Font | undefined;

  // Enable auto open/close of component Meshes
  autoOpenCloseFeature: boolean = false;

  toggleAutoOpenClose(yesno: boolean) {
    this.autoOpenCloseFeature = yesno;
  }

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

  /**
   * Resets semantic zoom manager
   */
  public reset() {
    if (this.preClustered != undefined) {
      this.preClustered.clear();
    }
    this.zoomableObjects.clear();
    this.zoomLevelMap.clear();
    this.alreadyCreatedZoomLevelMap = false;
    // if (this.isEnabled == true) {
    //   this.activate();
    // }
  }

  deactivate() {
    this.isEnabled = false;
    this.forceLevel(0);
  }

  activate() {
    this.cluster(getStoredSettings().clusterBasedOnMembers.value);
    this.isEnabled = true;
  }

  cluster(k: number) {
    // k-Means Clustering
    this.clusterManager = new KMeansClusteringAlg();
    // this.clusterManager.setNumberOfClusters(
    //   Math.round((this.zoomableObjects.length * k) / 100)
    // );

    // Mean Clustering
    void k;
    this.clusterManager = new MeanShiftClusteringAlg();
    (this.clusterManager as MeanShiftClusteringAlg).setBandwidth(0.2);

    // Final Clustering gets triggered
    this.preClustered = this.clusterManager?.clusterMe(this.zoomableObjects);
  }
  /**
   * Validates zoom level map such that the array is in descending order.
   * @param [zoomlevelarray]
   * @returns
   */
  validateZoomLevelMap(zoomlevelarray: Array<number> = this.zoomLevelMap) {
    const result = zoomlevelarray.reduce(
      (prev, now) => {
        if ((prev[0] as number) >= now && (prev[1] as boolean) == true)
          return [now, true];
        return [now, false];
      },
      [zoomlevelarray[0], true]
    );
    return result[1];
    // if (zoomlevelarray.every((a, i) => zoomlevelarray[i] < a)) {
    //   return true;
    // }
    // return false;
  }

  createZoomLevelMap(cam: THREE.Camera) {
    const appSettings: ApplicationSettings = getStoredSettings();
    const d1: number = appSettings.distanceLevel1.value;
    const d2: number = appSettings.distanceLevel2.value;
    const d3: number = appSettings.distanceLevel3.value;
    const d4: number = appSettings.distanceLevel4.value;
    const d5: number = appSettings.distanceLevel5.value;
    const userSettingLevels = [d1, d2, d3, d4, d5];
    this.zoomLevelMap = [];
    for (let index = 0; index < userSettingLevels.length; index++) {
      const distances: Array<number> =
        this.calculateDistancesForCoveragePercentage(
          this.zoomableObjects,
          cam,
          userSettingLevels[index]
        );
      if (distances.length == 0) continue;
      const total = distances.reduce(
        (accumulator, currentValue) => accumulator + currentValue,
        0
      );
      const average = total / distances.length;
      this.zoomLevelMap.push(average);
    }
    if (!this.validateZoomLevelMap())
      this.debug(
        'Warning: Zoom Array is not descending. It may not work as expected'
      );
    this.debug(this.zoomLevelMap);
  }
  private calculateDistancesForCoveragePercentage(
    objects: Array<SemanticZoomableObject>,
    camera: THREE.Camera,
    coveragePercentage: number
  ) {
    const distances: Array<number> = [];
    if (coveragePercentage == 0) return distances;
    // Helper function to calculate the size of the object in world units
    function getObjectSize(object: SemanticZoomableObject) {
      const box = new THREE.Box3().setFromObject(
        object as unknown as THREE.Object3D
      );
      const size = new THREE.Vector3();
      box.getSize(size);
      return size;
    }

    // Function to calculate distance required to cover a specific percentage of the screen
    function calculateDistanceForCoverage(
      object: SemanticZoomableObject,
      camera: THREE.Camera,
      coveragePercentage: number
    ) {
      const objectSize = getObjectSize(object);
      const objectDiagonal = objectSize.length(); // Approximate size for coverage calculation

      // Get camera parameters
      const fov = camera.fov * (Math.PI / 180); // Convert FOV to radians
      const screenCoverageRatio = coveragePercentage / 100; // Convert percentage to a ratio

      // Calculate the necessary distance
      const halfScreenSize = Math.tan(fov / 2) * 1; // Normalized screen distance at 1 unit away
      const targetCoverageSize = 2 * halfScreenSize * screenCoverageRatio;

      const distance = objectDiagonal / targetCoverageSize / Math.tan(fov / 2);

      return distance;
    }

    // Calculate distances for each object
    objects.forEach((object: SemanticZoomableObject) => {
      const distance = calculateDistanceForCoverage(
        object,
        camera,
        coveragePercentage
      );
      distances.push(distance);
    });

    return distances;
  }

  /**
   * Adds an object to the semantic zoom manager
   * @param obj3d SemanticZoomableObject
   */
  public add(obj3d: SemanticZoomableObject) {
    obj3d.saveOriginalAppearence();
    this.zoomableObjects.push(obj3d);
    // Trigger reClustering!
    // fastAddToCluster
  }
  /**
   * Removes an object from the semantic zoom manager
   * @param obj3d SemanticZoomableObject
   */
  remove(obj3d: SemanticZoomableObject) {
    const index: number = this.zoomableObjects.indexOf(obj3d);
    this.zoomableObjects.splice(index, 1);
    this.debug('Removed index: ' + index);
  }
  /**
   * Logs the current state and provides an overview of active appearence levels
   */
  public logCurrentState() {
    const currentState: Map<number, number> = new Map();
    this.zoomableObjects.forEach((element) => {
      const currentView = element.getCurrentAppearenceLevel();
      if (currentState.has(currentView))
        currentState.set(currentView, currentState.get(currentView) + 1);
      else currentState.set(currentView, 1);
    });
    let currentStatesAsString = '';
    for (const key in Array.from(currentState.keys()).sort()) {
      if (key == '_super') continue;

      const v = currentState.get(Number(key));
      //currentState.forEach((v, key) => {
      currentStatesAsString = currentStatesAsString + key + ': ' + v + '\n';
      //});
    }
    this.debug(
      `Current State:\nNumber of Elements in Store: ${this.zoomableObjects.length}\n Mappings:\n${currentStatesAsString}`
    );
  }
  public getClusterCentroids(): THREE.Vector3[] {
    if (this.preClustered == undefined) return new Array<THREE.Vector3>();
    return Array.from(this.preClustered.keys());
  }

  public forceLevel(level: number) {
    /**
     * Forces the `level` of appearence on all registered object
     *
     * @param level - Level of Appearence to show
     *
     */
    this.zoomableObjects.forEach((element) => {
      //element.
      element.showAppearence(level, true, true);
    });
  }

  reClusterAllMembers(): void {}

  triggerLevelDecision(cam: THREE.Camera): void {
    if (this.isEnabled == false) return;
    if (this.alreadyCreatedZoomLevelMap == false) {
      //console.log('Start calculating ZoomLevelMap');
      //this.createZoomLevelMap(cam);
      this.zoomLevelMap.push(1.5);
      this.zoomLevelMap.push(1);
      this.zoomLevelMap.push(0.6);
      this.alreadyCreatedZoomLevelMap = true;
    }
    const distances: Array<number> = [];
    this.zoomableObjects.forEach((element) => {
      //TODO position not in SemanticlyZoomableObject
      // cast ?
      //if (element instanceof ComponentMesh) return;
      //if (element instanceof FoundationMesh) return;
      //if (element instanceof ClazzCommunicationMesh) return;
      if (element.visible == false) return;
      const worldPos = element.getPoI();
      const distance = cam.position.distanceTo(worldPos[0]);
      distances.push(distance);
      if (distance < 1) {
        if (element.getCurrentAppearenceLevel() != 2) {
          //console.log('Changed to 2');
          element.showAppearence(2, true, true);
        }
      } else if (distance < 1.5) {
        if (element.getCurrentAppearenceLevel() != 1) {
          //console.log('Changed to 1');
          element.showAppearence(1, true, true);
        }
      } else {
        if (element.getCurrentAppearenceLevel() != 0) {
          //console.log('Changed to 0');
          element.showAppearence(0, true, true);
        }
      }
    });
    distances.sort((a, b) => a - b);
    //console.log(distances);
    this.logCurrentState();
  }

  /**
   * This function gets called by ThreeJS everytime the camera changes.
   * @param cam THREE.Camera
   * @returns void
   */
  triggerLevelDecision2(cam: THREE.Camera | undefined): void {
    if (cam == undefined) return;
    if (this.isEnabled == false) return;
    if (this.alreadyCreatedZoomLevelMap == false) {
      //console.log('Start calculating ZoomLevelMap');
      this.createZoomLevelMap(cam);
      //this.zoomLevelMap.push(1.5);
      //this.zoomLevelMap.push(1);
      //this.zoomLevelMap.push(0.6);
      this.alreadyCreatedZoomLevelMap = true;
    }
    this.preClustered?.forEach((listOfClusterMemebers, clusterCenter) => {
      // Check if Cluster Center is still visible for the camera
      // Source: https://stackoverflow.com/questions/29758233/three-js-check-if-object-is-still-in-view-of-the-camera
      const frustum = new THREE.Frustum();
      const matrix = new THREE.Matrix4().multiplyMatrices(
        cam.projectionMatrix,
        cam.matrixWorldInverse
      );
      frustum.setFromProjectionMatrix(matrix);
      if (!frustum.containsPoint(clusterCenter)) {
        //console.log('Out of view');
        return;
      }
      // Calculate the distance to Camera, only if cluster is in fov of camera
      const distanceCamToCluster = cam.position.distanceTo(clusterCenter);

      // Decide on Appearence Level
      const closestToTarget: number = this.zoomLevelMap.reduce(
        (closestSoFar, currentValue) => {
          if (
            closestSoFar > currentValue &&
            currentValue > distanceCamToCluster
          ) {
            return currentValue;
          } else {
            return closestSoFar;
          }
        },
        this.zoomLevelMap[0]
      );
      const targetLevel = this.zoomLevelMap.findIndex(
        (v) => v == closestToTarget
      );

      // Loop over all members of that cluster and trigger the target appearence
      listOfClusterMemebers.forEach((semanticZoomableObject) => {
        if (
          semanticZoomableObject.visible == false &&
          semanticZoomableObject.overrideVisibility == false
        )
          return;
        if (semanticZoomableObject.getCurrentAppearenceLevel() != targetLevel)
          semanticZoomableObject.showAppearence(targetLevel, true, true);
      });
    });
    this.logCurrentState();
  }
  preProcessDistanceToLevelMap() {
    // is used to prepcoress a map that converts distance to appearence level
  }
}

/**
 * Clustering interface that needs to be implemented to exchange the clustering algorithm
 */
interface ClusteringAlgInterface {
  setNumberOfClusters(k: number): void;
  // Any Object can be assigned to multiple clusters
  clusterMe(
    datapoints: Array<SemanticZoomableObject>
  ): Map<THREE.Vector3, Array<SemanticZoomableObject>>;
}

/**
 * Implementation of kMeans adapted to the THREE.Vector3 and the Interface `ClusteringAlgInterface`
 * Inspired by https://medium.com/geekculture/implementing-k-means-clustering-from-scratch-in-javascript-13d71fbcb31e
 */
class KMeansClusteringAlg implements ClusteringAlgInterface {
  // kMeans with auto generated k
  // Default k value
  kSize = 10;
  // Max Iterations to find a fixed centroid
  MAX_ITERATIONS = 50;

  debug = debugLogger('K-MeansCluster');

  /**
   * Sets number of clusters to detect
   * @param newK number
   */
  setNumberOfClusters(newK: number) {
    this.kSize = newK;
  }

  /**
   * is called by the SemanticZoomManager and returns for each cluster k the centroid and all the member objects
   * @param datapoints Array<SemanticZoomableObject>
   * @returns Map<THREE.Vector3, Array<SemanticZoomableObject>>
   */
  clusterMe(
    datapoints: Array<SemanticZoomableObject>
  ): Map<THREE.Vector3, Array<SemanticZoomableObject>> {
    const startTime = performance.now();
    const allPois: Array<THREE.Vector3> = [];
    const zoomableObject: Array<SemanticZoomableObject> = [];
    datapoints.forEach((objectWithSemanticZoom) => {
      const pois = objectWithSemanticZoom.getPoI();
      pois.forEach((p) => {
        if (p.x != undefined && p.y != undefined && p.z != undefined) {
          allPois.push(p);
          zoomableObject.push(objectWithSemanticZoom);
        }
      });
    });

    const result = this.kmeans(allPois, zoomableObject, this.kSize);
    const resultCleaned = new Map<
      THREE.Vector3,
      Array<SemanticZoomableObject>
    >();
    result['clusters'].forEach((element) => {
      // Sort by the y-axis, such that objects closer to the ground get triggered first (Pyramid climing style)
      //getPoI();
      element['assignedObjects'].sort(
        (szo1: SemanticZoomableObject, szo2: SemanticZoomableObject) => {
          const poiszo1 = szo1
            .getPoI()
            .sort((a: THREE.Vector3, b: THREE.Vector3) => {
              if (a.y < b.y) return 1;
              else return -1;
            });
          const poiszo2 = szo2
            .getPoI()
            .sort((a: THREE.Vector3, b: THREE.Vector3) => {
              if (a.y < b.y) return 1;
              else return -1;
            });
          if (poiszo1[0].y > poiszo2[0].y) return 1;
          else return -1;
        }
      );
      // Console Log to check if sorting by Y Axis works
      // element['assignedObjects'].forEach((ele: SemanticZoomableObject) => {
      //   console.log(ele.getPoI()[0].y);
      // });
      // console.log('End of Batch');
      resultCleaned.set(element['centroid'], element['assignedObjects']);
    });
    const endTime = performance.now();

    this.debug(`k-means Clustering took ${endTime - startTime} milliseconds`);
    return resultCleaned;
  }

  // fastAddToCluster(newElement:SemanticZoomableObject){
  //   // Adds a new element to the existing clusters
  // }

  // --------------------------------------
  // --------------------------------------

  // https://medium.com/geekculture/implementing-k-means-clustering-from-scratch-in-javascript-13d71fbcb31e

  /**
   *  Create random integers between min and max
   * @param min
   * @param max
   * @returns  random number
   */
  randomBetween(min: number, max: number) {
    return Math.floor(Math.random() * (max - min) + min);
  }

  /**
   * Calcs mean centroid
   * @param dataSet
   * @param start
   * @param end
   * @returns
   */
  calcMeanCentroid(dataSet: Array<THREE.Vector3>, start: number, end: number) {
    const features = 3;
    const n = end - start;
    const mean = [];
    for (let i = 0; i < features; i++) {
      mean.push(0);
    }
    for (let i = start; i < end; i++) {
      for (let j = 0; j < mean.length; j++) {
        // TODO is divided by n wrong here? doesnt look like mean
        mean[j] = mean[j] + dataSet[i].getComponent(j) / n;
      }
    }
    return new THREE.Vector3().fromArray(mean);
  }

  /**
   * Gets random centroids base on the mean of Samples / k Datapoints
   * @param dataset
   * @param k
   * @returns
   */
  getRandomCentroidsNaiveSharding(dataset: Array<THREE.Vector3>, k: number) {
    // implementation of a variation of naive sharding centroid initialization method
    // (not using sums or sorting, just dividing into k shards and calc mean)
    // https://www.kdnuggets.com/2017/03/naive-sharding-centroid-initialization-method.html
    const numSamples = dataset.length;
    // Divide dataset into k shards:
    const step = Math.floor(numSamples / k);
    const centroids = [];
    for (let i = 0; i < k; i++) {
      const start = step * i;
      let end = step * (i + 1);
      if (i + 1 === k) {
        end = numSamples;
      }
      centroids.push(this.calcMeanCentroid(dataset, start, end));
    }
    return centroids;
  }

  /**
   * Gets random centroids used for the init kMeans
   * @param dataset
   * @param k
   * @returns
   */
  getRandomCentroids(dataset: Array<THREE.Vector3>, k: number) {
    // selects k random points as centroids from the dataset
    const numSamples = dataset.length;
    const centroidsIndex = [];
    let index;
    while (centroidsIndex.length < k) {
      index = this.randomBetween(0, numSamples);
      if (centroidsIndex.indexOf(index) === -1) {
        centroidsIndex.push(index);
      }
    }
    const centroids = [];
    for (let i = 0; i < centroidsIndex.length; i++) {
      //const centroid = [...dataset[centroidsIndex[i]]];
      //centroids.push(centroid);
      centroids.push(dataset[centroidsIndex[i]]);
    }
    return centroids;
  }

  /**
   * Compares centroids as a type of THREE.Vector3 where each component is compared
   * @param a
   * @param b
   * @returns
   */
  compareCentroids(a: THREE.Vector3, b: THREE.Vector3) {
    // for (let i = 0; i < a.length; i++) {
    //   if (a[i] !== b[i]) {
    //     return false;
    //   }
    // }
    return a.equals(b);
  }

  shouldStop(
    oldCentroids: Array<THREE.Vector3>,
    centroids: Array<THREE.Vector3>,
    iterations: number
  ) {
    if (iterations > this.MAX_ITERATIONS) {
      return true;
    }
    if (!oldCentroids || !oldCentroids.length) {
      return false;
    }
    let sameCount = true;
    for (let i = 0; i < centroids.length; i++) {
      if (!this.compareCentroids(centroids[i], oldCentroids[i])) {
        sameCount = false;
      }
    }
    return sameCount;
  }

  /**
   * Calculate Squared Euclidean Distance
   * @param a Vector
   * @param b Vecot
   * @returns  the distance as a scalar
   */
  getDistanceSQ(a: THREE.Vector3, b: THREE.Vector3) {
    const diffs = [];
    for (let i = 0; i < 3; i++) {
      diffs.push(a.getComponent(i) - b.getComponent(i));
    }
    return diffs.reduce((r, e) => r + e * e, 0);
    //return a.distanceTo(b)
  }

  //
  /**
   * Returns a label for each piece of data in the dataset and combines it with it correspond object
   * @param dataSet
   * @param assignedToObjects
   * @param centroids
   * @returns
   */
  getLabels(
    dataSet: Array<THREE.Vector3>,
    assignedToObjects: Array<SemanticZoomableObject>,
    centroids: Array<THREE.Vector3>
  ) {
    // prep data structure:
    // const labels = {};
    const labels: Map<number, any> = new Map();
    for (let c = 0; c < centroids.length; c++) {
      // labels[c] = {
      //   points: [],
      //   assignedObjects: [],
      //   centroid: centroids[c],
      // };
      labels.set(c, {
        points: [],
        assignedObjects: [],
        centroid: centroids[c],
      });
    }
    // For each element in the dataset, choose the closest centroid.
    // Make that centroid the element's label.
    for (let i = 0; i < dataSet.length; i++) {
      const a = dataSet[i];
      const aassignedToObjects = assignedToObjects[i];
      let closestCentroid: THREE.Vector3 = new THREE.Vector3();
      let closestCentroidIndex: number = -1;
      let prevDistance: number = -1;
      for (let j = 0; j < centroids.length; j++) {
        const centroid = centroids[j];
        if (j === 0) {
          closestCentroid = centroid;
          closestCentroidIndex = j;
          prevDistance = this.getDistanceSQ(a, closestCentroid);
        } else {
          // get distance:
          const distance = this.getDistanceSQ(a, centroid);
          if (distance < prevDistance) {
            prevDistance = distance;
            closestCentroid = centroid;
            closestCentroidIndex = j;
          }
        }
      }
      // add point to centroid labels:
      labels.get(closestCentroidIndex)['points'].push(a);
      labels
        .get(closestCentroidIndex)
        ['assignedObjects'].push(aassignedToObjects);
    }
    return labels;
  }

  /**
   * Calculates the mean for a list of THREE.Vector3 Objects
   * @param pointList
   * @returns
   */
  getPointsMean(pointList: Array<THREE.Vector3>) {
    const totalPoints = pointList.length;
    const means = [];
    for (let j = 0; j < 3; j++) {
      means.push(0);
    }
    for (let i = 0; i < pointList.length; i++) {
      const point = pointList[i];
      for (let j = 0; j < 3; j++) {
        const val = point.getComponent(j);
        means[j] = means[j] + val / totalPoints;
      }
    }
    return new THREE.Vector3().fromArray(means);
  }

  recalculateCentroids(
    dataSet: Array<THREE.Vector3>,
    labels: Map<number, any>
  ) {
    // Each centroid is the geometric mean of the points that
    // have that centroid's label. Important: If a centroid is empty (no points have
    // that centroid's label) you should randomly re-initialize it.
    let newCentroid;
    const newCentroidList = [];
    for (const k in labels.entries()) {
      const centroidGroup = k[0];
      if (centroidGroup.points.length > 0) {
        // find mean:
        newCentroid = this.getPointsMean(centroidGroup.points);
      } else {
        // get new random centroid
        newCentroid = this.getRandomCentroids(dataSet, 1)[0];
      }
      newCentroidList.push(newCentroid);
    }
    return newCentroidList;
  }

  /**
   * Triggers the kMeans clustering with a provided dataset of vectors and its corresponding objects.
   * k is used as the number of clusters wanted
   * @param dataset
   * @param assignedTo
   * @param k
   * @param [useNaiveSharding]
   * @returns
   */
  kmeans(
    dataset: Array<THREE.Vector3>,
    assignedTo: Array<SemanticZoomableObject>,
    k: number,
    useNaiveSharding = true
  ) {
    if (dataset.length > 0 && dataset.length > k) {
      // Initialize book keeping variables
      let iterations = 0;
      let oldCentroids: Array<THREE.Vector3> = [],
        labels,
        centroids: Array<THREE.Vector3>;

      // Initialize centroids randomly
      if (useNaiveSharding) {
        centroids = this.getRandomCentroidsNaiveSharding(dataset, k);
      } else {
        centroids = this.getRandomCentroids(dataset, k);
      }

      // Run the main k-means algorithm
      while (!this.shouldStop(oldCentroids, centroids, iterations)) {
        // Save old centroids for convergence test.
        oldCentroids = [...centroids];
        iterations++;

        // Assign labels to each datapoint based on centroids
        labels = this.getLabels(dataset, assignedTo, centroids);
        centroids = this.recalculateCentroids(dataset, labels);
      }

      const clusters = [];
      for (let i = 0; i < k; i++) {
        clusters.push(labels?.get(i));
      }
      const results = {
        clusters: clusters,
        centroids: centroids,
        iterations: iterations,
        converged: iterations <= this.MAX_ITERATIONS,
      };
      return results;
    } else {
      throw new Error('Invalid dataset');
    }
  }

  // --------------------------------------
  // --------------------------------------
}

class MeanShiftClusteringAlg implements ClusteringAlgInterface {
  debug = debugLogger('MeanShiftCluster');
  bandwidth: number = 1;
  setBandwidth(b: number) {
    this.bandwidth = b;
  }
  setNumberOfClusters(k: number): void {
    void k;
    throw new Error('Method not implemented.');
  }
  clusterMe(
    datapoints: Array<SemanticZoomableObject>
  ): Map<THREE.Vector3, Array<SemanticZoomableObject>> {
    const startTime = performance.now();

    const allPois: Array<THREE.Vector3> = [];
    const zoomableObject: Array<SemanticZoomableObject> = [];
    datapoints.forEach((objectWithSemanticZoom) => {
      const pois = objectWithSemanticZoom.getPoI();
      pois.forEach((p) => {
        if (p.x != undefined && p.y != undefined && p.z != undefined) {
          allPois.push(p);
          zoomableObject.push(objectWithSemanticZoom);
        }
      });
    });
    const result = this.meanShift(allPois, this.bandwidth);
    const resultCleaned = new Map<
      THREE.Vector3,
      Array<SemanticZoomableObject>
    >();
    result.forEach((finalPos, idx) => {
      // Search for Vector in Centroid Database
      const members = Array.from(resultCleaned.keys());
      let isAlreadyaMember: boolean = false;
      members.forEach((element: THREE.Vector3) => {
        if (element == finalPos) isAlreadyaMember = true;
      });
      // Assign Object to Centroids
      if (isAlreadyaMember) {
        // Is a Key in the Map
        const currentArray = resultCleaned.get(finalPos);
        currentArray?.push(zoomableObject[idx]);
      } else {
        // New Centroid found
        resultCleaned.set(
          finalPos,
          new Array<SemanticZoomableObject>(zoomableObject[idx])
        );
      }
    });

    const endTime = performance.now();

    this.debug(
      `Mean Shift Clustering took ${endTime - startTime} milliseconds`
    );
    return resultCleaned;
  }

  euclideanDistance(point1: THREE.Vector3, point2: THREE.Vector3): number {
    return point1.distanceTo(point2); // THREE.Vector3 has a built-in distanceTo method
  }

  calculateMean(points: THREE.Vector3[]): THREE.Vector3 {
    const mean = new THREE.Vector3(0, 0, 0); // Initialize mean vector to zero

    // Sum each coordinate
    points.forEach((point) => {
      mean.add(point);
    });

    // Divide by number of points to get the mean
    mean.divideScalar(points.length);
    return mean;
  }

  meanShift(
    data: THREE.Vector3[],
    bandwidth: number,
    maxIterations = 100,
    threshold = 1e-3
  ): THREE.Vector3[] {
    // Clone the input array so the original points are not modified
    const shiftedPoints = data.map((point) => point.clone());

    let hasConverged = false;
    let iterations = 0;

    while (!hasConverged && iterations < maxIterations) {
      hasConverged = true;

      // Iterate over each point and shift it towards the mean of nearby points
      shiftedPoints.forEach((point, index) => {
        // Find neighbors within the bandwidth
        const neighbors = shiftedPoints.filter(
          (neighbor) => this.euclideanDistance(point, neighbor) < bandwidth
        );

        // Calculate the mean of the neighbors
        const mean = this.calculateMean(neighbors);

        // Check if the point has shifted significantly
        if (this.euclideanDistance(point, mean) > threshold) {
          shiftedPoints[index] = mean; // Update the point's position
          hasConverged = false; // Continue until all points have converged
        }
      });
      iterations++;
    }
    return shiftedPoints;
  }
}
