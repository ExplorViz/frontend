import * as THREE from 'three';
import { IntersectableObject } from '../interfaces/intersectable-object';

export default class FloorMesh
  extends THREE.Mesh
  implements IntersectableObject
{
  constructor(
    width: number,
    length: number,
    path = 'images/materials/floor.jpg'
  ) {
    super();

    /**
     * Floor texture by
     * Author: V.Hartikainen
     * License: https://creativecommons.org/licenses/by/3.0/
     * Title: Seamless Dark Texture With Small Grid
     * Source: https://tiled-bg.blogspot.com/2014/08/seamless-dark-texture-with-small-grid.html
     */
    const floorTexture = new THREE.TextureLoader().load(path);
    floorTexture.wrapS = THREE.MirroredRepeatWrapping;
    floorTexture.wrapT = THREE.MirroredRepeatWrapping;
    floorTexture.repeat.set(width, length);

    this.geometry = new THREE.PlaneGeometry(width, length);
    this.material = new THREE.MeshLambertMaterial({
      map: floorTexture,
    });

    // Rotate floor such that it is horizontal
    this.rotateX(270 * THREE.MathUtils.DEG2RAD);
    this.receiveShadow = true;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  canBeIntersected(_intersection: THREE.Intersection) {
    return true;
  }
}
