import * as THREE from 'three';

export type TextTextureArgs = {
  text: string;
  textColor: THREE.Color;
  fontSize: number;
  fontFamily: string;
  padding: number;
  backgroundColor?: THREE.Color;
  backgroundOpacity?: number;
};

export default class TextTexture extends THREE.CanvasTexture {
  constructor(args: TextTextureArgs) {
    super(TextTexture.createCanvas(args));
    this.needsUpdate = true;
  }

  static createCanvas({
    text,
    textColor,
    fontSize,
    fontFamily,
    padding,
    backgroundColor,
    backgroundOpacity = 1,
  }: TextTextureArgs): HTMLCanvasElement {
    // Create canvas to draw texture.
    const canvas = document.createElement('canvas');

    // Initialize rendering context.
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Resize canvas to fit the text and padding.
      ctx.font = `${fontSize}px ${fontFamily}`;
      const metrics = ctx.measureText(text);
      canvas.width = Math.abs(metrics.actualBoundingBoxLeft)
        + Math.abs(metrics.actualBoundingBoxRight)
        + padding;
      canvas.height = Math.abs(metrics.actualBoundingBoxAscent)
        + Math.abs(metrics.actualBoundingBoxDescent)
        + padding;

      // Fill background.
      if (backgroundColor) {
        ctx.save();
        ctx.fillStyle = `#${backgroundColor.getHexString()}`;
        ctx.globalAlpha = backgroundOpacity;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
      }

      // Due to the resize, the context gets reset. Thus, we have to set the font again.
      ctx.font = `${fontSize}px ${fontFamily}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Draw text.
      ctx.fillStyle = `#${textColor.getHexString()}`;
      ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    }
    return canvas;
  }
}
