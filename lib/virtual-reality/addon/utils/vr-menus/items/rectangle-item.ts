import Item, { ItemArgs } from './item';

export type RectangleItemArgs = ItemArgs & {
  width: number;
  height: number;
  color: string;
};

export default class RectangleItem extends Item {
  width: number;

  height: number;

  color: string;

  constructor({
    width, height, color, ...args
  }: RectangleItemArgs) {
    super(args);

    this.width = width;
    this.height = height;
    this.color = color;
  }

  drawToCanvas(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.fillStyle = this.color;
    ctx.fillRect(this.position.x, this.position.y, this.width, this.height);
    ctx.restore();
  }

  getBoundingBox() {
    return {
      minX: this.position.x,
      maxX: this.position.x + this.width,
      minY: this.position.y,
      maxY: this.position.y + this.height,
    };
  }
}
