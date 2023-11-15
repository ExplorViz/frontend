import type { Application } from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import { type CityLayout, LABEL_HEIGHT } from 'workers/city-layouter';
import {
  getAllClassesInApplication,
  getAllComponentsInApplication,
} from 'workers/utils';
import type {
  ReducedComponent,
  ReducedApplication,
} from 'workers/worker-types';

export type ApplicationLabelData = {
  components: {
    texture: ImageData;
    layout: LabelLayoutMap;
  };
  classes: {
    texture: ImageData;
    layout: LabelLayoutMap;
  };
};

type LabelLayoutMap = Map<string, LabelLayoutData>;

export type LabelLayoutData = {
  relWidth: number;
  top: number;
  bottom: number;
  height: number;
  index: number;
  aspectRatio: number; // TODO: remove
  scale: number;
  width: number;
  id: string;
};

export function generateApplicationLabels(
  application: Application,
  componentLayout: CityLayout,
  maxTextureSize: number
): ApplicationLabelData {
  return {
    components: generatePackageAndFoundationLabels(
      application,
      componentLayout,
      maxTextureSize
    ),
    classes: generateClassLabels(application, maxTextureSize),
  };
}

function generatePackageAndFoundationLabels(
  application: Application,
  componentLayout: CityLayout,
  maxTextureSize: number
): ApplicationLabelData['components'] {
  const packages = getAllComponentsInApplication(
    application as unknown as ReducedApplication // TODO: fix type
  );

  // Also add foundation label:
  packages.push(application as unknown as ReducedComponent);

  const actualLabelHeight = 0.5 * LABEL_HEIGHT; // TODO: why?

  const fontSize = 48;
  const lineHeight = 64;
  const ratio = lineHeight / actualLabelHeight;

  const width = Math.min(384, maxTextureSize);
  const height = Math.min(lineHeight * packages.length, maxTextureSize); // TODO

  const ctx = initCanvas(width, height);
  ctx.textAlign = 'center';

  const textureLayout: LabelLayoutMap = new Map();

  packages.forEach(({ name, id }, i) => {
    const boxWidth = 0.9 * componentLayout.get(id)!.depth;
    const widthInTexture = ratio * boxWidth;
    const maxWidth = Math.min(width - 2, widthInTexture);

    ctx.font = `${fontSize}px sans-serif`;
    let textWidth = ctx.measureText(name).width;
    let worldWidth = textWidth / ratio;
    let scale = 1.0;

    if (textWidth > maxWidth) {
      const factor = Math.max(0.5, maxWidth / textWidth);
      const adjustedFontSize = factor * fontSize;
      ctx.font = `${adjustedFontSize}px sans-serif`;
      textWidth = ctx.measureText(name).width;
      worldWidth = (factor * textWidth) / ratio;
      scale = factor;
    }

    const y = i * lineHeight;

    //ctx.fillRect(0, y, 10, 10);
    //ctx.fillRect(maxWidth - 10, y + lineHeight - 10, 10, 10);

    ctx.fillText(name, 0.5 * maxWidth, y + 0.5 * lineHeight, maxWidth);

    textureLayout.set(id, {
      relWidth: maxWidth / width,
      top: y / height,
      bottom: (height - (y + lineHeight)) / height,
      height: lineHeight / height,
      index: i,
      aspectRatio: actualLabelHeight / boxWidth,
      scale,
      width: worldWidth,
      id,
    });
  });

  return {
    texture: ctx.getImageData(0, 0, width, height),
    layout: textureLayout,
  };
}

function generateClassLabels(
  application: Application,
  maxTextureSize: number
): ApplicationLabelData['classes'] {
  const classes = getAllClassesInApplication(
    application as unknown as ReducedApplication
  );

  const width = Math.min(128, maxTextureSize);
  const lineHeight = 24;
  const height = Math.min(classes.length * lineHeight, maxTextureSize);

  const ctx = initCanvas(width, height);
  ctx.textAlign = 'left';

  const fontSize = Math.round(0.64 * lineHeight);
  ctx.font = `bold ${fontSize}px sans-serif`;

  const textureLayout: LabelLayoutMap = new Map();

  classes.forEach(({ name, id }, i) => {
    const top = lineHeight * i;
    const bottom = height - (top + lineHeight);
    const displayText = name.length > 10 ? `${name.substring(0, 8)}...` : name;
    ctx.fillText(displayText, 1, top + 0.5 * lineHeight, width - 1);
    const textWidth = Math.min(ctx.measureText(displayText).width + 1, width);

    textureLayout.set(id, {
      relWidth: textWidth / width,
      top: top / height,
      bottom: bottom / height,
      height: lineHeight / height,
      index: i,
      aspectRatio: 1.0,
      width: 1.0, // TODO: use textWidth
      scale: 1.0,
      id,
    });
  });

  return {
    texture: ctx.getImageData(0, 0, width, height),
    layout: textureLayout,
  };
}

function initCanvas(
  width: number,
  height: number
): OffscreenCanvasRenderingContext2D {
  const offscreen = new OffscreenCanvas(width, height);
  const ctx = offscreen.getContext('2d');
  if (!ctx) {
    throw new Error();
  }

  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = 'rgb(255,255,255)';
  ctx.textBaseline = 'middle';
  //ctx.textRendering = 'optimizeLegibility';

  return ctx;
}
