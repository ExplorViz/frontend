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

const LABEL_HEIGHT = 8.0; // TODO: import this (import from city-layouter not working!)

const boxGeometry = new THREE.BoxGeometry(1.0, 1.0, 1.0);
const pkgMaterial = new THREE.MeshLambertMaterial();
const tmpMatrix = new THREE.Matrix4();

export default class ApplicationContent {
  private readonly app3d: ApplicationObject3D;
  private readonly classMaterial = new THREE.MeshLambertMaterial();
  private components: THREE.InstancedMesh;
  private classes: THREE.InstancedMesh;
  private componentLabels: THREE.InstancedMesh;
  private colors: ApplicationColors;
  private offset = new THREE.Vector3();

  private componentData: ComponentData[] = [];
  private readonly componentDataById = new Map<string, ComponentData>();
  private readonly classData = new Map<string, ClassData>();
  private hoverIndex = -1;
  private previousColor = new THREE.Color();

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
      pkgMaterial,
      app3d.data.counts.packages
    );
    this.classes = createInstancedMesh(
      this.classMaterial,
      app3d.data.counts.classes
    );
    this.componentLabels = createLabelMesh(app3d.data, colors);

    this.components.receiveShadow = true;
    this.components.castShadow = true;
    this.classes.castShadow = true;
    this.classes.receiveShadow = true;

    app3d.add(this.components);
    app3d.add(this.classes);
    app3d.add(this.componentLabels);

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
  }

  applyHoverEffect(index: number, colorShift = 1.1): void {
    if (this.hoverIndex === index) {
      return;
    }
    if (this.hoverIndex >= 0) {
      this.resetHoverEffect();
    }

    this.components.getColorAt(index, this.previousColor);
    const color = calculateColorBrightness(this.previousColor, colorShift);
    this.components.setColorAt(index, color);
    this.components.instanceColor!.needsUpdate = true;
    this.hoverIndex = index;
  }

  resetHoverEffect(): void {
    if (this.hoverIndex < 0) {
      return;
    }

    this.components.setColorAt(this.hoverIndex, this.previousColor);
    this.components.instanceColor!.needsUpdate = true;
    this.hoverIndex = -1;
  }

  update(openComponentIds?: Set<string>): void {
    // Remove old data:
    this.openComponentIds.clear();
    this.componentData.length = 0;
    this.componentDataById.clear();
    this.classData.clear();

    openComponentIds?.forEach((id) => this.openComponentIds.add(id));

    this.init();
  }

  isComponentOpened(id: string): boolean {
    return this.openComponentIds.has(id);
  }

  getOpenedComponents(): Package[] {
    return this.componentData
      .filter((data) => this.openComponentIds.has(data.component.id))
      .map((data) => data.component);
  }

  get applicationId(): string {
    return this.app3d.data.application.id;
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
      this.classes = createInstancedMesh(this.classMaterial, counts.classes);
    }
    if (counts.packages !== this.components.count) {
      this.components = createInstancedMesh(pkgMaterial, counts.packages);
    }

    const position = new THREE.Vector3(0, 0, 0).sub(this.app3d.layout.center);
    this.components.position.copy(position);
    this.classes.position.copy(position);
    this.componentLabels.position.copy(position);

    const application = this.app3d.data.application;
    this.offset.copy(this.getLayout(application.id).center);

    for (const pkg of application.packages) {
      this.addComponentsAndChildren(pkg, true, 1);
    }

    // Send updated data to GPU with the next render
    this.components.instanceMatrix!.needsUpdate = true;
    this.components.instanceColor!.needsUpdate = true;
    this.componentLabels.instanceMatrix!.needsUpdate = true;
  }

  private addComponentsAndChildren(
    component: Package,
    visible: boolean,
    level = 1
  ): void {
    const layout = this.getLayout(component.id);

    const opened = this.openComponentIds.has(component.id);
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
    setupBoxMatrix(layout, opened, visible);
    this.components.setMatrixAt(index, tmpMatrix);

    const id = this.componentData[index].component.id;
    const labelIndex = this.app3d.data.labels.layout.get(id)?.index;

    if (labelIndex === undefined) {
      throw new Error(
        `Missing label "${this.componentData[index].component.name}"`
      );
    }

    setupLabelMatrix(layout, opened, visible);
    this.componentLabels.setMatrixAt(labelIndex, tmpMatrix);
  }

  private updateClassInstance(
    index: number,
    layout: BoxLayout,
    visible: boolean
  ): void {
    setupBoxMatrix(layout, false, visible);
    this.classes.setMatrixAt(index, tmpMatrix);
  }

  private addClass(clazz: Class, visible: boolean): void {
    const layout = this.getLayout(clazz.id);
    setupBoxMatrix(layout, false, visible);
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

function setupLabelMatrix(
  componentLayout: BoxLayout,
  opened: boolean,
  visible: boolean
) {
  if (!visible) {
    tmpMatrix.makeScale(0, 0, 0);
    return;
  }

  // TODO: why x0.5?
  tmpMatrix.makeScale(0.5 * LABEL_HEIGHT, 1.0, 0.5 * componentLayout.depth);

  const position = componentLayout.center;

  if (opened) {
    position.y += 1.5 - 0.5 * componentLayout.height;
    position.x -= 0.5 * componentLayout.width - 0.25 * LABEL_HEIGHT;
  } else {
    position.y += 0.5 * componentLayout.height;
  }

  // Fix Z-fighting
  position.y += 1e-3;

  tmpMatrix.setPosition(position);
}

function createInstancedMesh(
  material: THREE.Material,
  count: number
): THREE.InstancedMesh {
  return new THREE.InstancedMesh(boxGeometry, material, count);
}

function createLabelMesh(data: ApplicationData, colors: ApplicationColors) {
  const texture = new THREE.Texture(data.labels.texture);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.needsUpdate = true;

  const planeGeometry = new THREE.PlaneGeometry(1, 1);
  planeGeometry.rotateX(-0.5 * Math.PI);
  planeGeometry.rotateY(-0.5 * Math.PI);

  // Make label width & height available to the vertex shader:
  const shaderData = new Float32Array(
    Array.from(data.labels.layout.values())
      .map((label) => [label.width, label.bottom])
      .flat()
  );
  const attribute = new THREE.InstancedBufferAttribute(shaderData, 2, false, 1);
  attribute.needsUpdate = true;
  planeGeometry.setAttribute('labelLayoutData', attribute);

  const material = new THREE.MeshBasicMaterial({
    map: texture,
    side: THREE.FrontSide,
    transparent: true,
  });

  material.onBeforeCompile = (shader) => {
    // Modify shader to use custom UV coordinates per instance:
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <uv_pars_vertex>',
        `#include <uv_pars_vertex>
      uniform float labelHeight;
      attribute vec2 labelLayoutData;`
      )
      .replace(
        '#include <uv_vertex>',
        `#include <uv_vertex>
      float labelWidth = labelLayoutData.x;
      float labelYOffset = labelLayoutData.y;
      vec2 customUV = MAP_UV * vec2(labelWidth, labelHeight) + vec2(0.0, labelYOffset);
      vMapUv = ( mapTransform * vec3( customUV, 1 ) ).xy;`
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <map_pars_fragment>',
        `#include <map_pars_fragment>
        uniform vec3 textColor;`
      )
      .replace(
        '#include <map_fragment>',
        `float textAlpha = texture2D(map, vMapUv).r;
        vec4 sampledDiffuseColor = vec4(textColor, textAlpha * textAlpha);
        diffuseColor *= sampledDiffuseColor;        `
      );

    // TODO: Make uniforms accessible outside of this scope
    shader.uniforms['labelHeight'] = { value: data.labels.labelHeight };
    shader.uniforms['textColor'] = { value: colors.componentTextColor };
  };

  const mesh = new THREE.InstancedMesh(
    planeGeometry,
    material,
    data.labels.layout.size
  );

  // Hide all labels initially:
  tmpMatrix.makeScale(0, 0, 0);
  for (let i = 0; i < data.labels.layout.size; i++) {
    mesh.setMatrixAt(i, tmpMatrix);
  }

  return mesh;
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
