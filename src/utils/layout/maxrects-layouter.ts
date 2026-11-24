import { getSharedArrangements, layoutArrangementChanged } from 'explorviz-frontend/src/utils/collaboration/layout';
import { City, District, FlatLandscape } from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import { getUnfilteredLandscape } from 'explorviz-frontend/src/utils/city-rendering/filtered-landscapes';
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
import {
  type Arrangements,
  getOwnArrangements,
  resetMaxRectsLayout,
  type Slot,
} from 'explorviz-frontend/src/utils/layout/stable-arrangement';
import { getCachedBuildingMetricBounds } from 'explorviz-frontend/src/utils/settings/building-metrics';
import { VisualizationSettings } from 'explorviz-frontend/src/utils/settings/settings-schemas';
import { IRectangleInput, MaxRectsBin, PACKING_LOGIC, Rectangle } from 'maxrects-packer';

/**
 * Stable layout: arranges the landscape by packing rectangles with
 * maxrects-packer, bottom-up from Buildings to Districts, Cities and the
 * landscape.
 *
 * Unlike the ELK layout, which is recomputed from scratch for every change of
 * the landscape, every container (the landscape, a City or a District)
 * remembers where it put each of its children. When the landscape changes
 * (another Timestamp or Commit), a child keeps its place, a new child
 * is put into free space as far to the top left as possible, and a child that
 * is gone leaves its place reserved, so that it comes back to the same spot.
 * A child that outgrew its place grows where it is; if a sibling is in the
 * way, a strip of room is inserted to its right and/or below it, which shifts
 * the siblings beyond the strip but keeps everyone next to their neighbours.
 * Containers therefore only grow, and switching back to an earlier state shows
 * the same picture again.
 *
 * Only plain geometry is remembered (the places and the packing width); the
 * free space is derived from the places whenever new children are added.
 *
 * Filters are a view on the data, not a change of it: the places are always
 * made from the landscape before any filter, and a filtered landscape is shown
 * with the room of the filtered entities closed up, without changing them.
 *
 * The remembered arrangement is discarded, and the landscape packed afresh,
 * when the user asks for it (`useLayoutStore.recomputeLayout`), when a setting
 * that changes sizes or spacing is changed, and when the visualization session
 * is reset.
 */

/** Packing area that never runs out in the direction the containers grow (z). */
const UNBOUNDED = 1e9;

/** Tolerance for comparing positions, which are sums of floating point sizes. */
const EPSILON = 1e-6;

type Footprint = { id: string; width: number; depth: number };

/** The places a layout works with, and where it notes the containers whose places it changed. */
type ArrangementTarget = { arrangements: Arrangements; changed: Set<string> };

/** Arranges the children of a container: their places and the size of its content area. */
type Arranger = (
  containerId: string,
  children: Footprint[],
  spacing: number,
  aspectRatio: number
) => { slots: Map<string, Slot>; width: number; depth: number };

type LayoutContext = {
  arrange: Arranger;
  landscape: FlatLandscape;
  removedDistrictIds: Set<string>;
  vs: VisualizationSettings;
  buildingSizing: BuildingSizing;
  cityPadding: Padding;
  districtPadding: Padding;
};

/** Re-exported for tests and callers that only know the layouter. */
export { resetMaxRectsLayout };

/** Content width a container aims for when packing the given area with the given aspect ratio (width / depth). */
function getTargetWidth(area: number, widestChild: number, aspectRatio: number): number {
  return Math.max(widestChild, Math.sqrt(area * aspectRatio));
}

function getPackedArea(footprints: Iterable<{ width: number; depth: number }>, spacing: number): number {
  let area = 0;
  for (const { width, depth } of footprints) {
    area += (width + spacing) * (depth + spacing);
  }
  return area;
}

/** The area a place blocks: the place plus the spacing to its right and below. */
function getOccupiedArea(slot: Slot, spacing: number): Rectangle {
  return new Rectangle(slot.width + spacing, slot.depth + spacing, slot.x, slot.z);
}

/**
 * Removes an area from a list of maximal free rectangles, the way maxrects
 * does when it places a rectangle: every free rectangle that overlaps the area
 * is split into the parts around it, and parts lying within others are dropped.
 */
function occupy(freeRects: Rectangle[], area: Rectangle): Rectangle[] {
  const split: Rectangle[] = [];
  for (const free of freeRects) {
    if (!free.collide(area)) {
      split.push(free);
      continue;
    }
    const freeRight = free.x + free.width;
    const freeBottom = free.y + free.height;
    const areaRight = area.x + area.width;
    const areaBottom = area.y + area.height;
    if (area.y > free.y) split.push(new Rectangle(free.width, area.y - free.y, free.x, free.y));
    if (areaBottom < freeBottom) split.push(new Rectangle(free.width, freeBottom - areaBottom, free.x, areaBottom));
    if (area.x > free.x) split.push(new Rectangle(area.x - free.x, free.height, free.x, free.y));
    if (areaRight < freeRight) split.push(new Rectangle(freeRight - areaRight, free.height, areaRight, free.y));
  }
  // Keep the first of identical rectangles and drop those within others
  return split.filter(
    (rect, index) =>
      !split.some(
        (other, otherIndex) =>
          otherIndex !== index && other.contain(rect) && (!rect.contain(other) || otherIndex < index)
      )
  );
}

/** The free space of a container of the given width, which is unbounded downwards. */
function getFreeSpace(slots: Iterable<Slot>, width: number, spacing: number): Rectangle[] {
  let freeRects = [new Rectangle(width + spacing, UNBOUNDED, 0, 0)];
  for (const slot of slots) {
    freeRects = occupy(freeRects, getOccupiedArea(slot, spacing));
  }
  return freeRects;
}

/** The extent of all places of a container, i.e. the size of its content area. */
function getExtent(slots: Iterable<Slot>): { width: number; depth: number } {
  let width = 0;
  let depth = 0;
  for (const slot of slots) {
    width = Math.max(width, slot.x + slot.width);
    depth = Math.max(depth, slot.z + slot.depth);
  }
  return { width, depth };
}

/** Biggest first gives the densest packing; the id makes the order deterministic. */
function compareForPacking(a: Footprint, b: Footprint): number {
  return (
    Math.max(b.width, b.depth) - Math.max(a.width, a.depth) ||
    b.width * b.depth - a.width * a.depth ||
    (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
  );
}

function toSlot(rect: IRectangleInput | undefined, child: Footprint): Slot {
  if (!rect) {
    throw new Error(`Could not find a place for ${child.id} in the stable layout.`);
  }
  return { x: rect.x ?? 0, z: rect.y ?? 0, width: rect.width, depth: rect.height };
}

/** Packs children densely into a container of the given width. */
function packAfresh(children: Footprint[], width: number, spacing: number): Map<string, Slot> {
  const bin = new MaxRectsBin(width, UNBOUNDED, spacing, {
    smart: true,
    pot: false,
    square: false,
    allowRotation: false,
    border: 0,
    logic: PACKING_LOGIC.MAX_AREA,
  });
  const slots = new Map<string, Slot>();
  for (const child of [...children].sort(compareForPacking)) {
    slots.set(child.id, toSlot(bin.add(new Rectangle(child.width, child.depth)), child));
  }
  return slots;
}

/**
 * Puts children into the free space between the existing places, as far to
 * the top left as possible, so that the container grows as little as possible.
 */
function placeIntoFreeSpace(slots: Map<string, Slot>, children: Footprint[], width: number, spacing: number): void {
  const bin = new MaxRectsBin(width, UNBOUNDED, spacing, {
    smart: false,
    pot: false,
    square: false,
    allowRotation: false,
    border: 0,
    logic: PACKING_LOGIC.FILL_WIDTH,
  });
  bin.freeRects = getFreeSpace(slots.values(), width, spacing);
  for (const child of [...children].sort(compareForPacking)) {
    slots.set(child.id, toSlot(bin.add(new Rectangle(child.width, child.depth)), child));
  }
}

/** Whether a place overlaps (including spacing) any other place of the container. */
function collidesWithOthers(slots: Map<string, Slot>, childId: string, slot: Slot, spacing: number): boolean {
  const occupied = getOccupiedArea(slot, spacing);
  // Places that merely touch do not collide
  const area = new Rectangle(
    occupied.width - 2 * EPSILON,
    occupied.height - 2 * EPSILON,
    occupied.x + EPSILON,
    occupied.y + EPSILON
  );
  for (const [otherId, other] of slots) {
    if (otherId !== childId && area.collide(getOccupiedArea(other, spacing))) {
      return true;
    }
  }
  return false;
}

/**
 * Moves every place that lies entirely beyond a line by the given distance,
 * which inserts a strip of free space along the line. As places are only moved
 * away from places on the other side of the line, no overlaps arise.
 */
function insertStrip(slots: Map<string, Slot>, axis: 'x' | 'z', line: number, distance: number): Map<string, Slot> {
  const moved = new Map<string, Slot>();
  for (const [id, slot] of slots) {
    moved.set(id, slot[axis] >= line - EPSILON ? { ...slot, [axis]: slot[axis] + distance } : slot);
  }
  return moved;
}

/**
 * Lets a child grow at its place. If another place is in the way, room is made
 * by inserting strips to the right of and/or below the child, which moves the
 * places beyond them but keeps every child next to its neighbours. Of the
 * options that work, the one enlarging the container least is taken.
 */
function growSlot(
  slots: Map<string, Slot>,
  childId: string,
  size: { width: number; depth: number },
  spacing: number
): void {
  const slot = slots.get(childId)!;
  const grown = { ...slot, ...size };
  if (!collidesWithOthers(slots, childId, grown, spacing)) {
    slots.set(childId, grown);
    return;
  }

  const right = slot.x + slot.width + spacing;
  const bottom = slot.z + slot.depth + spacing;
  const widthGain = grown.width - slot.width;
  const depthGain = grown.depth - slot.depth;
  const candidates: Map<string, Slot>[] = [];
  if (depthGain > 0) candidates.push(insertStrip(slots, 'z', bottom, depthGain));
  if (widthGain > 0) candidates.push(insertStrip(slots, 'x', right, widthGain));
  if (depthGain > 0 && widthGain > 0) {
    candidates.push(insertStrip(insertStrip(slots, 'x', right, widthGain), 'z', bottom, depthGain));
  }

  let best: Map<string, Slot> | null = null;
  let bestArea = Infinity;
  for (const candidate of candidates) {
    candidate.set(childId, grown);
    if (collidesWithOthers(candidate, childId, grown, spacing)) {
      continue;
    }
    const extent = getExtent(candidate.values());
    if (extent.width * extent.depth < bestArea) {
      best = candidate;
      bestArea = extent.width * extent.depth;
    }
  }
  if (!best) {
    // Inserting both strips always makes room
    throw new Error(`Could not make room for ${childId} in the stable layout.`);
  }
  slots.clear();
  for (const [id, other] of best) {
    slots.set(id, other);
  }
}

/**
 * Arranges the children of a container, keeping the places they got in
 * earlier layouts. A child that outgrew its place grows where it is; if
 * another place is in the way, room is made around it. Returns the places and the size of the content area.
 */
function arrangeChildren(
  { arrangements, changed }: ArrangementTarget,
  containerId: string,
  children: Footprint[],
  spacing: number,
  aspectRatio: number
): { slots: Map<string, Slot>; width: number; depth: number } {
  let arrangement = arrangements.get(containerId);

  if (!arrangement) {
    const widestChild = Math.max(0, ...children.map((child) => child.width));
    const width = getTargetWidth(getPackedArea(children, spacing), widestChild, aspectRatio);
    arrangement = { slots: packAfresh(children, width, spacing), width };
    arrangements.set(containerId, arrangement);
    changed.add(containerId);
    return { slots: arrangement.slots, ...getExtent(arrangement.slots.values()) };
  }

  const { slots } = arrangement;
  const unplaced: Footprint[] = [];
  for (const child of children) {
    const slot = slots.get(child.id);
    if (!slot) {
      unplaced.push(child);
      continue;
    }
    if (child.width <= slot.width && child.depth <= slot.depth) {
      continue;
    }
    changed.add(containerId);
    growSlot(
      slots,
      child.id,
      { width: Math.max(child.width, slot.width), depth: Math.max(child.depth, slot.depth) },
      spacing
    );
    arrangement.width = Math.max(arrangement.width, getExtent(slots.values()).width);
  }

  if (unplaced.length > 0) {
    const widestChild = Math.max(...unplaced.map((child) => child.width));
    const area = getPackedArea(slots.values(), spacing) + getPackedArea(unplaced, spacing);
    arrangement.width = Math.max(arrangement.width, getTargetWidth(area, widestChild, aspectRatio));
    placeIntoFreeSpace(slots, unplaced, arrangement.width, spacing);
    changed.add(containerId);
  }

  return { slots, ...getExtent(slots.values()) };
}

/** Puts the children at their places inside a container with the given padding. */
function positionChildren(children: LayoutNode[], slots: Map<string, Slot>, padding: Padding): void {
  for (const child of children) {
    const slot = slots.get(child.id)!;
    child.x = padding.left + slot.x;
    child.z = padding.top + slot.z;
  }
}

function measureBuilding(context: LayoutContext, buildingId: string): LayoutNode | null {
  const building = context.landscape.buildings[buildingId];
  if (!building) {
    return null;
  }
  const { width, depth } = getBuildingFootprint(building, context.buildingSizing);
  return { id: building.id, isBuilding: true, width, depth, x: 0, z: 0, children: [] };
}

function measureDistricts(context: LayoutContext, districtIds: string[]): LayoutNode[] {
  const nodes: LayoutNode[] = [];
  for (const districtId of districtIds) {
    if (context.removedDistrictIds.has(districtId)) {
      continue;
    }
    const district = context.landscape.districts[districtId];
    if (!district || !hasVisibleBuildingsRecursively(context.landscape, district, context.removedDistrictIds)) {
      continue;
    }
    nodes.push(measureDistrict(context, district));
  }
  return nodes;
}

function measureContents(context: LayoutContext, buildingIds: string[], districtIds: string[]): LayoutNode[] {
  const buildings = buildingIds
    .map((buildingId) => measureBuilding(context, buildingId))
    .filter((node): node is LayoutNode => node !== null);
  return [...buildings, ...measureDistricts(context, districtIds)];
}

function measureDistrict(context: LayoutContext, district: District): LayoutNode {
  const children = measureContents(context, district.buildingIds, district.districtIds);
  const { slots, width, depth } = context.arrange(
    district.id,
    children,
    context.vs.buildingMargin.value,
    context.vs.cityAspectRatio.value
  );
  const padding = context.districtPadding;
  positionChildren(children, slots, padding);

  return {
    id: district.id,
    isBuilding: false,
    width: padding.left + width + padding.right,
    depth: padding.top + depth + padding.bottom,
    x: 0,
    z: 0,
    children,
  };
}

function measureCity(context: LayoutContext, city: City): LayoutNode {
  if (usesCustomBuildingLayout(context.vs)) {
    // The circle or spiral layout places the Buildings afterwards
    const { width, depth } = getCustomBuildingLayoutCitySize(context.landscape, city, context.vs);
    return { id: city.id, isBuilding: false, width, depth, x: 0, z: 0, children: [] };
  }

  const children = measureContents(context, city.buildingIds, city.districtIds);
  const { slots, width, depth } = context.arrange(
    city.id,
    children,
    context.vs.buildingMargin.value,
    context.vs.cityAspectRatio.value
  );
  const padding = context.cityPadding;
  positionChildren(children, slots, padding);

  const minimumSize = getMinimumCitySize(city, context.vs);
  return {
    id: city.id,
    isBuilding: false,
    width: Math.max(padding.left + width + padding.right, minimumSize.width),
    depth: Math.max(padding.top + depth + padding.bottom, minimumSize.height),
    x: 0,
    z: 0,
    children,
  };
}

/** Whether two lists of children hold the same children with the same sizes. */
function sameFootprints(children: Footprint[], others: Footprint[]): boolean {
  if (children.length !== others.length) return false;
  const byId = new Map(others.map((other) => [other.id, other]));
  return children.every((child) => {
    const other = byId.get(child.id);
    return !!other && Math.abs(other.width - child.width) < EPSILON && Math.abs(other.depth - child.depth) < EPSILON;
  });
}

/** Packs children in the given order, each as far to the top left as possible, like text reflowing. */
function packInOrder(children: Footprint[], width: number, spacing: number): Map<string, Slot> {
  const bin = new MaxRectsBin(width, UNBOUNDED, spacing, {
    smart: false,
    pot: false,
    square: false,
    allowRotation: false,
    border: 0,
    logic: PACKING_LOGIC.FILL_WIDTH,
  });
  const slots = new Map<string, Slot>();
  for (const child of children) {
    slots.set(child.id, toSlot(bin.add(new Rectangle(child.width, child.depth)), child));
  }
  return slots;
}

/**
 * Arranges the children of a container as a filter leaves them, without
 * changing the remembered places. A container that still holds the same
 * children as without the filter shows its remembered places. Otherwise its
 * remaining children are reflowed in the order of their remembered places, so
 * the gaps of the filtered ones close.
 */
function arrangeFiltered(
  arrangements: Arrangements,
  unfilteredChildren: Map<string, Footprint[]>,
  containerId: string,
  children: Footprint[],
  spacing: number,
  aspectRatio: number
) {
  const remembered = arrangements.get(containerId);
  const unfiltered = unfilteredChildren.get(containerId);
  if (remembered && unfiltered && sameFootprints(children, unfiltered)) {
    return { slots: remembered.slots, ...getExtent(remembered.slots.values()) };
  }

  const placeOf = (child: Footprint) => remembered?.slots.get(child.id);
  const ordered = [...children].sort((a, b) => {
    const placeA = placeOf(a);
    const placeB = placeOf(b);
    if (placeA && placeB) return placeA.z - placeB.z || placeA.x - placeB.x;
    if (placeA || placeB) return placeA ? -1 : 1;
    return compareForPacking(a, b);
  });
  const widestChild = Math.max(0, ...children.map((child) => child.width));
  const targetWidth = getTargetWidth(getPackedArea(children, spacing), widestChild, aspectRatio);
  const width = Math.max(widestChild, Math.min(remembered?.width ?? targetWidth, targetWidth));
  const slots = packInOrder(ordered, width, spacing);
  return { slots, ...getExtent(slots.values()) };
}

/** Measures and arranges the landscape bottom-up, from Buildings to Cities. */
function measureLandscape(context: LayoutContext): LayoutNode {
  const cityNodes = Object.values(context.landscape.cities).map((city) => measureCity(context, city));
  const { slots, width, depth } = context.arrange(LANDSCAPE_ID, cityNodes, context.vs.cityMargin.value, 1);
  // Same outer padding as the ELK layout uses for the landscape
  const padding = context.cityPadding;
  positionChildren(cityNodes, slots, padding);

  return {
    id: LANDSCAPE_ID,
    isBuilding: false,
    width: padding.left + width + padding.right,
    depth: padding.top + depth + padding.bottom,
    x: 0,
    z: 0,
    children: cityNodes,
  };
}

/**
 * Lays out the landscape stably. The remembered places are always made from
 * the landscape before any filter, so that filters neither reserve room for
 * what they filter nor leave gaps once they are removed. A filtered landscape
 * is then shown with the filtered entities' room closed up.
 */
export default function layoutLandscapeWithMaxRects(
  landscape: FlatLandscape,
  removedDistrictIds: Set<string>
): Map<string, BoxLayout> {
  const vs = getVisualizationSettings();
  const labelPlacement = vs.districtLabelPlacement.value;
  const unfiltered = getUnfilteredLandscape(landscape);
  // Sizes come from the unfiltered landscape, so a filter does not resize what it keeps
  const common = {
    vs,
    buildingSizing: {
      vs,
      widthBounds: getCachedBuildingMetricBounds(unfiltered.buildings, vs.buildingWidthMetric.value),
      depthBounds: getCachedBuildingMetricBounds(unfiltered.buildings, vs.buildingDepthMetric.value),
    },
    cityPadding: getPaddingForLabelPlacement(labelPlacement, vs.cityLabelMargin.value, vs.cityPadding.value),
    districtPadding: getPaddingForLabelPlacement(
      labelPlacement,
      vs.districtLabelMargin.value,
      vs.districtPadding.value
    ),
  };

  // In a Room, everyone but the Host lays out with the Room's places. What they
  // place themselves (entities the Host has not laid out yet) is not kept.
  const shared = getSharedArrangements();
  const target: ArrangementTarget = shared ? { arrangements: shared, changed: new Set() } : getOwnArrangements();
  const unfilteredChildren = new Map<string, Footprint[]>();
  const unfilteredNode = measureLandscape({
    ...common,
    landscape: unfiltered,
    removedDistrictIds: new Set(),
    arrange: (containerId, children, spacing, aspectRatio) => {
      unfilteredChildren.set(
        containerId,
        children.map(({ id, width, depth }) => ({ id, width, depth }))
      );
      return arrangeChildren(target, containerId, children, spacing, aspectRatio);
    },
  });
  if (!shared) layoutArrangementChanged();

  const isFiltered = unfiltered !== landscape || removedDistrictIds.size > 0;
  const shownNode = isFiltered
    ? measureLandscape({
        ...common,
        landscape,
        removedDistrictIds,
        arrange: (containerId, children, spacing, aspectRatio) =>
          arrangeFiltered(target.arrangements, unfilteredChildren, containerId, children, spacing, aspectRatio),
      })
    : unfilteredNode;

  return toBoxLayouts(shownNode, landscape, vs);
}
