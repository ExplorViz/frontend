import { DynamicLandscapeData } from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/dynamic-data';

export function combineDynamicLandscapeData(
  dynamicsA: DynamicLandscapeData,
  dynamicsB: DynamicLandscapeData
) {
  const dynamics = [...dynamicsA, ...dynamicsB];
  return dynamics;
}
