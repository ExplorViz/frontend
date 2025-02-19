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

export class PathAnimation {
  origin: TraceNode;
  target: TraceNode;
  path: Curve<Vector3>;
  mesh: Blob;
  delta: number;
  duration: number;

  constructor(
    origin: TraceNode,
    target: TraceNode,
    path: Curve<Vector3>,
    mesh: Blob,
    delta: number = 0
  ) {
    this.origin = origin;
    this.target = target;
    this.path = path;
    this.mesh = mesh;
    this.delta = delta;
    this.duration = 1 + origin.duration / 1000.0;
  }
}
