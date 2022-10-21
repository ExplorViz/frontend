import Item, { ItemArgs } from './item';

/**
 * A canvas 2D rendering context that is used to measure the bounding box of
 * the text.
 */
const measurementContext = document.createElement('canvas').getContext('2d');

export type TextItemArgs = ItemArgs & {
  text: string;
  color: string;
  fontSize: number;
  alignment?: CanvasTextAlign;
  baseline?: CanvasTextBaseline;
};

export default class TextItem extends Item {
  text: string;

  color: string;

  fontSize: number;

  alignment: CanvasTextAlign;

  baseline: CanvasTextBaseline;

  constructor({
    text,
    color,
    fontSize,
    alignment = 'left',
    baseline = 'top',
    ...args
  }: TextItemArgs) {
    super(args);
    this.text = text;
    this.color = color;
    this.fontSize = fontSize;
    this.alignment = alignment;
    this.baseline = baseline;
  }

  get font() {
    return `${this.fontSize}px arial`;
  }

  setText(text: string) {
    this.text = text;
  }

  getBoundingBox() {
    const size = this.measureText();
    return {
      minX: this.position.x + size.actualBoundingBoxLeft,
      maxX: this.position.x + size.actualBoundingBoxRight,
      minY: this.position.y + size.actualBoundingBoxAscent,
      maxY: this.position.y + size.actualBoundingBoxDescent,
    };
  }

  private measureText() {
    if (!measurementContext)
      throw new Error(`failed to measure text: ${this.text}`);

    measurementContext.font = this.font;
    measurementContext.textAlign = this.alignment;
    measurementContext.textBaseline = this.baseline;
    return measurementContext.measureText(this.text);
  }

  drawToCanvas(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.font = this.font;
    ctx.fillStyle = this.color;
    ctx.textAlign = this.alignment;
    ctx.textBaseline = this.baseline;

    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';

    ctx.fillText(this.text, this.position.x, this.position.y);
    ctx.restore();
  }
}
