import * as THREE from 'three';
import PlaneLayout from './plane-layout';

/**
 * Rectangle which can keep track of the smallest min x- or y-Position
 * and greatest x- or y-position. Usually used for comparisons with
 * PlaneLayouts.
 */
export default class MinMaxRectangle {
  min_x: number = Number.MAX_VALUE;

  min_y: number = Number.MAX_VALUE;

  max_x: number = -Number.MAX_VALUE;

  max_y: number = -Number.MAX_VALUE;

  get width() {
    return Math.abs(this.max_x - this.min_x);
  }

  get height() {
    return Math.abs(this.max_y - this.min_y);
  }

  get center() {
    return new THREE.Vector2(
      this.min_x + (this.max_x - this.min_x) / 2.0,
      this.min_y + (this.max_y - this.min_y) / 2.0
    );
  }

  setMinValues(minX: number, minY: number) {
    this.min_x = minX;
    this.min_y = minY;
  }

  setMaxValues(maxX: number, maxY: number) {
    this.max_x = maxX;
    this.max_y = maxY;
  }

  setMinMaxFromLayout(layout: PlaneLayout) {
    if (layout.positionX < this.min_x) {
      this.min_x = layout.positionX;
    }
    if (this.max_x < layout.positionX + layout.width) {
      this.max_x = layout.positionX + layout.width;
    }
    if (layout.positionY > this.max_y) {
      this.max_y = layout.positionY;
    }
    if (this.min_y > layout.positionY - layout.height) {
      this.min_y = layout.positionY - layout.height;
    }
  }
}
