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
  texture: ImageData;
  layout: LabelLayoutMap;
};

type LabelLayoutMap = Map<string, LabelLayoutData>;

export type LabelLayoutData = {
  width: number;
  top: number;
  bottom: number;
  height: number;
  index: number;
  aspectRatio: number;
};

export function generatePackageAndFoundationLabels(
  application: Application,
  layout: CityLayout
): ApplicationLabelData {
  const packages = getAllComponentsInApplication(
    application as unknown as ReducedApplication // TODO: fix type
  );

  // Also add foundation label:
  packages.push(application as unknown as ReducedComponent);

  const actualLabelHeight = 0.5 * LABEL_HEIGHT; // TODO: why?

  const fontSize = 48;
  const lineHeight = 64;
  const ratio = lineHeight / actualLabelHeight;

  const width = 384;
  const height = lineHeight * packages.length;

  const ctx = initCanvas(width, height);

  const textureLayout: LabelLayoutMap = new Map();

  packages.forEach(({ name, id }, i) => {
    const boxWidth = layout.get(id)!.depth;
    const widthInTexture = ratio * boxWidth;
    const maxWidth = Math.min(width - 2, widthInTexture);
    //console.log('width', name, widthInTexture, maxWidth);

    ctx.font = `bold ${fontSize}px sans-serif`;
    const textWidth = ctx.measureText(name).width;

    if (textWidth > maxWidth) {
      const adjustedFontSize = Math.max(0.5 * fontSize, maxWidth / textWidth);
      ctx.font = `bold ${adjustedFontSize}px sans-serif`;
    }

    const y = i * lineHeight;

    //ctx.fillRect(0, y, 10, 10);
    //ctx.fillRect(maxWidth - 10, y + lineHeight - 10, 10, 10);

    ctx.fillText(name, 0.5 * maxWidth, y + 0.5 * lineHeight, maxWidth);

    textureLayout.set(id, {
      width: maxWidth / width,
      top: (y + lineHeight) / height,
      bottom: (height - (y + lineHeight)) / height,
      height: lineHeight / height,
      index: i,
      aspectRatio: actualLabelHeight / boxWidth,
    });
  });

  // TODO: remove
  // ctx.canvas
  //   .convertToBlob()
  //   .then((blob) => console.log('url', URL.createObjectURL(blob)));

  return {
    texture: ctx.getImageData(0, 0, width, height),
    layout: textureLayout,
  };
}

export function generateClassLabels(application: Application) {
  const classes = getAllClassesInApplication(
    application as unknown as ReducedApplication
  );

  const width = 128;
  const height = classes.length * 10; // TODO

  const ctx = initCanvas(width, height);

  const textureLayout: LabelLayoutMap = new Map();

  classes.forEach(({ name, id }, i) => {
    // TODO
    ctx.fillText(name, 0.5 * width, 10 * i, width);

    textureLayout.set(id, {
      width: width,
      top: (10 * i) / height,
      bottom: (height - 0) / height,
      height: 10 / height,
      index: i,
      aspectRatio: 1.0, // TODO
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
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  //ctx.textRendering = 'optimizeLegibility';

  return ctx;
}
