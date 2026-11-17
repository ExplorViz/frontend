// @vitest-environment jsdom
import { PerspectiveCamera, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { applyTileProjection, fovOf, tileView } from '../src/utils/collaboration/screen-wall-projection';

// A 4:3 Tile with a diagonal of 50 cm is 40 cm wide and 30 cm high.
const tile = (name: string, x: number, y: number) => ({ name, width: 4, height: 3, diagonal: 50 / 2.54, x, y });

describe('tileView', () => {
  it('spans the bounding box of all Tiles when the Host has no Tile and offsets the Tile within it, in cm', () => {
    const tiles = [tile('left', 0, 0), tile('right', 45, 0)];
    const view = tileView(tiles, 1, -1);
    expect(view.fullWidth).toBeCloseTo(85);
    expect(view.fullHeight).toBeCloseTo(30);
    expect(view.x).toBeCloseTo(45);
    expect(view.y).toBeCloseTo(0);
    expect(view.width).toBeCloseTo(40);
    expect(view.height).toBeCloseTo(30);
  });

  it('measures offsets from the top-left of the bounding box, not from the origin', () => {
    const tiles = [tile('top', 10, 5), tile('bottom', 10, 40)];
    const view = tileView(tiles, 1, -1);
    expect(view.fullWidth).toBeCloseTo(40);
    expect(view.fullHeight).toBeCloseTo(65);
    expect(view.x).toBeCloseTo(0);
    expect(view.y).toBeCloseTo(35);
  });
});

describe('tileView with the Host as a Tile', () => {
  const tiles = [tile('left', 0, 0), tile('host', 45, 10), tile('right', 90, 0)];

  it("spans the Host's Tile, so the Host's Tile shows exactly the Host's view", () => {
    expect(tileView(tiles, 1, 1)).toEqual({ fullWidth: 40, fullHeight: 30, x: 0, y: 0, width: 40, height: 30 });
  });

  it("places the other Tiles around the Host's Tile, also left of and above it", () => {
    const left = tileView(tiles, 0, 1);
    expect(left.fullWidth).toBeCloseTo(40);
    expect(left.fullHeight).toBeCloseTo(30);
    expect(left.x).toBeCloseTo(-45);
    expect(left.y).toBeCloseTo(-10);
    expect(tileView(tiles, 2, 1).x).toBeCloseTo(45);
  });
});

describe('fovOf', () => {
  it('reads the vertical FOV in degrees from a perspective projection, whatever its aspect', () => {
    expect(fovOf(new PerspectiveCamera(75, 2, 0.1, 100).projectionMatrix.toArray())).toBeCloseTo(75);
    expect(fovOf(new PerspectiveCamera(40, 0.5, 1, 10).projectionMatrix.toArray())).toBeCloseTo(40);
  });
});

describe('applyTileProjection', () => {
  const tiles = [tile('left', 0, 0), tile('right', 45, 0)];

  /** Where a point in front of the camera lands in normalized device coordinates. */
  const ndc = (camera: PerspectiveCamera, point: Vector3) => {
    camera.updateMatrixWorld();
    return point.clone().project(camera);
  };

  it("shows the Tile its own part of the frustum the Host's FOV spans over the whole wall", () => {
    // The whole wall, seen with the Host's FOV over its height.
    const wall = new PerspectiveCamera(60, 85 / 30, 0.1, 100);
    const camera = new PerspectiveCamera(75, 16 / 9, 0.1, 100);
    applyTileProjection(camera, 60, tileView(tiles, 1, -1));

    // A point on the left edge of the right Tile, and one on the wall's right edge.
    const seam = new Vector3((2 * 45) / 85 - 1, 0.3, 0.5).unproject(wall);
    const edge = new Vector3(1, -0.4, 0.5).unproject(wall);
    expect(ndc(camera, seam).x).toBeCloseTo(-1);
    expect(ndc(camera, seam).y).toBeCloseTo(0.3);
    expect(ndc(camera, edge).x).toBeCloseTo(1);
    expect(ndc(camera, edge).y).toBeCloseTo(-0.4);
  });

  it("extends the Host's own view on the other Tiles, as extended screens do", () => {
    const withHost = [tile('host', 0, 0), tile('right', 45, 0)];
    // The Host's normal view on its 4:3 screen.
    const host = new PerspectiveCamera(60, 4 / 3, 0.1, 100);
    const hostTile = new PerspectiveCamera(75, 16 / 9, 0.1, 100);
    const right = new PerspectiveCamera(75, 16 / 9, 0.1, 100);
    applyTileProjection(hostTile, 60, tileView(withHost, 0, 0));
    applyTileProjection(right, 60, tileView(withHost, 1, 0));

    // The Host's Tile shows exactly the Host's view.
    expect(hostTile.projectionMatrix.equals(host.projectionMatrix)).toBe(true);
    // Beyond the right edge of the Host's view, by the 5 cm gap, starts the right Tile.
    const seam = new Vector3(1 + (2 * 5) / 40, 0.3, 0.5).unproject(host);
    expect(ndc(right, seam).x).toBeCloseTo(-1);
    expect(ndc(right, seam).y).toBeCloseTo(0.3);
  });

  it('undoes a resize of the canvas when applied again', () => {
    const camera = new PerspectiveCamera(60, 1, 0.1, 100);
    applyTileProjection(camera, 60, tileView(tiles, 0, -1));
    const projection = camera.projectionMatrix.clone();
    camera.aspect = 3;
    camera.updateProjectionMatrix();
    applyTileProjection(camera, 60, tileView(tiles, 0, -1));
    expect(camera.projectionMatrix.equals(projection)).toBe(true);
    expect(camera.projectionMatrixInverse.clone().multiply(camera.projectionMatrix).determinant()).toBeCloseTo(1);
  });
});
