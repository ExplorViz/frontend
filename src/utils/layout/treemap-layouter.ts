import { getUnfilteredLandscape } from 'explorviz-frontend/src/utils/city-rendering/filtered-landscapes';
import { City, District, FlatLandscape } from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import BoxLayout from 'explorviz-frontend/src/utils/layout/box-layout';
import {
  BuildingSizing,
  getBuildingFootprint,
  getCustomBuildingLayoutCitySize,
  getMinimumCitySize,
  getPaddingForLabelPlacement,
  getVisualizationSettings,
  hasVisibleBuildingsRecursively,
  Padding,
  usesCustomBuildingLayout,
} from 'explorviz-frontend/src/utils/layout/layout-dimensions';
import { LANDSCAPE_ID, type LayoutNode, toBoxLayouts } from 'explorviz-frontend/src/utils/layout/layout-tree';
import { getCachedBuildingMetricBounds } from 'explorviz-frontend/src/utils/settings/building-metrics';
import { VisualizationSettings } from 'explorviz-frontend/src/utils/settings/settings-schemas';

/**
 * Squarified treemap (Bruls, Huizing, van Wijk, 2000): divides the landscape
 * into tiles for the Cities, and each City into tiles for its Districts, such
 * that the area of a tile reflects the room its contents need and the tiles
 * come as close to the preferred aspect ratio as possible.
 *
 * It differs from a textbook treemap in two ways, as entities have sizes that
 * must not be undercut (Buildings, margins, labels):
 *
 * - Buildings keep the footprint they have with every layout engine. The
 *   Buildings directly inside a District share one tile, in which they are
 *   lined up in rows.
 * - A tile is only a target: entities that need more room than their tile
 *   offers get it, and the tiles after them move on. A tile that would be a
 *   thin sliver (e.g. of a tiny District next to a huge one) is not filled but
 *   leaves ground of its parent visible. Entities therefore never overlap.
 *   Room that is left over within a container is spread among its contents.
 *
 * The layout is a pure function of the landscape and the settings. Sizes order
 * the tiles, so entities may move when the landscape changes.
 */

/** How much longer than preferred a tile may get, in either direction. */
const MAX_STRETCH = 3;

/** Tolerance for comparing sizes, which are sums of floating point sizes. */
const EPSILON = 1e-6;

type Size = { width: number; depth: number };

/** The places of entities within a container, relative to its content area. */
type Arrangement = Size & { children: LayoutNode[] };

/** Arranges the contents of an entity compactly, in about the shape of the given content area. */
type Arranger = (target: Size) => Arrangement;

/** An entity (or the Buildings of a District) to which a treemap assigns a tile. */
type Tile = {
  id: string;
  /** The room the tile takes when it has the preferred aspect ratio. */
  natural: Size;
  /** Brings the tile into about the given shape; the result may be larger or smaller. */
  shape: (target: Size) => LayoutNode;
  /** Whether the tile may be enlarged afterwards, as its contents can be spread. */
  isFlexible: boolean;
  /** Whether the tile's children take its place, as it only groups them. */
  isGroup: boolean;
};

type LayoutContext = {
  landscape: FlatLandscape;
  removedDistrictIds: Set<string>;
  vs: VisualizationSettings;
  buildingSizing: BuildingSizing;
  cityPadding: Padding;
  districtPadding: Padding;
  /** Preferred aspect ratio (width / depth). */
  aspectRatio: number;
};

function compareIds(a: { id: string }, b: { id: string }): number {
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

function getExtent(nodes: LayoutNode[]): Size {
  let width = 0;
  let depth = 0;
  for (const node of nodes) {
    width = Math.max(width, node.x + node.width);
    depth = Math.max(depth, node.z + node.depth);
  }
  return { width, depth };
}

/** The room an entity takes including the spacing to its right and below. */
function getSpacedArea({ width, depth }: Size, spacing: number): number {
  return (width + spacing) * (depth + spacing);
}

/** How far a shape is from the preferred aspect ratio; 1 is a perfect match. */
function getStretch(width: number, depth: number, aspectRatio: number): number {
  const ratio = width / depth / aspectRatio;
  return Math.max(ratio, 1 / ratio);
}

function withAspectRatio(area: number, aspectRatio: number): Size {
  const width = Math.sqrt(area * aspectRatio);
  return { width, depth: width > 0 ? area / width : 0 };
}

/**
 * The content area to aim for when an entity is given a target: the area its
 * contents need, in the shape of the target but not stretched beyond the
 * limit. Both the area and the result include the spacing.
 */
function getContentTarget(target: Size, area: number, spacing: number, aspectRatio: number): Size {
  const width = Math.max(target.width, 0) + spacing;
  const depth = Math.max(target.depth, 0) + spacing;
  const ratio = width > 0 && depth > 0 ? width / depth : aspectRatio;
  return withAspectRatio(area, Math.min(aspectRatio * MAX_STRETCH, Math.max(aspectRatio / MAX_STRETCH, ratio)));
}

/**
 * Spreads the contents of a container, which take up the area `from`, over the
 * area `to`: containers grow, Buildings move to the middle of their share.
 * Scaling places and sizes alike (including spacing) keeps everything apart.
 */
function spread(children: LayoutNode[], from: Size, to: Size, spacing: number): void {
  const factorX = Math.max(1, (to.width + spacing) / (from.width + spacing)) || 1;
  const factorZ = Math.max(1, (to.depth + spacing) / (from.depth + spacing)) || 1;
  for (const child of children) {
    const width = (child.width + spacing) * factorX - spacing;
    const depth = (child.depth + spacing) * factorZ - spacing;
    child.x *= factorX;
    child.z *= factorZ;
    if (child.isBuilding) {
      child.x += (width - child.width) / 2;
      child.z += (depth - child.depth) / 2;
    } else {
      child.width = width;
      child.depth = depth;
    }
  }
}

/** Where the rows of at most the given width put the footprints, without creating them. */
function forEachInRows(
  sizes: Size[],
  maxWidth: number,
  spacing: number,
  place: (index: number, x: number, z: number) => void
): Size {
  let x = 0;
  let z = 0;
  let rowDepth = 0;
  let width = 0;
  for (let index = 0; index < sizes.length; index++) {
    const size = sizes[index];
    if (x > 0 && x + size.width > maxWidth + EPSILON) {
      x = 0;
      z += rowDepth + spacing;
      rowDepth = 0;
    }
    place(index, x, z);
    width = Math.max(width, x + size.width);
    rowDepth = Math.max(rowDepth, size.depth);
    x += size.width + spacing;
  }
  return { width, depth: z + rowDepth };
}

/**
 * Lines Buildings up in rows. As Buildings have fixed footprints, several row
 * widths around the target are tried and the one that exceeds the target least
 * is taken (of several that fit, the most compact one).
 */
function createBuildingArranger(buildings: LayoutNode[], area: number, spacing: number, aspectRatio: number): Arranger {
  const ordered = [...buildings].sort((a, b) => b.depth - a.depth || b.width - a.width || compareIds(a, b));
  const widest = ordered.reduce((width, building) => Math.max(width, building.width), 0);

  return (target) => {
    const { width, depth } = getContentTarget(target, area, spacing, aspectRatio);
    const targetWidth = Math.max(width - spacing, EPSILON);
    const targetDepth = Math.max(depth - spacing, EPSILON);

    const rowWidths = new Set([Math.max(targetWidth, widest)]);
    let rowWidth = -spacing;
    for (const building of ordered) {
      rowWidth += building.width + spacing;
      if (rowWidth > 2 * targetWidth) break;
      if (rowWidth >= targetWidth / 2) rowWidths.add(Math.max(rowWidth, widest));
    }

    let bestWidth = 0;
    let bestExcess = Infinity;
    let bestArea = Infinity;
    for (const candidate of rowWidths) {
      const size = forEachInRows(ordered, candidate, spacing, () => {});
      const excess = Math.max(size.width / targetWidth, 1) * Math.max(size.depth / targetDepth, 1);
      const candidateArea = size.width * size.depth;
      if (excess < bestExcess - EPSILON || (excess < bestExcess + EPSILON && candidateArea < bestArea - EPSILON)) {
        bestWidth = candidate;
        bestExcess = excess;
        bestArea = candidateArea;
      }
    }
    const children: LayoutNode[] = [];
    const size = forEachInRows(ordered, bestWidth, spacing, (index, x, z) => {
      children.push({ ...ordered[index], x, z });
    });
    return { children, ...size };
  };
}

/**
 * The tiles of the next strip: as many as can be added before the most
 * stretched one gets worse. `length` is the extent of the strip.
 */
function takeStrip(
  areas: number[],
  start: number,
  length: number,
  getTileStretch: (along: number, across: number) => number
): number {
  let stripArea = 0;
  let smallest = Infinity;
  let largest = 0;
  let worst = Infinity;
  let end = start;
  for (; end < areas.length; end++) {
    stripArea += areas[end];
    smallest = Math.min(smallest, areas[end]);
    largest = Math.max(largest, areas[end]);
    const across = stripArea / length;
    const next = Math.max(getTileStretch(smallest / across, across), getTileStretch(largest / across, across));
    if (end > start && next > worst) break;
    worst = next;
  }
  return end;
}

/**
 * Divides an area into tiles: strips of tiles are cut off along its shorter
 * side, biggest tiles first.
 */
function createTreemapArranger(tiles: Tile[], area: number, spacing: number, aspectRatio: number): Arranger {
  const ordered = [...tiles].sort(
    (a, b) => getSpacedArea(b.natural, spacing) - getSpacedArea(a.natural, spacing) || compareIds(a, b)
  );

  const areas = ordered.map((tile) => getSpacedArea(tile.natural, spacing));
  const sumAreas = (start: number, end?: number) =>
    areas.slice(start, end).reduce((sum, tileArea) => sum + tileArea, 0);

  return (target) => {
    const content = getContentTarget(target, area, spacing, aspectRatio);

    // All sizes below include the spacing to the right and below
    const children: LayoutNode[] = [];
    let { width, depth } = content;
    let originX = 0;
    let originZ = 0;

    for (let start = 0; start < ordered.length;) {
      // A strip runs down the left of a wide area, and along the top of a deep one
      const runsDown = width >= depth * aspectRatio;
      const length = runsDown ? depth : width;
      const end = takeStrip(areas, start, length, (along, across) =>
        runsDown ? getStretch(across, along, aspectRatio) : getStretch(along, across, aspectRatio)
      );
      const thickness = sumAreas(start, end) / length;

      const strip: { tile: Tile; node: LayoutNode }[] = [];
      let along = 0;
      let across = 0;
      for (let i = start; i < end; i++) {
        const tileLength = areas[i] / thickness;
        const tile = ordered[i];
        const node = tile.shape({
          width: (runsDown ? thickness : tileLength) - spacing,
          depth: (runsDown ? tileLength : thickness) - spacing,
        });
        node.x = originX + (runsDown ? 0 : along);
        node.z = originZ + (runsDown ? along : 0);
        along += (runsDown ? node.depth : node.width) + spacing;
        across = Math.max(across, (runsDown ? node.width : node.depth) + spacing);
        strip.push({ tile, node });
      }
      lineUp(strip, along, Math.max(along, length), across, runsDown, spacing, aspectRatio);
      children.push(...strip.map(({ node }) => node));

      const remainingArea = sumAreas(end);
      if (runsDown) {
        originX += across;
        depth = Math.max(depth, along);
        width = remainingArea / depth;
      } else {
        originZ += across;
        width = Math.max(width, along);
        depth = remainingArea / width;
      }
      start = end;
    }

    const extent = getExtent(children);
    const ungrouped = children.flatMap((node, index) => {
      if (!ordered[index].isGroup) return [node];
      spread(node.children, getExtent(node.children), node, spacing);
      return node.children.map((child) => ({ ...child, x: node.x + child.x, z: node.z + child.z }));
    });
    return { children: ungrouped, ...extent };
  };
}

/**
 * Lets the tiles of a strip take up its full thickness and share the room that
 * is left along it, unless that would stretch them beyond the limit.
 */
function lineUp(
  strip: { tile: Tile; node: LayoutNode }[],
  usedLength: number,
  length: number,
  thickness: number,
  runsDown: boolean,
  spacing: number,
  aspectRatio: number
): void {
  const factor = usedLength > 0 ? length / usedLength : 1;
  const canGrow = ({ tile }: { tile: Tile }, along: number, across: number) =>
    tile.isFlexible && getStretch(runsDown ? across : along, runsDown ? along : across, aspectRatio) <= MAX_STRETCH;

  for (const entry of strip) {
    const { node } = entry;
    const across = thickness - spacing;
    const along = runsDown ? node.depth : node.width;
    if (canGrow(entry, along, across)) {
      if (runsDown) node.width = across;
      else node.depth = across;
    }
  }

  const grown = strip.map((entry) => {
    const along = ((runsDown ? entry.node.depth : entry.node.width) + spacing) * factor - spacing;
    return canGrow(entry, along, runsDown ? entry.node.width : entry.node.depth) ? along : undefined;
  });
  // A strip is spread as a whole or not at all, so that it leaves one coherent gap
  if (grown.some((along) => along === undefined)) return;
  const origin = runsDown ? strip[0].node.z : strip[0].node.x;
  strip.forEach(({ node }, index) => {
    if (runsDown) {
      node.z = origin + (node.z - origin) * factor;
      node.depth = grown[index]!;
    } else {
      node.x = origin + (node.x - origin) * factor;
      node.width = grown[index]!;
    }
  });
}

/** A tile for a container whose contents are arranged by the given arranger. */
function createContainerTile(
  id: string,
  arrange: Arranger,
  padding: Padding,
  minimumSize: Size = { width: 0, depth: 0 }
): Tile {
  const paddingX = padding.left + padding.right;
  const paddingZ = padding.top + padding.bottom;

  const shape = (target: Size): LayoutNode => {
    const content = arrange({ width: target.width - paddingX, depth: target.depth - paddingZ });
    return {
      id,
      isBuilding: false,
      width: Math.max(content.width + paddingX, minimumSize.width),
      depth: Math.max(content.depth + paddingZ, minimumSize.depth),
      x: 0,
      z: 0,
      children: content.children,
    };
  };

  const { width, depth } = shape({ width: 0, depth: 0 });
  return { id, natural: { width, depth }, shape, isFlexible: true, isGroup: false };
}

/** A tile of a fixed size. */
function createFixedTile(id: string, size: Size): Tile {
  return {
    id,
    natural: size,
    shape: () => ({ id, isBuilding: false, ...size, x: 0, z: 0, children: [] }),
    isFlexible: false,
    isGroup: false,
  };
}

function getBuildingNodes(context: LayoutContext, buildingIds: string[]): LayoutNode[] {
  const nodes: LayoutNode[] = [];
  for (const buildingId of buildingIds) {
    const building = context.landscape.buildings[buildingId];
    if (!building) continue;
    const footprint = getBuildingFootprint(building, context.buildingSizing);
    nodes.push({ id: building.id, isBuilding: true, ...footprint, x: 0, z: 0, children: [] });
  }
  return nodes;
}

function getDistrictTiles(context: LayoutContext, districtIds: string[]): Tile[] {
  const tiles: Tile[] = [];
  for (const districtId of districtIds) {
    if (context.removedDistrictIds.has(districtId)) continue;
    const district: District | undefined = context.landscape.districts[districtId];
    if (!district || !hasVisibleBuildingsRecursively(context.landscape, district, context.removedDistrictIds)) continue;
    const arrange = createContentsArranger(context, district)!;
    tiles.push(createContainerTile(districtId, arrange, context.districtPadding));
  }
  return tiles;
}

/** Arranges the Buildings and Districts directly inside a City or District; undefined if there are none. */
function createContentsArranger(context: LayoutContext, container: City | District): Arranger | undefined {
  const { aspectRatio } = context;
  const spacing = context.vs.buildingMargin.value;
  const sumAreas = (sizes: Size[]) => sizes.reduce((sum, size) => sum + getSpacedArea(size, spacing), 0);

  const buildings = getBuildingNodes(context, container.buildingIds);
  const arrangeBuildings =
    buildings.length > 0 ? createBuildingArranger(buildings, sumAreas(buildings), spacing, aspectRatio) : undefined;
  const tiles = getDistrictTiles(context, container.districtIds);
  if (tiles.length === 0) return arrangeBuildings;

  if (arrangeBuildings) {
    const shape = (target: Size): LayoutNode => ({
      id: container.id,
      isBuilding: false,
      x: 0,
      z: 0,
      ...arrangeBuildings(target),
    });
    const { width, depth } = shape({ width: 0, depth: 0 });
    tiles.push({ id: container.id, natural: { width, depth }, shape, isFlexible: true, isGroup: true });
  }
  return createTreemapArranger(tiles, sumAreas(tiles.map((tile) => tile.natural)), spacing, aspectRatio);
}

function createCityTile(context: LayoutContext, city: City): Tile {
  const { landscape, vs } = context;
  if (usesCustomBuildingLayout(vs)) {
    // The circle or spiral layout places the Buildings afterwards
    return createFixedTile(city.id, getCustomBuildingLayoutCitySize(landscape, city, vs));
  }
  const minimumSize = getMinimumCitySize(city, vs);
  const minimum = { width: minimumSize.width, depth: minimumSize.height };
  const arrange = createContentsArranger(context, city);
  // An empty City may have a geometry that must not be distorted
  return arrange
    ? createContainerTile(city.id, arrange, context.cityPadding, minimum)
    : createFixedTile(city.id, minimum);
}

/** Spreads the contents of every container over the room it got, and moves them inside its padding. */
function placeContents(context: LayoutContext, node: LayoutNode, level: number): void {
  if (node.children.length === 0) return;
  const padding = level <= 1 ? context.cityPadding : context.districtPadding;
  const spacing = (level === 0 ? context.vs.cityMargin : context.vs.buildingMargin).value;
  const area = {
    width: node.width - padding.left - padding.right,
    depth: node.depth - padding.top - padding.bottom,
  };
  spread(node.children, getExtent(node.children), area, spacing);
  for (const child of node.children) {
    child.x += padding.left;
    child.z += padding.top;
    placeContents(context, child, level + 1);
  }
}

export default function layoutLandscapeWithTreemap(
  landscape: FlatLandscape,
  removedDistrictIds: Set<string>
): Map<string, BoxLayout> {
  const vs = getVisualizationSettings();
  const labelPlacement = vs.districtLabelPlacement.value;
  // Sizes come from the unfiltered landscape, so a filter does not resize what it keeps
  const { buildings } = getUnfilteredLandscape(landscape);
  const context: LayoutContext = {
    landscape,
    removedDistrictIds,
    vs,
    buildingSizing: {
      vs,
      widthBounds: getCachedBuildingMetricBounds(buildings, vs.buildingWidthMetric.value),
      depthBounds: getCachedBuildingMetricBounds(buildings, vs.buildingDepthMetric.value),
    },
    cityPadding: getPaddingForLabelPlacement(labelPlacement, vs.cityLabelMargin.value, vs.cityPadding.value),
    districtPadding: getPaddingForLabelPlacement(
      labelPlacement,
      vs.districtLabelMargin.value,
      vs.districtPadding.value
    ),
    aspectRatio: vs.cityAspectRatio.value,
  };

  const spacing = vs.cityMargin.value;
  const cityTiles = Object.values(landscape.cities).map((city) => createCityTile(context, city));
  const area = cityTiles.reduce((sum, tile) => sum + getSpacedArea(tile.natural, spacing), 0);
  const arrange = createTreemapArranger(cityTiles, area, spacing, context.aspectRatio);
  // Same outer padding as the ELK layout uses for the landscape
  const landscapeTile = createContainerTile(LANDSCAPE_ID, arrange, context.cityPadding);
  const landscapeNode = landscapeTile.shape({ width: 0, depth: 0 });
  placeContents(context, landscapeNode, 0);
  return toBoxLayouts(landscapeNode, landscape, vs);
}
