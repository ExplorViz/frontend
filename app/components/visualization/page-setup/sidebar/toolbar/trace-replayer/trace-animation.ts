import BaseMesh from 'explorviz-frontend/view-objects/3d/base-mesh';
import * as THREE from 'three';
import { TraceNode } from 'explorviz-frontend/components/visualization/page-setup/sidebar/toolbar/trace-replayer/trace-tree';
import { Curve } from 'three/src/extras/core/Curve';
import { Vector3 } from 'three/src/math/Vector3';
import { tracked } from '@glimmer/tracking';
import { htmlSafe } from '@ember/template';
import Ember from 'ember';
import { Class } from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import SafeString = Ember.Handlebars.SafeString;

const DEFAULT_OPACITY = 1;

export class Sphere extends BaseMesh<THREE.SphereGeometry, THREE.Material> {
  constructor(
    radius: number,
    color: THREE.Color = new THREE.Color('red'),
    opacity: number = 1
  ) {
    super(color, color, opacity);
    this.highlight();
    this.geometry = new THREE.SphereGeometry(radius, 8, 8);
  }

  move(position: THREE.Vector3): void {
    this.position.copy(position);
  }
}

export class Bullet extends BaseMesh<THREE.BufferGeometry, THREE.Material> {
  constructor(
    radius: number,
    path: Curve<Vector3>,
    color: THREE.Color = new THREE.Color('red'),
    opacity: number = 1
  ) {
    super(color, color, opacity);
    this.highlight();
    const shape = new THREE.Shape().ellipse(
      0.0,
      0.0,
      radius,
      radius,
      0.0,
      2.0 * Math.PI
    );
    this.geometry = new THREE.ExtrudeGeometry(shape, {
      steps: 12,
      extrudePath: path,
    });
  }
}

export class Spline extends BaseMesh<THREE.ExtrudeGeometry, THREE.Material> {
  constructor(
    radius: number,
    path: Curve<Vector3>,
    color: THREE.Color = new THREE.Color('red'),
    opacity: number = 1
  ) {
    super(color, color, opacity);
    this.highlight();
    const shape = new THREE.Shape().ellipse(
      0.0,
      0.0,
      radius,
      radius,
      0.0,
      2.0 * Math.PI
    );
    this.geometry = new THREE.ExtrudeGeometry(shape, {
      steps: 12,
      extrudePath: path,
    });
  }
}

export default class Details {
  @tracked
  public name: string;
  @tracked
  public origin: Class | undefined;
  @tracked
  public target: Class | undefined;
  @tracked
  public originApp: string | undefined;
  @tracked
  public targetApp: string | undefined;
  @tracked
  public start: number;
  @tracked
  public end: number;

  constructor(
    name: string,
    origin: Class | undefined,
    target: Class | undefined,
    originApp: string | undefined,
    targetApp: string | undefined,
    start: number,
    end: number
  ) {
    this.name = name;
    this.origin = origin;
    this.target = target;
    this.originApp = originApp;
    this.targetApp = targetApp;
    this.start = start;
    this.end = end;
  }
}

export class Tab {
  public readonly label: string;
  public readonly callback: () => void;
  public readonly style: SafeString;

  @tracked
  public __active: boolean;

  @tracked
  public __alive: boolean[];

  @tracked
  public details: Details;

  get active() {
    return this.__active;
  }

  set active(value) {
    this.__active = value;
  }

  get alive() {
    return this.__alive[0];
  }

  set alive(value) {
    this.__alive = [value];
  }

  constructor(
    label: string,
    callback: () => void,
    color: THREE.Color,
    details: Details
  ) {
    this.label = label;
    this.callback = () => {
      callback();
      this.active = true;
    };
    this.details = Details;
    this.style = htmlSafe(`color: ${color.offsetHSL(0, 0, -0.25).getStyle()}`);
    this.__active = false;
    this.__alive = [true];
  }
}

export class Partition {
  public readonly min: number;
  public readonly max: number;
  public readonly value: number;

  public constructor(min: number, max: number) {
    this.min = min;
    this.max = max;
    this.value = this.min + (this.max - this.min) / 2.0;
  }

  public partition(n: number): Partition[] {
    if (n < 1) {
      return [this];
    }

    const partitions = [];
    const offset = (this.max - this.min) / n;

    for (let i = 0; i < n; ++i) {
      partitions.push(
        new Partition(this.min + i * offset, this.min + (i + 1) * offset)
      );
    }

    return partitions;
  }
}

export interface ColorSpace extends Partition {
  get color(): THREE.Color;

  get default(): ColorSpace;

  partition(n: number): ColorSpace[];
}

export class HueSpace extends Partition implements ColorSpace {
  public readonly color: THREE.Color;

  private constructor(min: number = 0.0, max: number = 1.0) {
    super(min, max);
    this.color = new THREE.Color().setHSL(this.value, 1.0, 0.5);
  }

  public static get default(): ColorSpace {
    return new HueSpace();
  }

  public get default(): ColorSpace {
    return HueSpace.default;
  }

  public partition(n: number): ColorSpace[] {
    return super.partition(n).map((part) => new HueSpace(part.min, part.max));
  }
}

export class Afterimage {
  private mesh: BaseMesh;

  private opacity: number = DEFAULT_OPACITY;

  constructor(mesh: BaseMesh) {
    this.mesh = mesh;
    this.mesh.highlight();
    this.mesh.turnTransparent(this.opacity);
  }

  delete() {
    this.mesh.turnOpaque();
    this.mesh.unhighlight();
    this.opacity = -1;
  }

  tick(): void {
    if (this.opacity >= 0.3) {
      this.mesh.show();
      this.mesh.highlight();
      this.mesh.turnTransparent(this.opacity);
    } else {
      this.mesh.hide();
      this.mesh.unhighlight();
    }
    this.opacity -= 0.01;
  }

  alive(): boolean {
    return this.opacity > 0;
  }

  reset() {
    this.opacity = DEFAULT_OPACITY;
    this.mesh.highlight();
    this.mesh.turnTransparent(this.opacity);
  }
}

export class Arc extends THREE.Curve<Vector3> {
  start: Vector3;
  middle: Vector3;
  end: Vector3;

  constructor(start: Vector3, end: Vector3, height: number) {
    super();
    this.start = start;
    this.end = end;
    this.middle = new THREE.Vector3(
      start.x + (end.x - start.x) / 2.0,
      height + start.y + (end.y - start.y) / 2.0,
      start.z + (end.z - start.z) / 2.0
    );
  }

  getPoint(t: number) {
    return new THREE.QuadraticBezierCurve3(
      this.start,
      this.middle,
      this.end
    ).getPoint(t);
  }
}

export class AnimationEntity {
  origin: TraceNode;
  target: TraceNode;
  path: Curve<Vector3>;
  mesh: Sphere;
  line: THREE.Mesh[];
  trail: THREE.Mesh;
  tab: Tab;
  height: Partition;
  color: ColorSpace;
  alive: boolean;

  constructor(
    origin: TraceNode,
    target: TraceNode,
    path: Curve<Vector3>,
    mesh: Sphere,
    line: THREE.Mesh[],
    trail: THREE.Mesh,
    tab: [Tab],
    height: Partition,
    color: ColorSpace = HueSpace.default
  ) {
    this.origin = origin;
    this.target = target;
    this.path = path;
    this.mesh = mesh;
    this.line = line;
    this.trail = trail;
    this.tab = tab[0];
    this.height = height;
    this.color = color;
    this.alive = true;
  }

  prune(n: number): THREE.Mesh[] {
    if (this.line.length > n) {
      const slice = this.line.slice(0, n);
      this.line = this.line.slice(n);
      return slice;
    }
    return [];
  }
}
