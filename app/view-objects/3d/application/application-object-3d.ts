import * as THREE from 'three';
import { Trace } from 'explorviz-frontend/utils/landscape-schemes/dynamic-data';
import BoxLayout from 'explorviz-frontend/view-objects/layout-models/box-layout';
import { tracked } from '@glimmer/tracking';
import { earthTexture } from 'explorviz-frontend/controllers/visualization';
import FoundationMesh from './foundation-mesh';
import ClazzMesh from './clazz-mesh';
import ComponentMesh from './component-mesh';
import ClazzCommunicationMesh from './clazz-communication-mesh';
import BaseMesh from '../base-mesh';
import BoxMesh from './box-mesh';
import ApplicationData from 'explorviz-frontend/utils/application-data';
import InstancedContent from './instanced-content';
import type { ApplicationColors } from 'explorviz-frontend/services/configuration';
import CommunicationArrows from './communication-arrows';
import { Package } from 'explorviz-frontend/utils/landscape-schemes/structure-data';

/**
 * This extended Object3D adds additional functionality to
 * add and retrieve application regarded meshes efficiently and
 * some functionality to easily remove child meshes and dispose
 * all their THREE.Geometry's and THREE.Material's.
 */
export default class ApplicationObject3D extends THREE.Object3D {
  /**
   * The underlying application data model
   */
  data: ApplicationData;

  boxLayoutMap: Map<string, BoxLayout>;

  /**
   * Map to store all box shaped meshes (i.e., Clazz, Component, Foundation)
   */
  modelIdToMesh: Map<string, BaseMesh> = new Map();

  /**
   * Map to store all ClazzCommunicationMeshes
   */
  commIdToMesh: Map<string, ClazzCommunicationMesh> = new Map();

  /**
   * Set to store all ComponentMeshes
   */
  componentMeshes: Set<ComponentMesh> = new Set();

  globeMesh: THREE.Mesh | undefined;

  animationMixer: THREE.AnimationMixer | undefined;

  @tracked
  highlightedEntity: BaseMesh | Trace | null = null;

  content: InstancedContent;

  arrows: CommunicationArrows;

  constructor(
    data: ApplicationData,
    boxLayoutMap: Map<string, BoxLayout>,
    colors: ApplicationColors,
    openComponentIds?: Set<string>
  ) {
    super();

    this.data = data;
    this.boxLayoutMap = boxLayoutMap;

    this.createFoundation(colors);
    this.content = new InstancedContent(this, colors, openComponentIds);

    const arrowWidth = 1.0 + 0.5 * 1.0; // TODO
    this.arrows = new CommunicationArrows(
      data.drawableClassCommunications.length * 2,
      arrowWidth
    );
    this.add(this.arrows);
  }

  private createFoundation(colors: ApplicationColors): void {
    const application = this.data.application;
    const layout = this.getBoxLayout(application.id)!;

    const mesh = new FoundationMesh(
      layout,
      application,
      colors.foundationColor,
      colors.highlightedEntityColor
    );

    this.add(mesh);
  }

  get layout() {
    const layout = this.getBoxLayout(this.data.application.id);
    if (layout) {
      return layout;
    }

    return new BoxLayout();
  }

  /* eslint @typescript-eslint/no-unused-vars: 'off' */
  tick(_delta: number): void {
    // will be overriden
  }

  /**
   * Resets this object's rotation to default
   * (x = 0.65, y = 0.80)
   */
  resetRotation() {
    this.rotation.x = -90 * THREE.MathUtils.DEG2RAD;
    this.rotation.y = 90 * THREE.MathUtils.DEG2RAD;
    this.rotation.z = 90 * THREE.MathUtils.DEG2RAD;
  }

  /**
   * Adds object as child of this object.
   * Furthermore, application related meshes are stored inside
   * one of the class's maps or set for easier future access.
   *
   * @param object Object to add as child
   */
  add(object: THREE.Object3D) {
    super.add(object);

    // Ensure fast access to application meshes by additionally storing them in maps
    if (object instanceof FoundationMesh) {
      this.modelIdToMesh.set(object.getModelId(), object);
      // Store communication separately to allow efficient iteration over meshes
    } else if (object instanceof ComponentMesh || object instanceof ClazzMesh) {
      this.modelIdToMesh.set(object.getModelId(), object);
    } else if (object instanceof ClazzCommunicationMesh) {
      this.commIdToMesh.set(object.getModelId(), object);
    }

    // Keep track of all components (e.g. to find opened components)
    if (object instanceof ComponentMesh) {
      this.componentMeshes.add(object);
    }

    return this;
  }

  /**
   * Creates a GlobeMesh and adds it to the given application object.
   * Communication that come from the outside
   *
   */
  addGlobeToApplication(): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(2.5, 15, 15);
    const material = new THREE.MeshPhongMaterial({ map: earthTexture });
    const mesh = new THREE.Mesh(geometry, material);
    const applicationCenter = this.layout.center;

    const centerPoint = new THREE.Vector3(-5, 0, -5);

    centerPoint.sub(applicationCenter);

    mesh.position.copy(centerPoint);

    this.add(mesh);

    this.globeMesh = mesh;

    return mesh;
  }

  initializeGlobeAnimation() {
    if (!this.globeMesh) {
      return;
    }

    const period = 1000;
    const times = [0, period];
    const values = [0, 360];

    const trackName = '.rotation[y]';
    const track = new THREE.NumberKeyframeTrack(trackName, times, values);

    const clip = new THREE.AnimationClip('default', period, [track]);

    this.animationMixer = new THREE.AnimationMixer(this.globeMesh);

    const clipAction = this.animationMixer.clipAction(clip);
    clipAction.play();
  }

  repositionGlobeToApplication() {
    if (!this.globeMesh) {
      return;
    }

    const applicationCenter = this.layout.center;

    const centerPoint = new THREE.Vector3(-5, 0, -5);

    centerPoint.sub(applicationCenter);

    this.globeMesh.position.copy(centerPoint);
  }

  toggleComponentByIndex(index: number) {
    this.content.toggleComponent(index);
  }

  updateModel(colors: ApplicationColors, openComponentIds?: Set<string>): void {
    if (this.foundationMesh) {
      this.foundationMesh.removeFromParent();
    }
    this.createFoundation(colors);
    this.content.update(openComponentIds);
  }

  getOpenedComponents(): Package[] {
    return this.content.getOpenedComponents();
  }

  getBoxLayout(id: string) {
    return this.boxLayoutMap.get(id);
  }

  getModelId() {
    return this.data.application.id;
  }

  /**
   * Returns mesh with given id, if existend. Else undefined.
   *
   * @param id The mesh's id to lookup
   */
  getBoxMeshbyModelId(id: string) {
    return this.modelIdToMesh.get(id);
  }

  getMeshById(id: string) {
    return this.getBoxMeshbyModelId(id) || this.getCommMeshByModelId(id);
  }

  /**
   * Returns a set containing all application regarded box meshes inside this application
   */
  getBoxMeshes() {
    return new Set([...this.modelIdToMesh.values()]);
  }

  /**
   * Returns the clazz communication mesh that matches the id
   *
   * @param id The clazzcommunication's id, whose mesh to look up
   */
  getCommMeshByModelId(id: string) {
    return this.commIdToMesh.get(id);
  }

  /**
   * Returns a set containing all communication meshes inside this application
   */
  getCommMeshes() {
    return new Set([...this.commIdToMesh.values()]);
  }

  /**
   * Returns a set containing all communication and box meshes inside this application
   */
  getAllMeshes(): Set<BaseMesh> {
    return new Set([...this.getBoxMeshes(), ...this.getCommMeshes()]);
  }

  get foundationMesh() {
    return this.getBoxMeshbyModelId(this.data.application.id);
  }

  /**
   * Iterates over all component meshes which are currently added to the
   * application and returns a set with ids of the opened components.
   */
  get openComponentIds() {
    return structuredClone(this.content.openComponentIds);
  }

  /**
   * Sets the visiblity of all component meshes with the current application
   * @param opacity Determines how opaque / visible component meshes should be
   */
  setBoxMeshOpacity(opacity = 1) {
    this.getBoxMeshes().forEach((mesh) => {
      if (mesh instanceof BoxMesh) {
        if (opacity === 1) {
          mesh.turnOpaque();
          mesh.defaultOpacity = 1;
        } else {
          mesh.turnTransparent(opacity);
          mesh.defaultOpacity = opacity;
        }
      }
    });
  }

  /**
   * Sets the visiblity of all component meshes with the current application
   * @param opaccity Determines how opaque / visible component meshes should be
   */
  setComponentMeshOpacity(opacity = 1) {
    this.getBoxMeshes().forEach((mesh) => {
      if (mesh instanceof ComponentMesh) {
        if (opacity === 1) {
          mesh.turnOpaque();
          mesh.defaultOpacity = 1;
        } else {
          mesh.turnTransparent(opacity);
          mesh.defaultOpacity = opacity;
        }
      }
    });
  }

  /**
   * Sets the visiblity of all communication meshes with the current application
   * @param opaccity Determines how opaque/visible component meshes should be
   */
  setCommunicationOpacity(opacity = 1) {
    const commMeshes = this.getCommMeshes();

    commMeshes.forEach((mesh) => {
      if (mesh instanceof ClazzCommunicationMesh) {
        if (opacity === 1) {
          mesh.turnOpaque();
        } else {
          mesh.turnTransparent(opacity);
        }
      }
    });
  }

  setOpacity(opacity = 1) {
    this.setBoxMeshOpacity(opacity);
    this.setCommunicationOpacity(opacity);
  }

  /**
   * Sets the opacity of all box meshes within the application object to 1.
   *
   * @param setAsDefault Determines whether default opacity value should be set
   */
  turnOpaque(setAsDefault = true) {
    if (setAsDefault) {
      this.setBoxMeshOpacity(1);
    } else {
      this.getBoxMeshes().forEach((mesh) => {
        if (mesh instanceof BoxMesh) {
          mesh.turnOpaque();
        }
      });
    }
  }

  /**
   * Sets the opacity of all box meshes within the application object to the
   * default opacity value (which is 1 if not set otherwise).
   */
  setToDefaultOpacity() {
    this.getBoxMeshes().forEach((mesh) => {
      if (mesh instanceof BoxMesh) {
        if (mesh.defaultOpacity === 1) {
          mesh.turnOpaque();
        } else {
          mesh.turnTransparent(mesh.defaultOpacity);
        }
      }
    });
  }

  /**
   * Sets the highlighting color for all meshes within the application object.
   *
   * @param color Color for highlighting of objects within the application.
   */
  setHighlightingColor(color: THREE.Color) {
    this.getAllMeshes().forEach((mesh) => {
      mesh.highlightingColor = color;
      mesh.updateColor();
    });
  }

  /**
   * Scales the application object such that its largest side matches the given value.
   *
   * @param max Desired length for the longest side of the application object
   */
  setLargestSide(max: number) {
    if (max <= 0) return;

    const appDimensions = new THREE.Box3().setFromObject(this);
    const scalar =
      max / Math.max(...appDimensions.getSize(new THREE.Vector3()).toArray());

    this.scale.multiplyScalar(scalar);
  }

  /**
   * Clears all class maps and sets, i.e.
   *
   * @see modelIdToMesh
   * @see commIdToMesh
   * @see componentMeshes
   */
  resetMeshReferences() {
    this.modelIdToMesh.clear();
    this.commIdToMesh.clear();
    this.componentMeshes.clear();
  }

  /**
   * Disposes all communication related THREE.Material's
   * and THREE.Geometry's, and cleans the communication mesh set.
   *
   * @see commIdToMesh
   */
  removeAllCommunication() {
    this.getCommMeshes().forEach((mesh) => {
      mesh.disposeRecursively();
      mesh.deleteFromParent();
    });
    this.commIdToMesh.clear();
    this.arrows.reset(0);
  }

  /**
   * Disposes all meshes inside this object and clears all maps and sets
   */
  removeAllEntities() {
    // TODO
    this.getAllMeshes().forEach((mesh) => {
      mesh.disposeRecursively();
      mesh.deleteFromParent();
    });
    this.resetMeshReferences();
    this.highlightedEntity = null;
  }
}
