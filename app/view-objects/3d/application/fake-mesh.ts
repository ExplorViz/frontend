import * as THREE from 'three';
import ApplicationObject3D from './application-object-3d';
import {
  COMPONENT_ENTITY_TYPE,
  type EntityType,
} from 'virtual-reality/utils/vr-message/util/entity_type';
import type {
  Class,
  Package,
} from 'explorviz-frontend/utils/landscape-schemes/structure-data';

type PackageOrClass = Package | Class;

export default class FakeInstanceMesh<
  T extends PackageOrClass = PackageOrClass,
> extends THREE.Mesh {
  readonly dataModel: T;
  readonly instanceIndex: number;
  readonly parent: THREE.Object3D;

  private readonly app3d: ApplicationObject3D;
  private readonly mesh: THREE.InstancedMesh;

  private constructor(
    app3d: ApplicationObject3D,
    instancedMesh: THREE.InstancedMesh,
    index: number
  ) {
    super();
    this.parent = this.app3d = app3d;
    this.instanceIndex = index;
    this.mesh = instancedMesh;
    this.dataModel = this.app3d.content.getDataModel(
      this.mesh,
      this.instanceIndex
    ) as T;
    this.name = `FakeMesh for ${this.dataModel.name}`;
  }

  static getInstance(
    instancedMesh: THREE.InstancedMesh,
    index: number
  ): FakeInstanceMesh {
    const app3d = getApplicationObject3D(instancedMesh);
    return new FakeInstanceMesh(app3d, instancedMesh, index);
  }

  /**
   * Alters the color of a given mesh such that it is clear which mesh
   * the mouse points at
   *
   * @param colorShift Specifies color shift: <1 is darker and >1 is lighter
   */
  applyHoverEffect(colorShift = 1.1): void {
    if (this.isClass) {
      return; // TODO : handle class
    }
    this.app3d.content.applyHoverEffect(this.instanceIndex, colorShift);
  }

  /**
   * Restores original color of mesh which had a hover effect
   */
  resetHoverEffect(): void {
    if (this.isClass) {
      return; // TODO : handle class
    }
    if (!this.isHovered) {
      return;
    }
    this.app3d.content.resetHoverEffect();
  }

  getModelId(): string {
    return this.dataModel.id;
  }

  getType(): EntityType {
    return COMPONENT_ENTITY_TYPE; // TODO
  }

  get opened(): boolean {
    return this.app3d.content.isComponentOpened(this.dataModel.id);
  }

  get highlighted(): boolean {
    return this.app3d.content.isComponentHighlighted(this.dataModel.id);
  }

  get highlightingColor(): THREE.Color {
    return new THREE.Color('red'); // TODO
  }

  unhighlight(): void {
    if (this.isClass) {
      return; // TODO: handle class
    }

    this.app3d.content.unhighlightComponent(this.dataModel.id);
  }

  highlight(): void {
    if (this.isClass) {
      return; // TODO: handle class
    }
    this.app3d.content.highlightComponent(this.dataModel.id);
  }

  isTransparent(): boolean {
    return false;
  }

  turnOpaque(): void {}

  get isClass(): boolean {
    return 'methods' in this.dataModel;
  }

  get isHovered(): boolean {
    const hoveredModel = this.app3d.content.getHoveredModel();
    if (!hoveredModel) {
      return false;
    }
    return (
      this.dataModel === hoveredModel || this.dataModel.id === hoveredModel.id
    );
  }
}

function getApplicationObject3D(object: THREE.Object3D): ApplicationObject3D {
  if (object instanceof ApplicationObject3D) {
    return object;
  }

  if (!object.parent) {
    console.error(`mesh has no parent`, object);
    throw new Error('No parent!');
  }

  return getApplicationObject3D(object.parent);
}
