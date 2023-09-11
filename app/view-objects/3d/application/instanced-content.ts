import * as THREE from 'three';

import type ApplicationObject3D from './application-object-3d';
import type BoxLayout from 'explorviz-frontend/view-objects/layout-models/box-layout';
import type { ApplicationColors } from 'explorviz-frontend/services/configuration';
import type {
  Class,
  Package,
} from 'explorviz-frontend/utils/landscape-schemes/structure-data';

const boxGeometry = new THREE.BoxGeometry(1.0, 1.0, 1.0);
const pkgMaterial = new THREE.MeshLambertMaterial();
const tmpMatrix = new THREE.Matrix4();

export default class InstancedContent {
  private readonly app3d: ApplicationObject3D;
  private readonly classMaterial = new THREE.MeshLambertMaterial({
    transparent: true,
  });

  private components: THREE.InstancedMesh;
  private classes: THREE.InstancedMesh;
  private colors: ApplicationColors;
  private offset = new THREE.Vector3();

  private componentData: ComponentData[] = [];
  private readonly componentDataById = new Map<string, ComponentData>();
  private classData = new Map<string, ClassData>();

  readonly openComponentsIds = new Set<string>();

  constructor(app3d: ApplicationObject3D, colors: ApplicationColors) {
    this.app3d = app3d;
    this.colors = colors;

    this.components = new THREE.InstancedMesh(boxGeometry, pkgMaterial, 512);
    this.classes = new THREE.InstancedMesh(
      boxGeometry,
      this.classMaterial,
      512
    );

    this.components.receiveShadow = true;
    this.components.castShadow = true;
    this.classes.castShadow = true;

    this.components.position.sub(app3d.layout.center);
    this.classes.position.sub(app3d.layout.center);

    app3d.add(this.components);
    app3d.add(this.classes);

    this.update();
  }

  toggleComponent(index: number): boolean {
    const componentData = this.componentData[index];
    const component = componentData.component;
    const layout = this.getLayout(component.id);
    const newOpenState = !this.openComponentsIds.has(component.id);

    if (newOpenState) {
      this.openComponentsIds.add(component.id);
    } else {
      this.openComponentsIds.delete(component.id);
    }

    const parentVisible = component.parent
      ? this.openComponentsIds.has(component.parent.id)
      : true;
    this.updateComponentInstance(index, layout, newOpenState, parentVisible);

    this.updateVisibilityOfChildren(component, newOpenState, false);

    this.components.instanceMatrix!.needsUpdate = true;
    this.classes.instanceMatrix!.needsUpdate = true;

    return newOpenState;
  }

  openOrCloseAllComponents(open: boolean): void {
    for (const data of this.componentData) {
      const id = data.component.id;
      const currentlyOpen = this.openComponentsIds.has(id);
      if (open === currentlyOpen) {
        continue;
      }

      if (open) {
        this.openComponentsIds.add(id);
      } else {
        this.openComponentsIds.delete(id);
      }

      const parentVisible = data.component.parent
        ? this.openComponentsIds.has(data.component.parent.id)
        : true;
      this.updateComponentInstance(
        data.index,
        this.getLayout(id),
        open,
        parentVisible
      );
      this.updateVisibilityOfChildren(data.component, open, true);
    }

    this.components.instanceMatrix!.needsUpdate = true;
    this.classes.instanceMatrix!.needsUpdate = true;
  }

  private updateVisibilityOfChildren(
    component: Package,
    visible: boolean,
    classesOnly: boolean
  ): void {
    for (const clazz of component.classes) {
      const data = this.classData.get(clazz.id)!;
      const layout = this.getLayout(clazz.id);
      this.updateClassInstance(data.index, layout, visible);
    }

    if (classesOnly) {
      return;
    }

    for (const child of component.subPackages) {
      const data = this.componentDataById.get(child.id)!;
      const layout = this.getLayout(child.id);
      const opened = this.openComponentsIds.has(child.id);
      this.updateComponentInstance(data.index, layout, opened, visible);

      if (opened) {
        this.updateVisibilityOfChildren(child, visible, false);
      }
    }
  }

  private update(): void {
    const application = this.app3d.data.application;
    this.offset.copy(this.getLayout(application.id).center);

    for (const pkg of application.packages) {
      this.addComponentsAndChildren(pkg, true, 1);
    }

    // Send updated data to GPU with the next render
    this.components.instanceMatrix!.needsUpdate = true;
    this.components.instanceColor!.needsUpdate = true;
  }

  private addComponentsAndChildren(
    component: Package,
    visible: boolean,
    level = 1
  ): void {
    const layout = this.getLayout(component.id);

    const opened = this.openComponentsIds.has(component.id);
    const color =
      level % 2 === 0
        ? this.colors.componentEvenColor
        : this.colors.componentOddColor;

    const index = this.componentData.length;
    this.componentData.push({ visible, component, index });
    this.componentDataById.set(component.id, this.componentData[index]);
    this.updateComponentInstance(index, layout, opened, visible);
    this.components.setColorAt(index, color);

    // Add classes of given component
    for (const clazz of component.classes) {
      this.addClass(clazz, visible && opened);
    }

    // Add components with alternating colors (e.g. dark and light green)
    for (const pkg of component.subPackages) {
      this.addComponentsAndChildren(pkg, visible && opened, level + 1);
    }
  }

  private updateComponentInstance(
    index: number,
    layout: BoxLayout,
    opened: boolean,
    visible: boolean
  ): void {
    setupMatrix(layout, opened, visible);
    this.components.setMatrixAt(index, tmpMatrix);
  }

  private updateClassInstance(
    index: number,
    layout: BoxLayout,
    visible: boolean
  ): void {
    setupMatrix(layout, false, visible);
    this.classes.setMatrixAt(index, tmpMatrix);
  }

  private addClass(clazz: Class, visible: boolean): void {
    const layout = this.getLayout(clazz.id);
    setupMatrix(layout, false, visible);
    const index = this.classData.size;
    this.classData.set(clazz.id, { visible, index });

    this.updateClassInstance(index, layout, visible);
    this.classes.setColorAt(index, this.colors.clazzColor);
  }

  private getLayout(id: string): BoxLayout {
    const layout = this.app3d.getBoxLayout(id);

    if (!layout) {
      throw new Error(`No layout for id ${id}`);
    }

    return layout;
  }
}

function setupMatrix(
  layout: BoxLayout,
  opened: boolean,
  visible: boolean
): void {
  if (!visible) {
    tmpMatrix.makeScale(0, 0, 0);
    return;
  }

  const position = layout.center;

  // Reset matrix:
  tmpMatrix.makeScale(layout.width, opened ? 1.5 : layout.height, layout.depth);

  if (opened) {
    position.y -= 0.5 * layout.height;
    position.y += 0.5 * 1.5;
  }

  tmpMatrix.setPosition(position);
}

type ComponentData = {
  visible: boolean;
  component: Package;
  index: number;
};

type ClassData = {
  visible: boolean;
  index: number;
};
