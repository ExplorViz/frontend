import * as THREE from 'three';

import type ApplicationObject3D from './application-object-3d';
import type BoxLayout from 'explorviz-frontend/view-objects/layout-models/box-layout';
import type { ApplicationColors } from 'explorviz-frontend/services/configuration';
import type {
  Class,
  Package,
} from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import calculateColorBrightness from 'explorviz-frontend/utils/helpers/threejs-helpers';
import type ApplicationData from 'explorviz-frontend/utils/application-data';
import FakeInstanceMesh from './fake-mesh';
import {
  createLabelLayoutDataAttribute,
  createLabelMaterial,
} from './utils/label-material';

const LABEL_HEIGHT = 8.0; // TODO: import this (import from city-layouter not working!)

const boxGeometry = new THREE.BoxGeometry(1.0, 1.0, 1.0);
const pkgMaterial = new THREE.MeshLambertMaterial();
const tmpMatrix = new THREE.Matrix4();
const classLabelRotation = new THREE.Matrix4().makeRotationY(Math.PI / 5);

export default class ApplicationContent {
  private readonly app3d: ApplicationObject3D;
  private readonly classMaterial = new THREE.MeshBasicMaterial();
  private components: THREE.InstancedMesh;
  private classes: THREE.InstancedMesh;
  private componentLabels: THREE.InstancedMesh;
  private classLabels: THREE.InstancedMesh;
  private colors: ApplicationColors;
  private offset = new THREE.Vector3();

  private componentData: ComponentData[] = [];
  private readonly componentDataById = new Map<string, ComponentData>();
  private readonly classData: ClassData[] = [];
  private readonly classDataById = new Map<string, ClassData>();
  private hoverIndex = -1;

  readonly openComponentIds;

  constructor(
    app3d: ApplicationObject3D,
    colors: ApplicationColors,
    openComponentIds?: Set<string>
  ) {
    this.app3d = app3d;
    this.colors = colors;
    this.openComponentIds = openComponentIds ?? new Set();

    this.components = createInstancedMesh(
      'InstancedMesh for Components',
      pkgMaterial,
      app3d.data.counts.packages
    );
    this.classes = createInstancedMesh(
      'InstancedMesh for Classes',
      this.classMaterial,
      app3d.data.counts.classes
    );

    this.componentLabels = createLabelMesh(
      app3d.data.labels.components,
      app3d.componentLabelTexture,
      colors.componentTextColor
    );
    this.componentLabels.name = 'LabelMesh Components';

    this.classLabels = createLabelMesh(
      app3d.data.labels.classes,
      app3d.classLabelTexture,
      colors.clazzTextColor
    );
    this.classLabels.name = 'LabelMesh Classes';

    this.components.receiveShadow = true;
    this.components.castShadow = true;
    this.classes.castShadow = true;
    this.classes.receiveShadow = true;

    app3d.add(this.components);
    app3d.add(this.classes);
    app3d.add(this.componentLabels);
    app3d.add(this.classLabels);
    this.classes.frustumCulled = false;
    this.classLabels.frustumCulled = false;

    this.init();
  }

  toggleComponent(index: number): boolean {
    const componentData = this.componentData[index];
    const component = componentData.component;
    const layout = this.getLayout(component.id);
    const newOpenState = !this.openComponentIds.has(component.id);

    if (newOpenState) {
      this.openComponentIds.add(component.id);
    } else {
      this.openComponentIds.delete(component.id);
    }

    const parentVisible = component.parent
      ? this.openComponentIds.has(component.parent.id)
      : true;
    this.updateComponentInstance(index, layout, newOpenState, parentVisible);

    this.updateVisibilityOfChildren(component, newOpenState, false);

    this.components.instanceMatrix!.needsUpdate = true;
    this.classes.instanceMatrix!.needsUpdate = true;
    this.componentLabels.instanceMatrix!.needsUpdate = true;
    this.classLabels.instanceMatrix!.needsUpdate = true;

    return newOpenState;
  }

  openOrCloseAllComponents(open: boolean): void {
    for (const data of this.componentData) {
      const id = data.component.id;
      const currentlyOpen = this.openComponentIds.has(id);
      if (open === currentlyOpen) {
        continue;
      }

      if (open) {
        this.openComponentIds.add(id);
      } else {
        this.openComponentIds.delete(id);
      }

      const parentVisible = data.component.parent
        ? this.openComponentIds.has(data.component.parent.id)
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
    this.componentLabels.instanceMatrix!.needsUpdate = true;
    this.classLabels.instanceMatrix!.needsUpdate = true;
  }

  applyHoverEffect(index: number, colorShift = 1.1): void {
    if (this.hoverIndex === index) {
      return;
    }
    if (this.hoverIndex >= 0) {
      // Remove the hover effect from a different component:
      this.resetHoverEffect();
    }

    const previousColor = new THREE.Color();
    this.components.getColorAt(index, previousColor);
    const color = calculateColorBrightness(previousColor, colorShift);
    this.updateComponentColor(index, color);
    this.hoverIndex = index;
  }

  getDataModel(mesh: THREE.InstancedMesh, index: number): Package | Class {
    if (this.components === mesh) {
      return this.componentData[index].component;
    } else if (this.classes === mesh) {
      throw new Error('Not yet implemented.'); // TODO
    }

    if (mesh.parent === this.app3d.arrows) {
      console.log('its arrows', mesh);
    }

    console.error(mesh, index);
    throw new Error(`No data model for instanced mesh and index ${index}.`);
  }

  getFakeMeshById(id: string): FakeInstanceMesh | undefined {
    const component = this.componentDataById.get(id);
    if (component) {
      return FakeInstanceMesh.getInstance(this.components, component.index);
    }

    const clazz = this.classDataById.get(id);
    if (clazz) {
      return; // TODO
    }

    return undefined;
  }

  resetHoverEffect(): void {
    if (this.hoverIndex < 0) {
      return;
    }

    this.resetComponentColor(this.hoverIndex);
    this.hoverIndex = -1;
  }

  getHoveredModel(): Package | undefined {
    if (this.hoverIndex < 0) {
      return undefined;
    }

    return this.componentData[this.hoverIndex].component;
  }

  update(openComponentIds?: Set<string>): void {
    // Remove old data:
    this.openComponentIds.clear();
    this.componentData.length = 0;
    this.componentDataById.clear();
    this.classData.length = 0;
    this.classDataById.clear();

    openComponentIds?.forEach((id) => this.openComponentIds.add(id));

    this.init();
  }

  isComponentOpened(id: string): boolean {
    return this.openComponentIds.has(id);
  }

  isComponentHighlighted(id: string): boolean {
    return this.componentDataById.get(id)?.highlighted ?? false;
  }

  highlightComponent(id: string): void {
    const data = this.componentDataById.get(id);
    if (!data || data.highlighted) {
      return;
    }
    const color = data.highlightingColor ?? this.colors.highlightedEntityColor;
    data.highlighted = true;
    this.updateComponentColor(data.index, color);
  }

  unhighlightComponent(id: string): void {
    const data = this.componentDataById.get(id);
    if (!data || !data.highlighted) {
      return;
    }
    data.highlighted = false;
    this.resetComponentColor(data.index);
  }

  unhighlightAll(): void {
    for (const data of this.componentData) {
      if (data.highlighted) {
        this.resetComponentColor(data.index, false);
        data.highlighted = false;
      }
    }
    this.components.instanceColor!.needsUpdate = true;
  }

  getOpenedComponents(): Package[] {
    return this.componentData
      .filter((data) => this.openComponentIds.has(data.component.id))
      .map((data) => data.component);
  }

  setHighlightingColor(color: THREE.Color): void {
    const isDefault = color.equals(this.colors.highlightedEntityColor);
    for (const data of this.componentData) {
      if (isDefault) {
        if (data.highlightingColor) {
          this.updateComponentColor(data.index, color, false);
        }
        delete data.highlightingColor;
      } else {
        data.highlightingColor = color;
      }
    }
    this.components.instanceColor!.needsUpdate = true;
  }

  get applicationId(): string {
    return this.app3d.data.application.id;
  }

  private resetComponentColor(index: number, update: boolean = true): void {
    const data = this.componentData[index];
    const highlightedColor =
      data.highlightingColor ?? this.colors.highlightedEntityColor;
    const color = data.highlighted
      ? highlightedColor
      : componentColor(this.colors, data.level);
    this.updateComponentColor(index, color, update);
  }

  private updateComponentColor(
    index: number,
    color: THREE.Color,
    update = true
  ): void {
    this.components.setColorAt(index, color);
    if (update) {
      this.components.instanceColor!.needsUpdate = true;
    }
  }

  private updateVisibilityOfChildren(
    component: Package,
    visible: boolean,
    classesOnly: boolean
  ): void {
    for (const clazz of component.classes) {
      const data = this.classDataById.get(clazz.id)!;
      const layout = this.getLayout(clazz.id);
      this.updateClassInstance(data.index, layout, visible);
    }

    if (classesOnly) {
      return;
    }

    for (const child of component.subPackages) {
      const data = this.componentDataById.get(child.id)!;
      const layout = this.getLayout(child.id);
      const opened = this.openComponentIds.has(child.id);
      this.updateComponentInstance(data.index, layout, opened, visible);

      if (opened) {
        this.updateVisibilityOfChildren(child, visible, false);
      }
    }
  }

  private init(): void {
    this.hoverIndex = -1;

    const counts = this.app3d.data.counts;
    if (counts.classes !== this.classes.count) {
      this.classes = createInstancedMesh(
        'Instanced mesh for Classes',
        this.classMaterial,
        counts.classes
      );
    }
    if (counts.packages !== this.components.count) {
      this.components = createInstancedMesh(
        'Instanced mesh for Components',
        pkgMaterial,
        counts.packages
      );
    }

    const position = new THREE.Vector3(0, 0, 0).sub(this.app3d.layout.center);
    this.components.position.copy(position);
    this.classes.position.copy(position);
    this.componentLabels.position.copy(position);
    this.classLabels.position.copy(position);

    const application = this.app3d.data.application;
    this.offset.copy(this.getLayout(application.id).center);

    for (const pkg of application.packages) {
      this.addComponentsAndChildren(pkg, true, 1);
    }

    // Send updated data to GPU with the next render
    this.components.instanceMatrix!.needsUpdate = true;
    this.components.instanceColor!.needsUpdate = true;
    this.componentLabels.instanceMatrix!.needsUpdate = true;
    this.classLabels.instanceMatrix!.needsUpdate = true;
    this.classes.instanceMatrix!.needsUpdate = true;

    this.components.computeBoundingBox();
    this.components.computeBoundingSphere();
  }

  private addComponentsAndChildren(
    component: Package,
    visible: boolean,
    level = 1
  ): void {
    const layout = this.getLayout(component.id);

    const opened = this.openComponentIds.has(component.id);

    const index = this.componentData.length;
    this.componentData.push({
      visible,
      component,
      index,
      level,
      highlighted: false,
    });
    this.componentDataById.set(component.id, this.componentData[index]);
    this.updateComponentInstance(index, layout, opened, visible);
    this.updateComponentColor(index, componentColor(this.colors, level), false);

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
    setupBoxMatrix(layout, opened, visible);
    this.components.setMatrixAt(index, tmpMatrix);

    const id = this.componentData[index].component.id;
    const labelIndex = this.app3d.data.labels.components.layout.get(id)?.index;

    if (labelIndex === undefined) {
      throw new Error(
        `Missing label "${this.componentData[index].component.name}"`
      );
    }

    setupComponentLabelMatrix(layout, opened, visible);
    this.componentLabels.setMatrixAt(labelIndex, tmpMatrix);
  }

  private updateClassInstance(
    index: number,
    layout: BoxLayout,
    visible: boolean
  ): void {
    setupBoxMatrix(layout, false, visible);
    this.classes.setMatrixAt(index, tmpMatrix);
    const classData = this.classData[index];
    const labelData = this.app3d.data.labels.classes.layout.get(classData.id)!;
    setupClassLabelMatrix(layout, visible);
    this.classLabels.setMatrixAt(labelData.index, tmpMatrix);
  }

  private addClass(clazz: Class, visible: boolean): void {
    const layout = this.getLayout(clazz.id);
    setupBoxMatrix(layout, false, visible);
    const index = this.classData.length;
    const classData = { visible, index, labelIndex: -1, id: clazz.id };
    this.classData.push(classData);
    this.classDataById.set(clazz.id, classData);

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

function setupBoxMatrix(
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

function setupComponentLabelMatrix(
  componentLayout: BoxLayout,
  opened: boolean,
  visible: boolean
) {
  if (!visible) {
    tmpMatrix.makeScale(0, 0, 0);
    return;
  }

  // TODO: why x0.5?
  tmpMatrix.makeScale(0.5 * LABEL_HEIGHT, 1.0, 0.9 * componentLayout.depth);

  const position = componentLayout.center;

  if (opened) {
    position.y += 1.5 - 0.5 * componentLayout.height;
    position.x -= 0.5 * componentLayout.width - 0.25 * LABEL_HEIGHT;
  } else {
    position.y += 0.5 * componentLayout.height;
  }

  // Fix Z-fighting
  position.y += 0.01;

  tmpMatrix.setPosition(position);
}

function setupClassLabelMatrix(classLayout: BoxLayout, visible: boolean) {
  if (!visible) {
    tmpMatrix.makeScale(0, 0, 0);
    return;
  }

  tmpMatrix.makeScale(1.3, 1.0, 5.5); // TODO
  tmpMatrix.premultiply(classLabelRotation);

  const position = classLayout.center;
  position.y += 0.5 * classLayout.height;

  // Fix Z-fighting
  position.y += 0.01;

  tmpMatrix.setPosition(position);
}

function createInstancedMesh(
  name: string,
  material: THREE.Material,
  count: number,
  raycastInvisible = false
): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(boxGeometry, material, count);
  mesh.userData = { raycastInvisible };
  mesh.name = name;
  return mesh;
}

function createLabelMesh(
  data: ApplicationData['labels']['classes' | 'components'],
  texture: THREE.Texture,
  color: THREE.Color
): THREE.InstancedMesh {
  const planeGeometry = new THREE.PlaneGeometry(1, 1);
  planeGeometry.rotateX(-0.5 * Math.PI);
  planeGeometry.rotateY(-0.5 * Math.PI);

  // Make label layout data available to the vertex shader:
  const attribute = createLabelLayoutDataAttribute(data);
  planeGeometry.setAttribute('labelLayoutData', attribute);

  const material = createLabelMaterial(texture, color);

  const mesh = new THREE.InstancedMesh(
    planeGeometry,
    material,
    data.layout.size
  );

  mesh.userData = {
    raycastInvisible: true,
  };
  mesh.name = 'LabelMesh';

  // Hide all labels initially:
  tmpMatrix.makeScale(0, 0, 0);
  for (let i = 0; i < data.layout.size; i++) {
    mesh.setMatrixAt(i, tmpMatrix);
  }

  return mesh;
}

function componentColor(colors: ApplicationColors, level: number) {
  const color =
    level % 2 === 0 ? colors.componentEvenColor : colors.componentOddColor;

  return color;
}

type ComponentData = {
  visible: boolean;
  component: Package;
  index: number;
  level: number;
  highlighted: boolean;
  highlightingColor?: THREE.Color;
};

type ClassData = {
  visible: boolean;
  index: number;
  labelIndex: number;
  id: string;
};
