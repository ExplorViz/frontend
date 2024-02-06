import InteractiveItem, { InteractiveItemArgs } from './interactive-item';

export const DEFAULT_CHECKBOX_COLOR = '#ffc338';
export const DEFAULT_CHECKMARK_COLOR = '#ffffff';
export const DEFAULT_CHECKBOX_HOVER_COLOR = '#00e5ff';

export type CheckboxItemArgs = InteractiveItemArgs & {
  width: number;
  height: number;
  boxColor?: string;
  checkmarkColor?: string;
  hoverColor?: string;
  lineWidth?: number;
  isClickable?: boolean;
  isChecked?: boolean;
};

export default class CheckboxItem extends InteractiveItem {
  width: number;

  height: number;

  boxColor: string;

  checkmarkColor: string;

  hoverColor: string;

  lineWidth: number;

  isChecked: boolean;

  constructor({
    width,
    height,
    boxColor = DEFAULT_CHECKBOX_COLOR,
    checkmarkColor = DEFAULT_CHECKMARK_COLOR,
    hoverColor = DEFAULT_CHECKBOX_HOVER_COLOR,
    lineWidth = 5,
    isChecked = false,
    ...args
  }: CheckboxItemArgs) {
    super(args);

    this.width = width;
    this.height = height;
    this.boxColor = boxColor;
    this.checkmarkColor = checkmarkColor;
    this.hoverColor = hoverColor;
    this.lineWidth = lineWidth;
    this.isChecked = isChecked;
  }

  drawToCanvas(ctx: CanvasRenderingContext2D) {
    ctx.save();

    // Draw box.
    const {
      width,
      height,
      position: { x, y },
    } = this;
    ctx.lineWidth = this.lineWidth;
    ctx.strokeStyle = this.isHovered ? this.hoverColor : this.boxColor;
    ctx.strokeRect(x, y, width, height);

    // Draw checkmark.
    if (this.isChecked) {
      ctx.strokeStyle = this.checkmarkColor;
      ctx.beginPath();
      ctx.moveTo(x + 10, y + height / 2);
      ctx.lineTo(x + width / 2, y + height - 10);
      ctx.lineTo(x + width - 10, y + 10);
      ctx.stroke();
    }
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
