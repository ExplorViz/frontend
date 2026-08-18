import { DynamicLandscapeData } from 'explorviz-frontend/src/utils/landscape-schemes/telemetry/traces';

export function combineDynamicLandscapeData(
  dynamicsA: DynamicLandscapeData,
  dynamicsB: DynamicLandscapeData
) {
  const dynamics = [...dynamicsA, ...dynamicsB];
  return dynamics;
}
