/** A box of the 3D HTML inspector (see html-visualizer.tsx), reduced to what is needed for stacking. */
export type StackableBox = {
  /** Center (x, y). */
  position: [number, number];
  /** Width and height. */
  size: [number, number];
  level: number;
  /** Position within the stack of overlapping boxes of the same level (0 = backmost), set by `assignStackIndices`. */
  stackIndex: number;
};

/**
 * Boxes of the same layer can overlap (e.g., absolutely positioned elements or negative margins). At the same
 * depth, their faces would flicker (z-fighting). Hence, the boxes of each layer are stacked: larger boxes are
 * placed behind smaller ones (with equal size, later elements are in front, like the browser paints them).
 * Each box is placed one step in front of the overlapping boxes behind it, boxes without overlap keep index 0.
 *
 * @returns The largest stack index.
 */
export function assignStackIndices(boxes: StackableBox[]) {
  const boxesByLevel = new Map<number, StackableBox[]>();
  boxes.forEach((box) => {
    const levelBoxes = boxesByLevel.get(box.level);
    if (levelBoxes) levelBoxes.push(box);
    else boxesByLevel.set(box.level, [box]);
  });

  let maxStackIndex = 0;
  boxesByLevel.forEach((levelBoxes) => {
    // Stable sort, hence boxes of equal size keep their document order
    const sorted = [...levelBoxes].sort((a, b) => b.size[0] * b.size[1] - a.size[0] * a.size[1]);
    sorted.forEach((box, index) => {
      let stackIndex = 0;
      for (let i = 0; i < index; i++) {
        if (boxesOverlap(sorted[i], box)) {
          stackIndex = Math.max(stackIndex, sorted[i].stackIndex + 1);
        }
      }
      box.stackIndex = stackIndex;
      maxStackIndex = Math.max(maxStackIndex, stackIndex);
    });
  });
  return maxStackIndex;
}

/** Whether the boxes overlap with a positive area (boxes that only touch do not flicker). */
function boxesOverlap(a: StackableBox, b: StackableBox) {
  const overlapX =
    Math.min(a.position[0] + a.size[0] / 2, b.position[0] + b.size[0] / 2) -
    Math.max(a.position[0] - a.size[0] / 2, b.position[0] - b.size[0] / 2);
  const overlapY =
    Math.min(a.position[1] + a.size[1] / 2, b.position[1] + b.size[1] / 2) -
    Math.max(a.position[1] - a.size[1] / 2, b.position[1] - b.size[1] / 2);
  const tolerance = 1e-6 * Math.max(a.size[0], a.size[1], b.size[0], b.size[1]);
  return overlapX > tolerance && overlapY > tolerance;
}
