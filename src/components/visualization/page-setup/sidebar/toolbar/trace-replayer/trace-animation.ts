import BaseMesh from 'explorviz-frontend/src/view-objects/3d/base-mesh';
import * as THREE from 'three';
import { BufferGeometry } from 'three';
import { TraceNode } from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/toolbar/trace-replayer/trace-tree';
import { Application } from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import Landscape3D from 'explorviz-frontend/src/view-objects/3d/landscape/landscape-3d';

const STEPS: number = 128;

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

export class Tab {
  readonly style: string;

  active: boolean = false;

  id: string;
  label: string;
  name: string;
  caller: string;
  callee: string;
  origin: string;
  target: string;
  start: number;
  end: number;
  duration: number;

  callback: () => void;

  constructor(
    caller: TraceNode,
    callee: TraceNode,
    origin: Application | undefined,
    target: Application | undefined,
    color: THREE.Color,
    callback: () => void
  ) {
    this.id = callee.id;
    this.label = this.id.substring(0, 4);
    this.name = callee.name;
    this.caller = caller.clazz.name;
    this.callee = callee.clazz.name;
    this.origin = origin !== undefined ? origin.name : '';
    this.target = target !== undefined ? target.name : '';
    this.start = callee.start;
    this.end = callee.end;
    this.duration = this.end - this.start;
    this.style = `color: ${color.offsetHSL(0, 0, -0.25).getStyle()}`;
    this.callback = callback;
  }

  enable = () => {
    this.callback();
    this.active = true;
  };
}

export class Partition {
  readonly min: number;
  readonly max: number;
  readonly value: number;

  constructor(min: number, max: number) {
    this.min = min;
    this.max = max;
    this.value = this.min + (this.max - this.min) / 2.0;
  }

  partition(n: number): Partition[] {
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
  readonly color: THREE.Color;

  private constructor(min: number = 0.0, max: number = 1.0) {
    super(min, max);
    this.color = new THREE.Color().setHSL(this.value, 1.0, 0.5);
  }

  static get default(): ColorSpace {
    return new HueSpace();
  }

  get default(): ColorSpace {
    return HueSpace.default;
  }

  partition(n: number): ColorSpace[] {
    return super.partition(n).map((part) => new HueSpace(part.min, part.max));
  }
}

export class Arc extends THREE.Curve<THREE.Vector3> {
  start: THREE.Vector3;
  middle: THREE.Vector3;
  end: THREE.Vector3;

  constructor(start: THREE.Vector3, end: THREE.Vector3, height: number) {
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
  caller: TraceNode;
  callee: TraceNode;
  path: THREE.Curve<THREE.Vector3>;
  cursor: Sphere;
  line: THREE.Mesh;
  trail: THREE.Mesh;
  heightSpace: Partition;
  colorSpace: ColorSpace;
  alive: boolean;
  scene: THREE.Scene;
  private geometry: GeometryFactory;

  constructor(
    scene: THREE.Scene,
    geometry: GeometryFactory,
    origin: TraceNode,
    target: TraceNode,
    height: Partition,
    color: ColorSpace = HueSpace.default
  ) {
    this.scene = scene;
    this.geometry = geometry;

    const path = geometry.path(origin, target, height.value);

    const material = new THREE.LineBasicMaterial({
      color: color.color,
    });

    const line = new THREE.Mesh(
      geometry.line(path.start, path.end, 0.005, height.value),
      material
    );
    scene.add(line);

    const trail = new THREE.Mesh(
      geometry.line(path.start, path.start, 0.01, 0),
      material
    );
    scene.add(trail);

    const cursor = new Sphere(0.05, color.color);
    scene.add(cursor);

    this.caller = origin;
    this.callee = target;
    this.path = path;
    this.cursor = cursor;
    this.line = line;
    this.trail = trail;
    this.heightSpace = height;
    this.colorSpace = color;
    this.alive = true;
  }

  move(progress: number) {
    this.cursor.move(this.path.getPoint(progress));
    this.trail.geometry.copy(this.geometry.trail(this.path, progress));
  }

  afterimage() {
    this.scene.remove(this.cursor);
    this.scene.remove(this.trail);
  }

  destroy() {
    this.scene.remove(this.cursor);
    this.scene.remove(this.trail);
    this.scene.remove(this.line);
  }
}

export class GeometryFactory {
  landscape3D: Landscape3D;
  getPositionInLandscape: any;

  constructor(landscape3D: Landscape3D, getPositionInLandscape: any) {
    this.landscape3D = landscape3D;
    this.getPositionInLandscape = getPositionInLandscape;
  }

  path(origin: TraceNode, target: TraceNode, height: number) {
    const scale = this.landscape3D.scale;
    const support = this.landscape3D.position;
    const start = this.getPositionInLandscape(origin.mesh)
      .multiply(scale)
      .add(support);
    const end = this.getPositionInLandscape(target.mesh)
      .multiply(scale)
      .add(support);

    return new Arc(start, end, height);
  }

  trail(path: THREE.Curve<THREE.Vector3>, progress: number) {
    const shape = new THREE.Shape().ellipse(
      0.0,
      0.0,
      0.02,
      0.02,
      0.0,
      2.0 * Math.PI
    );

    const spline = new THREE.CurvePath<THREE.Vector3>();

    for (let i = 0; i <= progress - 1.0 / STEPS; i += 1.0 / STEPS) {
      const segment = new THREE.LineCurve3(
        path.getPoint(i),
        path.getPoint(i + 1.0 / STEPS)
      );
      spline.add(segment);
    }

    if (spline.getLength() > 0) {
      return new THREE.ExtrudeGeometry(shape, {
        steps: STEPS,
        extrudePath: spline,
      });
    }
    return new BufferGeometry();
  }

  line(
    start: THREE.Vector3,
    end: THREE.Vector3,
    radius: number,
    height: number
  ) {
    const shape = new THREE.Shape().ellipse(
      0.0,
      0.0,
      radius,
      radius,
      0.0,
      2.0 * Math.PI
    );

    const spline = new Arc(start, end, height);

    return new THREE.ExtrudeGeometry(shape, {
      steps: STEPS,
      extrudePath: spline,
    });
  }
}
