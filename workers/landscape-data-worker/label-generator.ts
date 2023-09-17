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
  // TODO: fix type
  const packages = getAllComponentsInApplication(
    application as unknown as ReducedApplication
  );

  const fontSize = 48;
  const padding = 8;
  const lineHeight = fontSize + 2 * padding;
  const ratio = lineHeight / LABEL_HEIGHT;

  const width = 256;
  const height = lineHeight * packages.length;

  const offscreen = new OffscreenCanvas(width, height);
  const ctx = offscreen.getContext('2d');
  if (!ctx) {
    throw new Error();
  }

  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.fillStyle = 'rgb(255,255,255)';
  ctx.textAlign = 'center';
  //ctx.textRendering = 'optimizeLegibility';

  const maxTextureWidth = Math.round(0.9 * width);

  const textureLayout: LabelLayoutMap = new Map();

  packages.forEach(({ name, id }, i) => {
    const boxWidth = layout.get(id)!.width;
    const maxWidth = Math.min(maxTextureWidth, ratio * boxWidth);

    ctx.fillText(
      name,
      0.5 * maxWidth,
      (i + 1) * lineHeight - padding,
      maxWidth
    );

    textureLayout.set(id, {
      width: maxWidth / width,
      top: (i * lineHeight) / height,
      bottom: (height - (i + 1) * lineHeight) / height,
      index: i,
    });
  });

  return {
    texture: ctx.getImageData(0, 0, width, height),
    layout: textureLayout,
    labelHeight: lineHeight / height,
  };
}
