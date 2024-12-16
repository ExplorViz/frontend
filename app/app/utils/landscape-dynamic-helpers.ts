import { DynamicLandscapeData } from 'react-lib/src/utils/landscape-schemes/dynamic/dynamic-data';

export function combineDynamicLandscapeData(
  dynamicsA: DynamicLandscapeData,
  dynamicsB: DynamicLandscapeData
) {
  const dynamics = [...dynamicsA, ...dynamicsB];
  return dynamics;
}
