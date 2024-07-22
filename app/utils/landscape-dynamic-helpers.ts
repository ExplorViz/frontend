import { DynamicLandscapeData } from './landscape-schemes/dynamic/dynamic-data';

export function combineDynamicLandscapeData(
  dynamicsA: DynamicLandscapeData,
  dynamicsB: DynamicLandscapeData
) {
  const dynamics = [...dynamicsA, ...dynamicsB];
  return dynamics;
}
