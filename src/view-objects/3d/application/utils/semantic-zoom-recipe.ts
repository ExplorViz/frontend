import * as THREE from 'three';
import { Mesh } from 'three';

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
