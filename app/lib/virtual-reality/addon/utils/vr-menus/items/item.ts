export type ItemArgs = {
  position: { x: number; y: number };
};

export default abstract class Item {
  position: { x: number; y: number };

  constructor({ position }: ItemArgs) {
    this.position = position;
  }

  abstract drawToCanvas(ctx: CanvasRenderingContext2D): void;

  abstract getBoundingBox(): {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
}
