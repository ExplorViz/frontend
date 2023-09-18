import type { Application } from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import { CityLayout, LABEL_HEIGHT } from 'workers/city-layouter';
import { getAllComponentsInApplication } from 'workers/utils';
import { ReducedApplication } from 'workers/worker-types';

export type ApplicationLabelData = {
  texture: ImageData;
  layout: LabelLayoutMap;
  labelHeight: number; // relative to the texture height
};

type LabelLayoutMap = Map<
  string,
  { width: number; top: number; bottom: number; index: number }
>;

export function generatePackageLabels(
  application: Application,
  layout: CityLayout
): ApplicationLabelData {
  const packages = getAllComponentsInApplication(
    application as unknown as ReducedApplication // TODO: fix type
  );

  const fontSize = 48;
  const lineHeight = 64;
  const ratio = lineHeight / LABEL_HEIGHT;

  const width = 384;
  const height = lineHeight * packages.length;

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

  const textureLayout: LabelLayoutMap = new Map();

  packages.forEach(({ name, id }, i) => {
    const boxWidth = layout.get(id)!.depth;
    const planeWidth = 0.9 * ratio * boxWidth;
    const maxWidth = Math.min(width - 2, planeWidth);

    ctx.font = `bold ${fontSize}px sans-serif`;
    const textWidth = ctx.measureText(name).width;

    if (textWidth > maxWidth) {
      const adjustedFontSize = Math.max(0.5 * fontSize, maxWidth / textWidth);
      ctx.font = `bold ${adjustedFontSize}px sans-serif`;
    }

    const y = i * lineHeight;

    ctx.fillText(name, 0.5 * maxWidth + 1, y + 0.5 * lineHeight, maxWidth);

    textureLayout.set(id, {
      width: maxWidth / width,
      top: (y + lineHeight) / height,
      bottom: (height - (y + lineHeight)) / height,
      index: i,
    });
  });

  // TODO: remove
  offscreen
    .convertToBlob()
    .then((blob) => console.log('url', URL.createObjectURL(blob)));

  return {
    texture: ctx.getImageData(0, 0, width, height),
    layout: textureLayout,
    labelHeight: lineHeight / height,
  };
}
