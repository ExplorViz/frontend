import {
  BoxGeometry,
  Color,
  Material,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  Object3D,
  Object3DEventMap,
  Vector3,
} from 'three';
import { Font } from 'three/examples/jsm/loaders/FontLoader';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry';
import BaseMesh from '../base-mesh';
import { DetailedInfo } from 'extended-reality/utils/vr-helpers/detail-info-composer';
import { GenericPopupData } from 'explorviz-frontend/components/visualization/rendering/popups/generic-popup';

const ExtraSpace = 2;

export default class SimpleParentMesh extends BaseMesh implements ChildMesh {
  params: SimpleParentMeshParams;
  private label?: Mesh;
  dataModel: any;
  defaultMaterial: Material;
  hoverMaterial: Material;
  popupData: GenericPopupData;

  constructor(params: SimpleParentMeshParams) {
    super();
    this.dataModel = {
      id: this.uuid,
    };
    this.params = params;
    this.geometry = new BoxGeometry(1, 1, 1);
    // random color
    let color = Math.random() * 16777215;
    color = Math.floor(color);
    this.material = new MeshLambertMaterial({ color });
    this.defaultMaterial = this.material;
    // make color lighter
    const color2 = new Color(color).offsetHSL(0.2, 0, 0.2).getHex();
    this.hoverMaterial = new MeshLambertMaterial({ color: color2 });
    this.dimensionsValue = new Vector3(1, 1, 1);
    this.popupData = params.popupData || {
      title: params.label || 'Component',
      entries: [],
      tabs: [],
    };
    if (params.group) this.registerEventListeners(params.group);
    if (params.childeren) this.add(...params.childeren);
  }

  private dimensionsValue: Vector3;
  get dimensions(): Vector3 {
    return this.dimensionsValue;
  }

  get detailInfo() {
    return null! as DetailedInfo;
  }

  override applyHoverEffect(
    colorShift?: number,
    isSource: boolean = true
  ): void {
    this.material = this.hoverMaterial;
    if (isSource) this.triggerEvent('hover-start');
  }

  override resetHoverEffect(isSource: boolean = true): void {
    this.material = this.defaultMaterial;
    if (isSource) this.triggerEvent('hover-end');
  }

  private triggerEvent(type: 'hover-start' | 'hover-end') {
    if (!this.params.group) return;
    const e = new Event(type + '-' + this.params.group);
    window.dispatchEvent(e);
  }

  getModelId(): string {
    return this.dataModel.id;
  }

  override add(...object: Object3D<Object3DEventMap>[]): this {
    if (object.length === 0) return this;

    if (object.find((obj) => !(obj as any)?.dimensions))
      throw new Error('All children must have dimensions');
    super.add(...object);

    let children = this.children as any as ChildMesh[];
    children = children.filter((child) => (child as any).isLabel !== true);
    let largestChildWidth = Math.max(
      ...children.map(
        (child) =>
          child.dimensions
            .clone()
            .applyAxisAngle(
              new Vector3(0, 1, 0),
              (child as any as Object3D).rotation.y
            ).x
      )
    );
    let largestChildDepth = Math.max(
      ...children.map(
        (child) =>
          child.dimensions
            .clone()
            .applyAxisAngle(
              new Vector3(0, 1, 0),
              (child as any as Object3D).rotation.y
            ).z
      )
    );
    // abs
    largestChildWidth = Math.abs(largestChildWidth);
    largestChildDepth = Math.abs(largestChildDepth);
    // padding
    largestChildWidth += 5;
    largestChildDepth += 5;

    const count = Math.ceil(Math.sqrt(children.length));
    const count2 = count * count;

    const ownDimWidth = largestChildWidth * count;
    const ownDimDepth = largestChildDepth * Math.ceil(children.length / count);
    this.geometry = new BoxGeometry(ownDimWidth, 1, ownDimDepth + ExtraSpace);
    this.dimensionsValue = new Vector3(
      ownDimWidth,
      1,
      ownDimDepth + ExtraSpace
    );
    this.updateLabel();

    const centerPoints = Array.from({ length: count2 }, (_, i) => i).map(
      (i) => {
        const width = i % count;
        const depth = Math.floor(i / count);
        return new Vector3(
          width * largestChildWidth,
          this.dimensions.y / 2,
          depth * largestChildDepth
        )
          .add(new Vector3(largestChildWidth / 2, 0, largestChildDepth / 2))
          .sub(
            new Vector3(ownDimWidth / 2, 0, ownDimDepth / 2 + ExtraSpace / 2)
          );
      }
    );

    children.forEach((child, i) => {
      this.updateChild(child, centerPoints[i]);
    });

    return this;
  }

  private updateChild(child: ChildMesh, centerPosition: Vector3) {
    child.position.set(
      centerPosition.x,
      centerPosition.y + child.dimensions.y / 2,
      centerPosition.z
    );
  }

  private updateLabel() {
    if (!this.params.label) return;

    const l = this.createLabelIfNotExists();
    const d = this.dimensions;
    l.position.set(0, d.y / 2 + 0.001, d.z / 2 - ExtraSpace);
  }

  private createLabelIfNotExists() {
    if (this.label) return this.label;
    const l = this.label || new Mesh();
    (l as any).isLabel = true;
    const font = this.params?.font;
    if (!font) throw new Error('no font');
    l.geometry = new TextGeometry(this.params.label!, {
      font: font,
      size: 2,
      height: 0,
      curveSegments: 12,
    }).center();
    l.material = new MeshBasicMaterial({
      color: new Color(0x000000),
    });
    l.rotateOnWorldAxis(new Vector3(1, 0, 0), -Math.PI / 2);
    this.label = l;
    super.add(l);
    return l;
  }

  private registerEventListeners(group: string) {
    window.addEventListener(`hover-start-${group}`, () => {
      this.applyHoverEffect(null!, false);
    });
    window.addEventListener(`hover-end-${group}`, () => {
      this.resetHoverEffect(false);
    });
  }
}

export interface ChildMesh {
  get dimensions(): Vector3;
  get position(): Vector3;
}

export interface SimpleParentMeshParams {
  childeren?: Object3D<Object3DEventMap>[];
  label?: string;
  font?: Font;
  popupData?: GenericPopupData;
  group?: string;
}
