import * as THREE from 'three';
import { Trace } from 'react-lib/src/utils/landscape-schemes/dynamic/dynamic-data';
import BoxLayout from 'react-lib/src/view-objects/layout-models/box-layout.ts';
// import { earthTexture } from 'explorviz-frontend/controllers/visualization';
import FoundationMesh from 'react-lib/src/view-objects/3d/application/foundation-mesh';
import ClazzMesh from 'react-lib/src/view-objects/3d/application/clazz-mesh';
import ComponentMesh from 'react-lib/src/view-objects/3d/application/component-mesh';
import ClazzCommunicationMesh from 'react-lib/src/view-objects/3d/application/clazz-communication-mesh';
import BaseMesh from 'react-lib/src/view-objects/3d/base-mesh.ts';
import BoxMesh from 'react-lib/src/view-objects/3d/application/box-mesh.ts';
import ApplicationData from 'react-lib/src/utils/application-data';
import { getAllClassesInApplication } from 'react-lib/src/utils/application-helpers';
import { findFirstOpenOrLastClosedAncestorComponent } from 'react-lib/src/utils/link-helper';
import ClassCommunication from 'react-lib/src/utils/landscape-schemes/dynamic/class-communication';
import { Vector3 } from 'three';
import { EntityMesh } from 'react-lib/src/utils/extended-reality/vr-helpers/detail-info-composer';
import SemanticZoomManager from 'react-lib/src/view-objects/3d/application/utils/semantic-zoom-manager';
import { ChildMesh } from 'react-lib/src/view-objects/3d/application/child-mesh-interface';

/**
 * This extended Object3D adds additional functionality to
 * add and retrieve application regarded meshes efficiently and
 * some functionality to easily remove child meshes and dispose
 * all their THREE.Geometry's and THREE.Material's.
 */
export default class ApplicationObject3D
  extends THREE.Object3D
  implements ChildMesh
{
  /**
   * The underlying application data model
   */
  dataModel: ApplicationData;

  /**
   * Map to store all box shaped meshes (i.e., Clazz, Component, Foundation)
   */
  modelIdToMesh: Map<string, EntityMesh> = new Map();

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

  // @tracked
  highlightedEntity: Set<string> | Trace | null = null; // Multiple entities may be highlighted at once

  classCommunicationSet: Set<ClassCommunication> = new Set();

  constructor(data: ApplicationData) {
    super();

    this.dataModel = data;
  }

  get layout() {
    const layout = this.getBoxLayout(this.dataModel.getId());
    if (layout) {
      return layout;
    }

    return new BoxLayout();
  }

  get dimensions() {
    return new Vector3(
      this.layout.width,
      this.layout.height,
      this.layout.depth
    );
  }

  get boxLayoutMap() {
    return this.dataModel.boxLayoutMap;
  }

  updateLayout(boxLayoutMap: Map<string, BoxLayout> | undefined = undefined) {
    if (boxLayoutMap) {
      this.dataModel.boxLayoutMap = boxLayoutMap;
    }

    const appLayout = this.boxLayoutMap.get(this.dataModel.getId());
    if (appLayout) {
      this.position.set(
        appLayout?.positionX,
        appLayout?.positionY,
        appLayout?.positionZ
      );
    }

    this.children.forEach((mesh) => {
      if (
        mesh instanceof FoundationMesh ||
        mesh instanceof ComponentMesh ||
        mesh instanceof ClazzMesh
      ) {
        const boxLayout = this.getBoxLayout(mesh.dataModel.id);
        if (boxLayout) {
          mesh.updateLayout(boxLayout, this.layout.position);
        }
      }
    });
  }

  /* eslint @typescript-eslint/no-unused-vars: 'off' */
  tick(_delta: number): void {
    // will be overriden
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

  getClassMeshes() {
    return Array.from(this.modelIdToMesh.values()).filter(
      (mesh) => mesh instanceof ClazzMesh
    );
  }

  /**
   * Creates a GlobeMesh and adds it to the given application object.
   * Communication that come from the outside
   *
   */
  addGlobeToApplication(): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(2.5, 15, 15);
    // const material = new THREE.MeshPhongMaterial({ map: earthTexture });
    const material = new THREE.MeshBasicMaterial();
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

  getBoxLayout(id: string) {
    return this.boxLayoutMap.get(id);
  }

  getModelId() {
    return this.dataModel.getId();
  }

  /**
   * Returns mesh with given id, if existend. Else undefined.
   *
   * @param id The mesh's id to lookup
   */
  getBoxMeshByModelId(id: string) {
    return this.modelIdToMesh.get(id);
  }

  getMeshById(id: string) {
    return this.getBoxMeshByModelId(id) || this.getCommMeshByModelId(id);
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
    return this.getBoxMeshByModelId(this.dataModel.getId());
  }

  /**
   * Iterates over all component meshes which are currently added to the
   * application and returns a set with ids of the opened components.
   */
  get openComponentIds() {
    const openComponentIds: Set<string> = new Set();

    this.componentMeshes.forEach((componentMesh) => {
      if (componentMesh.opened) {
        openComponentIds.add(componentMesh.getModelId());
      }
    });

    return openComponentIds;
  }

  /**
   * Iterates over all opened meshes which are currently added to the
   * application and returns a set with ids of the transparent components.
   */
  get transparentComponentIds() {
    const transparentComponentIds: Set<string> = new Set();

    this.openComponentIds.forEach((openId) => {
      const componentMesh = this.getMeshById(openId);
      if (componentMesh) {
        if (componentMesh.material.opacity !== 1) {
          transparentComponentIds.add(openId);
        }
      }
    });

    // consider clazzes too
    getAllClassesInApplication(this.dataModel.application).forEach((clazz) => {
      const clazzParentPackage = clazz.parent;

      const pckg = findFirstOpenOrLastClosedAncestorComponent(
        this,
        clazzParentPackage
      );
      const pckgMesh = this.getBoxMeshByModelId(pckg.id);
      if (pckgMesh instanceof ComponentMesh) {
        if (pckgMesh.opened) {
          pckgMesh.dataModel.subPackages.forEach((subPckg) => {
            const subPckgMesh = this.getBoxMeshByModelId(subPckg.id);
            if (
              subPckgMesh instanceof ComponentMesh &&
              subPckgMesh.material.opacity !== 1
            ) {
              transparentComponentIds.add(subPckg.id);
            }
          });
        } else {
          if (pckgMesh.material.opacity !== 1)
            transparentComponentIds.add(pckg.id);
        }
      }

      if (this.getBoxMeshByModelId(clazz.id)?.material.opacity !== 1) {
        transparentComponentIds.add(clazz.id);
      }
    });

    // intern links too
    this.getCommMeshes().forEach((commMesh) => {
      if (commMesh?.material.opacity !== 1) {
        transparentComponentIds.add(commMesh.getModelId());
      }
    });

    // TODO: extern links too (currently handled in room-serializer.ts, serializeApplication function)

    return transparentComponentIds;
  }

  /**
   * Sets the visiblity of all component meshes with the current application
   * @param opaccity Determines how opaque / visible component meshes should be
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

  updateCommunicationMeshHighlighting() {
    this.getCommMeshes().forEach((mesh) => {
      if (
        this.highlightedEntity instanceof Set &&
        this.highlightedEntity.has(mesh.dataModel.communication.id)
      ) {
        mesh.highlight();
      }
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
      SemanticZoomManager.instance.remove(mesh);
      mesh.deleteFromParent();
      mesh.disposeRecursively(SemanticZoomManager);
    });
    this.commIdToMesh.clear();
  }

  /**
   * Disposes all meshes inside this object and clears all maps and sets
   */
  removeAll() {
    this.getAllMeshes().forEach((mesh) => {
      SemanticZoomManager.instance.remove(mesh);
      mesh.deleteFromParent();
      mesh.disposeRecursively(SemanticZoomManager);
    });
    this.resetMeshReferences();
    this.highlightedEntity = null;
  }
}
