import { SocialMetricDto } from 'explorviz-frontend/src/stores/evolution-data-fetch-service';
import {
  Building,
  FlatLandscape,
  MetricValue,
} from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';

export const SOCIAL_METRICS: ReadonlySet<string> = new Set([
  'commitCount',
  'commitActivity',
  'coreContributorActivity',
  'knowledgeSilo',
  'issueActivity',
  'reviewFriction',
  'knowledgeStaleness',
  'abandonedKnowledgeSilo',
]);

function buildDtoIndexes(dtos: SocialMetricDto[]) {
  const byId = new Map<string, SocialMetricDto>;
  const byFilePath = new Map<string, SocialMetricDto>;

  for (const dto of dtos) {
    if (dto.fileRevisionId !== null && dto.fileRevisionId !== undefined) {
      byId.set(String(dto.fileRevisionId), dto);
    }
    if (dto.filePath) {
      byFilePath.set(dto.filePath, dto);
    }

  }
  return { byId, byFilePath };
}

function findDtoForBuilding(
  building: Building,
  byId: Map<string, SocialMetricDto>,
  byFilePath: Map<string, SocialMetricDto>,
): SocialMetricDto | undefined {
  const byIdSearch = byId.get(building.id);
  if (byIdSearch) {
    return byIdSearch;
  }

  if (!building.fqn) {
    return undefined;
  }

  const splits = building.fqn.split('/');
  for (let i = 0; i < splits.length; i++) {
    const hit = byFilePath.get(splits.slice(i).join('/'))
    if (hit) {
      return hit;
    }
  }
  return undefined;
}

function withoutSocialMetrics(
  metrics: Record<string, MetricValue> | undefined
): Record<string, MetricValue> {
  const result: Record<string, MetricValue> = {};

  for (const [name, value] of Object.entries(metrics ?? {})) {
    if (!SOCIAL_METRICS.has(name)) {
      result[name] = value;
    }
  }
  return result;
}

export function mergeSocialMetricsIntoFlatLandscape(
  flatLandscape: FlatLandscape,
  dtos: SocialMetricDto[],
  ): FlatLandscape {
  const { byId, byFilePath } = buildDtoIndexes(dtos);
  const matchedDtos = new Set<SocialMetricDto>();
  const buildings: Record<string, Building> = {};

  for (const [buildingId, building] of Object.entries(flatLandscape.buildings)) {
    const metrics = withoutSocialMetrics(building.metrics);
    const dto = findDtoForBuilding(building, byId, byFilePath);

    if (dto) {
      matchedDtos.add(dto);
      for (const [name, score] of Object.entries(dto.metrics)) {
        if (!SOCIAL_METRICS.has(name)) {
          continue;
        }
        metrics[name] = { current: score?.normalized ?? null };
      }
    }

    buildings[buildingId] = { ...building, metrics };
  }

  const unmatchedCount = dtos.length - matchedDtos.size;
  if (unmatchedCount > 0) {
    console.warn(`Social metrics: ${unmatchedCount} of ${dtos.length} DTOs matched no building.`)
  };

  return { ...flatLandscape, buildings };
}
