import BaseMesh from 'explorviz-frontend/view-objects/3d/base-mesh';
import * as THREE from 'three';
import { TraceNode } from 'explorviz-frontend/components/visualization/page-setup/sidebar/toolbar/trace-replayer/trace-tree';
import { Curve } from 'three/src/extras/core/Curve';
import { Vector3 } from 'three/src/math/Vector3';

const DEFAULT_OPACITY = 1;

export class Blob extends BaseMesh<THREE.SphereGeometry, THREE.Material> {
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

  constructor(start: Vector3, end: Vector3) {
    super();
    this.start = start;
    this.end = end;
    this.middle = new THREE.Vector3(
      start.x + (end.x - start.x) / 2.0,
      1 + start.y + (end.y - start.y) / 2.0,
      start.z + (end.z - start.z) / 2.0
    );
  }

  getPoint(t: number) {
    return new THREE.QuadraticBezierCurve3(this.start, this.middle, this.end).getPoint(t);
  }
}

export class PathAnimation {
  origin: TraceNode;
  target: TraceNode;
  path: Curve<Vector3>;
  mesh: Blob;
  delta: number;
  line: THREE.Mesh[];
  trail: THREE.Mesh;
  duration: number;

  constructor(
    origin: TraceNode,
    target: TraceNode,
    path: Curve<Vector3>,
    mesh: Blob,
    line: THREE.Mesh[],
    trail: THREE.Mesh,
    delta: number = 0
  ) {
    this.origin = origin;
    this.target = target;
    this.path = path;
    this.mesh = mesh;
    this.delta = delta;
    this.trail = trail;
    this.line = line;
    this.duration = 1 + origin.duration / 1000.0;
  }

  prune(n: number): THREE.Mesh[] {
    if (this.line.length > n) {
      const slice = this.line.slice( 0, n);
      this.line = this.line.slice( n);
      return slice;
    }
    return []
  }
}
