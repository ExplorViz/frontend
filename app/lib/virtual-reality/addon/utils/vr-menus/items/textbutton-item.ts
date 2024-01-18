import InteractiveItem, { InteractiveItemArgs } from './interactive-item';

export const DEFAULT_BUTTON_COLOR = '#555555';
export const DEFAULT_BUTTON_TEXT_COLOR = '#ffc338';
export const DEFAULT_BUTTON_HOVER_COLOR = '#929292';

export type TextbuttonItemArgs = InteractiveItemArgs & {
  text: string;
  fontSize: number;
  width: number;
  height: number;
  buttonColor?: string;
  textColor?: string;
  hoverColor?: string;
};

export default class TextbuttonItem extends InteractiveItem {
  text: string;

  fontSize: number;

  width: number;

  height: number;

  textColor: string;

  buttonColor: string;

  hoverColor: string;

  constructor({
    text,
    fontSize,
    width,
    height,
    buttonColor = DEFAULT_BUTTON_COLOR,
    textColor = DEFAULT_BUTTON_TEXT_COLOR,
    hoverColor = DEFAULT_BUTTON_HOVER_COLOR,
    ...args
  }: TextbuttonItemArgs) {
    super(args);

    this.text = text;
    this.width = width;
    this.height = height;
    this.fontSize = fontSize;
    this.buttonColor = buttonColor;
    this.textColor = textColor;
    this.hoverColor = hoverColor;
  }

  get font() {
    return `${this.fontSize}px arial`;
  }

  drawToCanvas(ctx: CanvasRenderingContext2D): void {
    ctx.save();

    // Draw button background.
    ctx.fillStyle = this.isHovered ? this.hoverColor : this.buttonColor;
    ctx.fillRect(this.position.x, this.position.y, this.width, this.height);

    // Draw button text.
    ctx.fillStyle = this.textColor;
    ctx.font = this.font;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';

    ctx.fillText(
      this.text,
      this.position.x + this.width / 2,
      this.position.y + this.height / 2
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
}
