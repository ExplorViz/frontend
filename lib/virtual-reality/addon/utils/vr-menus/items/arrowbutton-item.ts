import InteractiveItem, { InteractiveItemArgs } from './interactive-item';

const DEFAULT_ARROW_BUTTON_COLOR = '#ffc338';
const DEFAULT_ARROW_BUTTON_HOVER_COLOR = '#00e5ff';

export type ArrowDirection = 'left' | 'right' | 'up' | 'down';

export type ArrowbuttonItemArgs = InteractiveItemArgs & {
  width: number;
  height: number;
  direction: ArrowDirection;
  buttonColor?: string;
  hoverColor?: string;
};

export default class ArrowbuttonItem extends InteractiveItem {
  width: number;

  height: number;

  buttonColor: string;

  hoverColor: string;

  direction: ArrowDirection;

  constructor({
    width,
    height,
    direction,
    buttonColor = DEFAULT_ARROW_BUTTON_COLOR,
    hoverColor = DEFAULT_ARROW_BUTTON_HOVER_COLOR,
    ...args
  }: ArrowbuttonItemArgs) {
    super(args);

    this.width = width;
    this.height = height;
    this.buttonColor = buttonColor;
    this.hoverColor = hoverColor;
    this.direction = direction;
  }

  drawToCanvas(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.fillStyle = this.isHovered ? this.hoverColor : this.buttonColor;
    ArrowbuttonItem.drawArrowhead(
      ctx,
      this.position,
      this.width,
      this.height,
      this.direction,
    );
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

  /**
   * Draw an arrow to a canvas.
   * @example
   * let canvas = document.createElement('canvas');
   * let ctx = canvas.getContext('2d');
   *
   * drawArrowHead(ctx, {x: 30, y: 50}, 40, 65, 'up');
   *
   * @param ctx - The context of a canvas.
   * @param from - The upper left position of the arrow.
   * @param width - The width  of the arrow.
   * @param height - The height  of the arrow.
   * @param direction - The direction of the arrow.
   */
  static drawArrowhead(
    ctx: CanvasRenderingContext2D,
    from: { x: number; y: number },
    width: number,
    height: number,
    direction: ArrowDirection,
  ) {
    // eslint-disable-next-line default-case
    switch (direction) {
      case 'up':
        ctx.beginPath();
        ctx.moveTo(from.x, from.y + height);
        ctx.lineTo(from.x + width / 2, from.y);
        ctx.lineTo(from.x + width, from.y + height);
        ctx.fill();
        break;
      case 'down':
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(from.x + width, from.y);
        ctx.lineTo(from.x + width / 2, from.y + height);
        ctx.fill();
        break;
      case 'left':
        ctx.beginPath();
        ctx.moveTo(from.x + width, from.y);
        ctx.lineTo(from.x + width, from.y + height);
        ctx.lineTo(from.x, from.y + height / 2);
        ctx.fill();
        break;
      case 'right':
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(from.x, from.y + height);
        ctx.lineTo(from.x + width, from.y + height / 2);
        ctx.fill();
        break;
    }
  }
}
