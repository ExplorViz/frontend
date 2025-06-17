import * as THREE from 'three';
import { Mesh } from 'three';
import type CommunicationRendering from 'explorviz-frontend/src/utils/application-rendering/communication-rendering';
import { Font } from 'three-stdlib'; //'three/examples/jsm/loaders/FontLoader';
import { VisualizationSettings } from 'explorviz-frontend/src/utils/settings/settings-schemas';
import { getStoredSettings } from 'explorviz-frontend/src/utils/settings/local-storage-settings';
import { useApplicationRendererStore } from 'explorviz-frontend/src/stores/application-renderer';
import { SemanticZoomableObject } from './semantic-zoomable-object';
import { Appearence } from './semantic-zoom-appearance';
import { Recipe } from './semantic-zoom-recipe';
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
    prio: number = 0;
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

    appearencesMap: Array<Appearence | (() => void)> = [];

    originalAppearence: Recipe | undefined = undefined;
    callBeforeAppearenceAboveZero: (currentMesh: Mesh | undefined) => void =
      () => {};
    callBeforeAppearenceZero: (currentMesh: Mesh | undefined) => void =
      () => {};

    // Functions
    showAppearence(
      i: number,
      fromBeginningOrig: boolean = true,
      includeOrignalOrig: boolean = true
    ): boolean {
      let targetApNumber: number = i;
      let fromBeginning: boolean = fromBeginningOrig;
      let includeOrignal: boolean = includeOrignalOrig;

      if (!this.visible && !this.overrideVisibility) {
        return true;
      }

      if (this.getCurrentAppearenceLevel() == targetApNumber) {
        return false;
      } else if (this.getCurrentAppearenceLevel() < targetApNumber) {
        fromBeginning = false;
        includeOrignal = false;
      } else if (this.getCurrentAppearenceLevel() > targetApNumber) {
        fromBeginning = true;
        includeOrignal = true;
      }
      if (targetApNumber == 0 && this.originalAppearence != undefined) {
        // return to default look
        this.callBeforeAppearenceZero(this);
        this.restoreOriginalAppearence();
        this.appearencesMap.forEach((v, k) => {
          if (k != 0 && v instanceof Appearence) v.deactivate();
        });
        this.appearenceLevel = targetApNumber;
        return true;
      } else if (targetApNumber == 0 && this.originalAppearence == undefined) {
        // Save Orignal
        this.saveOriginalAppearence();
        this.appearenceLevel = targetApNumber;
        return true;
      }
      const highestAvailableTargetAppearence = Math.max(
        this.getNumberOfLevels() - 1,
        0
      );
      if (highestAvailableTargetAppearence < targetApNumber)
        targetApNumber = highestAvailableTargetAppearence;
      // Check if the required level is registered, else abort
      if (targetApNumber == 0) {
        //Already handeled 0, since it is the original appearence
        return true;
      }
      const targetAppearence = this.appearencesMap[targetApNumber];
      if (targetAppearence == undefined) return false;
      // throw new Error(
      //   'Requestet Detail Level is not found: ' +
      //     targetApNumber +
      //     ' of ' +
      //     Math.max(this.getNumberOfLevels() - 1, 0)
      // );

      // Possible manipulation before any changes
      this.callBeforeAppearenceAboveZero(this);

      // Start with Original Appearence
      if (includeOrignal) this.restoreOriginalAppearence();

      // Make sure to return to default Appearence first
      //this.restoreOriginalAppearence();
      if (targetAppearence instanceof Appearence) {
        targetAppearence.activate();
        this.appearencesMap.forEach((v) => {
          if (v != targetAppearence && v instanceof Appearence) v.deactivate();
        });
      } else {
        //console.log(`Calling Function with Level: ${i}`);
        if (fromBeginning || this.appearenceLevel > targetApNumber) {
          this.appearencesMap.forEach((v, idx) => {
            if (idx < targetApNumber) {
              if (v instanceof Appearence) v.activate();
              else v();
            }
          });
        } else if (this.appearenceLevel < targetApNumber) {
          for (
            let index = 1;
            index < targetApNumber - this.appearenceLevel;
            index++
          ) {
            if (this.appearencesMap[index + this.appearenceLevel] == undefined)
              continue;
            // if (index + this.appearenceLevel < this.appearencesMap.size - 1)
            //   break;
            if (
              this.appearencesMap[index + this.appearenceLevel] instanceof
              Appearence
            )
              (
                this.appearencesMap[index + this.appearenceLevel] as Appearence
              ).activate();
            else
              (
                this.appearencesMap[index + this.appearenceLevel] as () => void
              )();
          }
        }
        targetAppearence();
      }

      this.appearenceLevel = targetApNumber;
      return true;
    }

    getCurrentAppearenceLevel(): number {
      return this.appearenceLevel;
    }
    setAppearence(i: number, ap: Appearence | (() => void)): void {
      if (ap instanceof Appearence) ap.setObject3D(this);
      this.appearencesMap[i] = ap;
    }
    getNumberOfLevels(): number {
      return this.appearencesMap.length;
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
      if (this.objects3Drescale[idx]) this.counterParentScaling(foreignOjects);
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
  callbackOnActivation: Array<(onOff: boolean) => void> = [];
  zoomableObjects: Array<SemanticZoomableObject> = [];
  busyTill: number = Date.now();
  currentCam: THREE.Camera | undefined;
  stillBusy: boolean = false;
  //clusterMembershipByCluster: Map<number, SemanticZoomableObject> = new Map();
  //clusterMembershipByObject: Map<SemanticZoomableObject, number> = new Map();
  timeoutId: NodeJS.Timeout | undefined;

  // Cluster Map
  preClustered: Map<THREE.Vector3, Array<SemanticZoomableObject>> | undefined;
  clusterManager: ClusteringAlgInterface | undefined;
  lastReclustering!: Date;
  lastAddToCluster!: Date;

  // Singleton
  static #instance: SemanticZoomManager;

  // Zoom Level Map
  // - map: start from
  // -  Appearence 1: 0 - x
  // -  Appearence 2: x - y
  // -  Appearence 3: y - z

  zoomLevelMap: Array<number> = [];
  alreadyCreatedZoomLevelMap: boolean = false;
  // The following three variables are used internaly to create the zoomLevelMap
  _distinctMeshClassNames = new Set<string>();
  _smallestMap = new Map<string, number>();
  _biggestMap = new Map<string, number>();

  // Settings from Service
  appCommRendering: CommunicationRendering | undefined;
  font: Font | undefined;
  updateLinks?: () => void;
  // Enable auto open/close of component Meshes
  autoOpenCloseFeature: boolean = false;

  toggleAutoOpenClose(yesno: boolean) {
    this.autoOpenCloseFeature = yesno;
  }

  /**
   *
   */
  constructor() {
    this.appCommRendering =
      useApplicationRendererStore.getState().appCommRendering;
    // this.font = useFontRepositoryStore.getState().font; // Now happens in useEffect of visualization.tsx
  }

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
    this.zoomableObjects = [];
    this.zoomLevelMap = [];
    this.alreadyCreatedZoomLevelMap = false;
    this._biggestMap.clear();
    this._smallestMap.clear();
    this._distinctMeshClassNames.clear();
    // if (this.isEnabled ) {
    //   this.activate();
    // }
  }

  deactivate() {
    this.isEnabled = false;
    this.callbackOnActivation.forEach((fn) => fn(false));
    this.forceLevel(0, true);
  }

  activate() {
    this.cluster(getStoredSettings().clusterBasedOnMembers.value);
    this.callbackOnActivation.forEach((fn) => fn(true));
    this.isEnabled = true;
  }
  registerActivationCallback(fn: (onOff: boolean) => void) {
    this.callbackOnActivation.push(fn);
  }
  registerCam(perspectiveCamera: THREE.PerspectiveCamera) {
    this.currentCam = perspectiveCamera;
  }
  cluster(k: number) {
    this.lastReclustering = new Date();
    this.lastAddToCluster = new Date();
    const appSettings: VisualizationSettings = getStoredSettings();
    const useKmeans: boolean = appSettings.useKMeansInsteadOfMeanShift.value;
    // k-Means Clustering
    if (useKmeans) {
      this.clusterManager = new KMeansClusteringAlg();
      this.clusterManager.setNumberOfClusters(
        Math.round((this.zoomableObjects.length * k) / 100)
      );
    } else {
      // Mean Clustering
      this.clusterManager = new MeanShiftClusteringAlg();
      (this.clusterManager as MeanShiftClusteringAlg).setBandwidth(0.2);
    }
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
        if ((prev[0] as number) >= now && (prev[1] as boolean))
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
    const appSettings: VisualizationSettings = getStoredSettings();
    const d1: number = appSettings.distanceLevel1.value;
    const d2: number = appSettings.distanceLevel2.value;
    const d3: number = appSettings.distanceLevel3.value;
    const d4: number = appSettings.distanceLevel4.value;
    const d5: number = appSettings.distanceLevel5.value;
    const userSettingLevels = [d1, d2, d3, d4, d5];
    this.zoomLevelMap = [Number.POSITIVE_INFINITY];
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
    // if (!this.validateZoomLevelMap())
    //   this.debug(
    //     'Warning: Zoom Array is not descending. It may not work as expected'
    //   );
    // this.debug(this.zoomLevelMap);
  }

  private _createZoomLevelMapDepedingOnMeshHelper() {
    // return already calculated values
    if (
      this._biggestMap.size > 0 &&
      this._smallestMap.size > 0 &&
      this._distinctMeshClassNames.size > 0
    )
      return [
        this._distinctMeshClassNames,
        this._smallestMap,
        this._biggestMap,
      ];
    // resume with new values
    // Extract All Mesh Class Names and store the biggest and smallest one per Class
    const distinctMeshClassNames = new Set<string>();
    const smallestMap = new Map<string, number>();
    const biggestMap = new Map<string, number>();
    this.zoomableObjects.forEach((zobject) => {
      // Add the new found class name
      distinctMeshClassNames.add(zobject.constructor.name);
      // Get the current size as a vector
      const currentSizeV = this.getObjectSize(zobject);
      const currentSize = currentSizeV.length();
      // Save an initial value if never encountered before
      if (smallestMap.get(zobject.constructor.name) == undefined) {
        smallestMap.set(zobject.constructor.name, currentSize);
      }
      if (biggestMap.get(zobject.constructor.name) == undefined) {
        biggestMap.set(zobject.constructor.name, currentSize);
      }
      // Check if current is larger as the largest or smaller than the smallest and update accordingly
      if (smallestMap.get(zobject.constructor.name) > currentSize) {
        smallestMap.set(zobject.constructor.name, currentSize);
      } else if (biggestMap.get(zobject.constructor.name) < currentSize) {
        biggestMap.set(zobject.constructor.name, currentSize);
      }
    });
    this._distinctMeshClassNames = distinctMeshClassNames;
    this._smallestMap = smallestMap;
    this._biggestMap = biggestMap;
    return [distinctMeshClassNames, smallestMap, biggestMap];
  }
  createZoomLevelMapDependingOnMeshTypes(cam: THREE.Camera) {
    const appSettings: VisualizationSettings = getStoredSettings();
    const d1: number = appSettings.distanceLevel1.value;
    const d2: number = appSettings.distanceLevel2.value;
    const d3: number = appSettings.distanceLevel3.value;
    const d4: number = appSettings.distanceLevel4.value;
    const d5: number = appSettings.distanceLevel5.value;
    const userSettingLevels = [d1, d2, d3, d4, d5];
    this.zoomLevelMap = [Number.POSITIVE_INFINITY];

    const helper = this._createZoomLevelMapDepedingOnMeshHelper();
    const distinctMeshClassNames = helper[0];
    const smallestMap = helper[1];
    const biggestMap = helper[2];
    // Iterat over all the distinct names
    // Store avg distance for each distinct object
    for (let index = 0; index < userSettingLevels.length; index++) {
      const avgDistance = new Array<number>();
      distinctMeshClassNames.forEach((meshClassName) => {
        const dists = this.calculateDistanceForCoverage(
          smallestMap.get(meshClassName),
          cam,
          userSettingLevels[index]
        );
        const distl = this.calculateDistanceForCoverage(
          biggestMap.get(meshClassName),
          cam,
          userSettingLevels[index]
        );
        avgDistance.push((dists + distl) / 2);
      });
      const total = avgDistance.reduce(
        (accumulator, currentValue) => accumulator + currentValue,
        0
      );
      const average = total / avgDistance.length;
      this.zoomLevelMap.push(average);
    }

    // if (!this.validateZoomLevelMap())
    //   this.debug(
    //     'Warning: Zoom Array is not descending. It may not work as expected'
    //   );
    // this.debug(this.zoomLevelMap);
  }
  private calculateDistancesForCoveragePercentage(
    objects: Array<SemanticZoomableObject>,
    camera: THREE.Camera,
    coveragePercentage: number
  ) {
    const distances: Array<number> = [];
    if (coveragePercentage == 0) return distances;

    // Calculate distances for each object
    objects.forEach((object: SemanticZoomableObject) => {
      const distance = this.calculateDistanceForCoverage(
        object,
        camera,
        coveragePercentage
      );
      distances.push(distance);
    });

    return distances;
  }
  // Helper function to calculate the size of the object in world units
  private getObjectSize(object: SemanticZoomableObject) {
    const box = new THREE.Box3().setFromObject(
      object as unknown as THREE.Object3D
    );
    const size = new THREE.Vector3();
    box.getSize(size);
    return size;
  }

  // Function to calculate distance required to cover a specific percentage of the screen
  private calculateDistanceForCoverage(
    object: SemanticZoomableObject | number,
    camera: THREE.Camera,
    coveragePercentage: number
  ) {
    let objectDiagonal = 0;
    if (typeof object === 'number') {
      objectDiagonal = object;
    } else {
      const objectSize = this.getObjectSize(object);
      objectDiagonal = objectSize.length();
    }

    // Get camera parameters
    const fov = camera.fov * (Math.PI / 180);
    const screenCoverageRatio = coveragePercentage / 100;

    // Calculate the necessary distance
    const halfScreenSize = Math.tan(fov / 2) * 1;
    const targetCoverageSize = 2 * halfScreenSize * screenCoverageRatio;

    const distance = objectDiagonal / targetCoverageSize / Math.tan(fov / 2);

    return distance;
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
    if (this.isEnabled && this.preClustered != undefined) {
      if (
        this.clusterManager?.counterSinceLastReclusteringOccured < 50 ||
        new Date().getTime() - this.lastAddToCluster.getTime() < 5000
      ) {
        // Add to exisiting Cluster
        this.clusterManager?.addMe(this.preClustered, [obj3d]);
        //this.debug('New Element added to Cluster!');
        this.lastAddToCluster = new Date();
      } else {
        // Recluster
        // this.debug('Need to recluster');
        this.cluster(getStoredSettings().clusterBasedOnMembers.value);
      }
    }
  }
  /**
   * Removes an object from the semantic zoom manager
   * @param obj3d SemanticZoomableObject
   */
  remove(obj3d: SemanticZoomableObject) {
    const index: number = this.zoomableObjects.indexOf(obj3d);
    this.zoomableObjects.splice(index, 1);
    //this.debug('Removed index: ' + index);
  }
  /**
   * Logs the current state and provides an overview of active appearence levels
   */
  public logCurrentState() {
    const currentState: Map<number, number> = new Map();
    for (let index = 0; index < this.zoomableObjects.length; index++) {
      const element = this.zoomableObjects[index];

      const currentView = element.getCurrentAppearenceLevel();
      if (currentState.has(currentView))
        currentState.set(currentView, currentState.get(currentView) + 1);
      else currentState.set(currentView, 1);
    }

    let currentStatesAsString = '';
    const members = Array.from(currentState.keys()).sort();
    for (const key in members) {
      if (key == '_super') continue;
      const v = currentState.get(Number(members[key]));
      //currentState.forEach((v, key) => {
      currentStatesAsString =
        currentStatesAsString + members[key] + ': ' + v + '\n';
      //});
    }
    // this.debug(
    //   `Current State:\nNumber of Elements in Store: ${this.zoomableObjects.length}\n Mappings:\n${currentStatesAsString}`
    // );
  }
  public getClusterCentroids(): THREE.Vector3[] {
    if (this.preClustered == undefined) return new Array<THREE.Vector3>();
    return Array.from(this.preClustered.keys());
  }

  public forceLevel(level: number, onlyIfVisible: boolean) {
    /**
     * Forces the `level` of appearence on all registered object
     *
     * @param level - Level of Appearence to show
     *
     */
    this.zoomableObjects.forEach((element) => {
      //element.
      if (onlyIfVisible) {
        if (!element.visible) return;
      }
      element.showAppearence(level, true, true);
    });
  }

  reClusterAllMembers(): void {}

  /**
   * DEPRECATED and replaced by triggerLevelDecision2 Triggers different level of details based on camera position
   * @param cam
   * @returns level decision
   */
  triggerLevelDecision(cam: THREE.Camera): void {
    if (!this.isEnabled) return;
    if (!this.alreadyCreatedZoomLevelMap) {
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
      if (!element.visible) return;
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
   * Triggers level decision2 with debounce
   * It is used to provide a smoother experience when interacting with the 3d world.
   * can cancel an unnecesarry "render" call
   * @param cam
   */
  triggerLevelDecision2WithDebounce(cam: THREE.Camera | undefined) {
    //if (this.busyTill > Date.now()) return;
    if (this.stillBusy) {
      // this.debug('# Semantic Zoom update still running!!!');
      return;
    }
    if (this.timeoutId) {
      // this.debug(
      //   '# Semantic Zoom update still queued - to fast interaction!!!'
      // );
      clearTimeout(this.timeoutId);
    }
    this.timeoutId = setTimeout(() => {
      this.triggerLevelDecision2(cam);
    }, 250);
    // this.debug('# Semantic Zoom update in 250ms');
  }
  /**
   * This function gets called by ThreeJS everytime the camera changes. It uses the cameras frustum to determine the
   * cluster centroids in the cameras view.
   * @param cam THREE.Camera
   * @returns void
   */
  triggerLevelDecision2(camO: THREE.Camera | undefined): void {
    // this.debug('# Semantic Zoom update requested');
    let cam: THREE.Camera | undefined = camO;
    if (cam == undefined) cam = this.currentCam;
    if (cam == undefined) return;
    if (!this.isEnabled) return;
    // this.debug('## Semantic Zoom update started...');
    this.stillBusy = true;
    const alreadyAccessed: Array<SemanticZoomableObject> = [];
    if (!this.alreadyCreatedZoomLevelMap) {
      //console.log('Start calculating ZoomLevelMap');
      this.createZoomLevelMapDependingOnMeshTypes(cam);
      this.alreadyCreatedZoomLevelMap = true;
    }
    // // Check if Cluster Center is still visible for the camera, therefore a frustum is used.
    // // Source: https://stackoverflow.com/questions/29758233/three-js-check-if-object-is-still-in-view-of-the-camera
    // cam.updateMatrix();
    // cam.updateMatrixWorld();
    // const frustum = new THREE.Frustum();
    // const matrix = new THREE.Matrix4().multiplyMatrices(
    //   cam.projectionMatrix,
    //   cam.matrixWorldInverse
    // );
    // frustum.setFromProjectionMatrix(matrix);

    //Sort Cluster by Camera distance to Cluster Center
    const preClusterSortedVectors: Array<THREE.Vector3> = Array.from(
      this.preClustered?.keys()
    );
    preClusterSortedVectors.sort((a: THREE.Vector3, b: THREE.Vector3) => {
      return cam.position.distanceTo(a) - cam.position.distanceTo(b);
    });
    preClusterSortedVectors.forEach((clusterCenter: THREE.Vector3) => {
      // if (!frustum.containsPoint(clusterCenter)) {
      //   //console.log('Out of view');
      //   return;
      // }
      // Calculate the distance to Camera, only if cluster is in fov of camera
      const distanceCamToCluster = cam.position.distanceTo(clusterCenter);
      const listOfClusterMemebers: Array<SemanticZoomableObject> =
        this.preClustered?.get(clusterCenter) as Array<SemanticZoomableObject>;

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
      if (listOfClusterMemebers == undefined) return;
      if (listOfClusterMemebers.length == 0) return;
      const prioitisedClusterMembers = listOfClusterMemebers.filter(
        (e) => e.prio > 0
      );
      const unpriviledegedClusterMembers = listOfClusterMemebers.filter(
        (e) => e.prio == 0
      );
      // Loop over prio members of that cluster and trigger the target appearence
      prioitisedClusterMembers.forEach((semanticZoomableObjectVIP) => {
        semanticZoomableObjectVIP.showAppearence(targetLevel, true, true);
      });
      // Loop over unpriviledged members of that cluster and trigger the target appearence
      unpriviledegedClusterMembers.forEach((semanticZoomableObject, idx) => {
        // if (
        //   !semanticZoomableObject.visible &&
        //   !semanticZoomableObject.overrideVisibility
        // )
        //   return;

        if (alreadyAccessed.indexOf(semanticZoomableObject) != -1) {
          // Object is in list!
          // this.debug(
          //   'We already processed ',
          //   semanticZoomableObject,
          //   ' on level ',
          //   semanticZoomableObject.getCurrentAppearenceLevel(),
          //   ' but know we want ',
          //   targetLevel
          // );
          // Object was already accessed and the new requested target is below
          // the current value.
          // Here we want to maintain the more detailed view. So we cancel the change backwards.
          // The check is a >= because of the 0 value.
          if (semanticZoomableObject.getCurrentAppearenceLevel() >= targetLevel)
            return;
        }

        // If the target value is larger than the current, it automatically triggers it and only updates the delta steps between the two values.
        // If it is below, it checks whether it was accessed in this iteration before and does not reduce its value therefor.
        setTimeout(
          () => {
            // Delay the appearence change after 100 elements by 80ms to maintain steady rendering time
            semanticZoomableObject.showAppearence(targetLevel, false, false);
            if (idx == unpriviledegedClusterMembers.length - 1)
              this.stillBusy = false;
          },
          Math.floor(idx / 100) * 80
        );
        alreadyAccessed.push(semanticZoomableObject);
      });
      this.busyTill =
        this.busyTill +
        Math.floor(unpriviledegedClusterMembers.length / 100) * 50;
    });
    // this.debug('### Semantic Zoom update finished');
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
  counterSinceLastReclusteringOccured: number;
  setNumberOfClusters(k: number): void;
  // Any Object can be assigned to multiple clusters
  clusterMe(
    datapoints: Array<SemanticZoomableObject>
  ): Map<THREE.Vector3, Array<SemanticZoomableObject>>;
  addMe(
    previousCluster: Map<THREE.Vector3, Array<SemanticZoomableObject>>,
    newDataPoints: SemanticZoomableObject[]
  ): Map<THREE.Vector3, Array<SemanticZoomableObject>>;
}

/**
 * Implementation of kMeans adapted to the THREE.Vector3 and the Interface `ClusteringAlgInterface`
 * Inspired by https://medium.com/geekculture/implementing-k-means-clustering-from-scratch-in-javascript-13d71fbcb31e
 */
class KMeansClusteringAlg implements ClusteringAlgInterface {
  counterSinceLastReclusteringOccured: number = 0;
  /**
   * Adds a new 3D Object to the Cluster by simply looking for the closest centroid of the previously clustered data.
   * This is only allowed for a couple of object. At a certain point, a reclustering is nesecarry.
   * @param previousCluster Map containing centroids and there Objects
   * @param newDataPoints The 3D Object that needs to be added
   * @returns The updateded Cluster Map
   */
  addMe(
    previousCluster: Map<THREE.Vector3, Array<SemanticZoomableObject>>,
    newDataPoints: SemanticZoomableObject[]
  ): Map<THREE.Vector3, Array<SemanticZoomableObject>> {
    // Runtime: m*n*k
    const listOfAllCenterPoints: THREE.Vector3[] = Array.from(
      previousCluster.keys()
    );
    if (listOfAllCenterPoints.length == 0) return previousCluster;
    newDataPoints.forEach((newObject) => {
      newObject.getPoI().forEach((vector) => {
        let nearestObject: THREE.Vector3 = listOfAllCenterPoints[0];
        let minDistance: number = vector.distanceTo(nearestObject);
        listOfAllCenterPoints.forEach((centroidVector: THREE.Vector3) => {
          const currentDistance = vector.distanceTo(centroidVector);
          if (currentDistance < minDistance) {
            nearestObject = centroidVector;
            minDistance = currentDistance;
          }
        });
        previousCluster.get(nearestObject)?.push(newObject);
      });
    });

    this.counterSinceLastReclusteringOccured += newDataPoints.length;
    return previousCluster;
  }

  // kMeans with auto generated k
  // Default k value
  kSize = 10;
  // Max Iterations to find a fixed centroid
  MAX_ITERATIONS = 50;

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
    // const startTime = performance.now();
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
    const resultCleaned = new Map<
      THREE.Vector3,
      Array<SemanticZoomableObject>
    >();
    // Return imediatly if no data is provided
    if (allPois.length == 0 || zoomableObject.length == 0) return resultCleaned;
    // Do the clustering
    const result = this.kmeans(allPois, zoomableObject, this.kSize);
    // Clean up the cluster and sort by ascending y order.
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
    // const endTime = performance.now();

    // this.debug(`k-means Clustering took ${endTime - startTime} milliseconds`);
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
      // If no close centroid found, ignore this point
      if (closestCentroidIndex == -1) continue;
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
  /**
   * Adds a new 3D Object to the Cluster by simply looking for the closest centroid of the previously clustered data.
   * This is only allowed for a couple of object. At a certain point, a reclustering is nesecarry.
   * @param previousCluster Map containing centroids and there Objects
   * @param newDataPoints The 3D Object that needs to be added
   * @returns The updateded Cluster Map
   */
  addMe(
    previousCluster: Map<THREE.Vector3, Array<SemanticZoomableObject>>,
    newDataPoints: SemanticZoomableObject[]
  ): Map<THREE.Vector3, Array<SemanticZoomableObject>> {
    // Runtime: m*n*k
    const listOfAllCenterPoints: THREE.Vector3[] = Array.from(
      previousCluster.keys()
    );
    if (listOfAllCenterPoints.length == 0) return previousCluster;
    newDataPoints.forEach((newObject) => {
      newObject.getPoI().forEach((vector) => {
        let nearestObject: THREE.Vector3 = listOfAllCenterPoints[0];
        let minDistance: number = this.euclideanDistance(vector, nearestObject);
        listOfAllCenterPoints.forEach((centroidVector: THREE.Vector3) => {
          const currentDistance = this.euclideanDistance(
            vector,
            centroidVector
          );
          if (currentDistance < minDistance) {
            nearestObject = centroidVector;
            minDistance = currentDistance;
          }
        });
        previousCluster.get(nearestObject)?.push(newObject);
      });
    });

    this.counterSinceLastReclusteringOccured += newDataPoints.length;
    return previousCluster;
  }

  bandwidth: number = 0.2;
  counterSinceLastReclusteringOccured: number = 0;
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
    // const startTime = performance.now();

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
    const resultCleaned = new Map<
      THREE.Vector3,
      Array<SemanticZoomableObject>
    >();
    // Return imediatly if no data is provided
    if (allPois.length == 0 || zoomableObject.length == 0) return resultCleaned;
    const result = this.meanShift(allPois, this.bandwidth);
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

    // const endTime = performance.now();

    // this.debug(
    //   `Mean Shift Clustering took ${endTime - startTime} milliseconds`
    // );
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
