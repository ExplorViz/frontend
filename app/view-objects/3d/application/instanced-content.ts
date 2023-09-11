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
  private readonly classMaterial = new THREE.MeshLambertMaterial();

  private components: THREE.InstancedMesh;
  private classes: THREE.InstancedMesh;
  private colors: ApplicationColors;
  private offset = new THREE.Vector3();

  private componentData: ComponentData[] = [];
  private componentDataById = new Map<string, ComponentData>();
  private classesVisibleState: boolean[] = [];

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
    const newOpenState = !componentData.opened;

    if (newOpenState) {
      this.openComponentsIds.add(component.id);
    } else {
      this.openComponentsIds.delete(component.id);
    }

    const parentVisible = component.parent
      ? this.openComponentsIds.has(component.parent.id)
      : true;
    this.updateComponentInstance(index, layout, newOpenState, parentVisible);

    this.updateVisibilityOfChildren(component, newOpenState);

    this.components.instanceMatrix!.needsUpdate = true;

    return newOpenState;
  }

  private updateVisibilityOfChildren(
    component: Package,
    visible: boolean
  ): void {
    for (const pkg of component.subPackages) {
      const data = this.componentDataById.get(pkg.id)!;
      const layout = this.getLayout(pkg.id);
      this.updateComponentInstance(data.index, layout, data.opened, visible);

      if (data.opened) {
        this.updateVisibilityOfChildren(pkg, visible);
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
    this.componentData.push({ visible, opened, component, index });
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

  private addClass(clazz: Class, visible: boolean): void {
    const layout = this.getLayout(clazz.id);
    setupMatrix(layout, false, visible);
    const index = this.classesVisibleState.push(visible) - 1;
    this.classes.setMatrixAt(index, tmpMatrix);
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
  opened: boolean;
  component: Package;
  index: number;
};
