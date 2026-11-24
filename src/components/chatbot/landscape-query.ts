import {
  Building,
  City,
  CommitComparison,
  District,
} from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';

/**
 * How much the chatbot gets per entity. Every level costs more tokens than the
 * one before, so the cheapest level that answers the question should be used.
 */
export const LANDSCAPE_DETAIL_LEVELS = ['summary', 'structure', 'full'] as const;
export type LandscapeDetailLevel = (typeof LANDSCAPE_DETAIL_LEVELS)[number];

export const DEFAULT_MAX_DISTRICTS = 50;
export const DEFAULT_MAX_BUILDINGS = 50;

export const COMMIT_COMPARISONS = ['ADDED', 'REMOVED', 'MODIFIED', 'UNCHANGED'] as const satisfies CommitComparison[];

export interface LandscapeQuery {
  ids?: string[];
  cityIds?: string[];
  cityName?: string;
  districtName?: string;
  buildingName?: string;
  detailLevel?: LandscapeDetailLevel;
  sortByMetric?: string;
  commitComparison?: CommitComparison[];
  maxDistricts?: number;
  maxBuildings?: number;
}

export interface LandscapeModels {
  getAllCities: () => City[];
  getCity: (id: string) => City | undefined;
  getDistrict: (id: string) => District | undefined;
  getBuilding: (id: string) => Building | undefined;
}

type Entry = Record<string, unknown>;

export interface LandscapeQueryResult {
  cities: Entry[];
  districts?: Entry[];
  buildings?: Entry[];
  /** How many matches the limits cut off, so the chatbot knows the lists are partial. */
  omitted?: { districts?: number; buildings?: number };
  unknownIds?: string[];
}

function matchesText(target: string | undefined, filter: string) {
  return !filter || (target ?? '').toLowerCase().includes(filter);
}

function matchesName(entity: { name: string; fqn?: string }, filter: string) {
  return matchesText(entity.name, filter) || matchesText(entity.fqn, filter);
}

function normalize(value?: string) {
  return (value ?? '').trim().toLowerCase();
}

function toLimit(limit: number | undefined, fallback: number) {
  return typeof limit === 'number' && limit >= 0 ? Math.floor(limit) : fallback;
}

/** Drops absent values so they cost no tokens. */
function compact(entry: Entry): Entry {
  return Object.fromEntries(Object.entries(entry).filter(([, value]) => value !== undefined && value !== null));
}

/** The fully qualified name already ends with the name, so only one of them is sent. */
function nameOf(entity: { name: string; fqn?: string }) {
  return entity.fqn ? { fqn: entity.fqn } : { name: entity.name };
}

function toMetrics(metrics: Building['metrics']) {
  const result: Entry = {};
  for (const [name, value] of Object.entries(metrics ?? {})) {
    if (value.current === null || value.current === undefined) {
      // Removed by the newer of two compared commits.
      if (value.previous !== null && value.previous !== undefined) {
        result[name] = { current: null, previous: value.previous };
      }
      continue;
    }
    const hasOtherPrevious =
      value.previous !== undefined && value.previous !== null && value.previous !== value.current;
    result[name] = hasOtherPrevious ? { current: value.current, previous: value.previous } : value.current;
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

/** How a building changed between the compared commits. Other data may still carry a value from a former comparison. */
function getComparison(entity: { commitComparison?: CommitComparison }, isComparing: boolean) {
  return isComparing ? (entity.commitComparison ?? 'UNCHANGED') : undefined;
}

/** Most buildings are unchanged, so only the others say how they changed. */
function changeOf(entity: { commitComparison?: CommitComparison }, isComparing: boolean) {
  const comparison = getComparison(entity, isComparing);
  return comparison === 'UNCHANGED' ? {} : { commitComparison: comparison };
}

function countByComparison(buildings: Building[]) {
  const counts: Partial<Record<CommitComparison, number>> = {};
  for (const building of buildings) {
    const comparison = building.commitComparison ?? 'UNCHANGED';
    counts[comparison] = (counts[comparison] ?? 0) + 1;
  }
  return counts;
}

function toCityEntry(city: City, isFull: boolean): Entry {
  return compact({
    id: city.id,
    name: city.name,
    districtCount: city.allContainedDistrictIds.length,
    buildingCount: city.allContainedBuildingIds.length,
    ...(isFull && { type: city.type, originOfData: city.originOfData, editingState: city.editingState }),
  });
}

function toDistrictEntry(district: District, isFull: boolean, withCityId: boolean, isComparing: boolean): Entry {
  return compact({
    id: district.id,
    ...nameOf(district),
    parentId: district.parentDistrictId,
    ...changeOf(district, isComparing),
    ...(withCityId && { cityId: district.parentCityId }),
    ...(isFull && {
      districtCount: district.districtIds.length,
      buildingCount: district.buildingIds.length,
      type: district.type,
      originOfData: district.originOfData,
      editingState: district.editingState,
    }),
  });
}

function toBuildingEntry(
  building: Building,
  isFull: boolean,
  withCityId: boolean,
  isComparing: boolean,
  sortByMetric?: string
): Entry {
  return compact({
    id: building.id,
    ...nameOf(building),
    parentId: building.parentDistrictId,
    ...changeOf(building, isComparing),
    ...(withCityId && { cityId: building.parentCityId }),
    // Without this, a sorted list would not show the values it is sorted by.
    ...(!isFull && sortByMetric && { [sortByMetric]: building.metrics?.[sortByMetric]?.current }),
    ...(isFull && {
      type: building.type,
      language: building.language,
      metrics: toMetrics(building.metrics),
      originOfData: building.originOfData,
      editingState: building.editingState,
    }),
  });
}

function withOmitted(result: LandscapeQueryResult, omittedDistricts: number, omittedBuildings: number) {
  if (omittedDistricts > 0 || omittedBuildings > 0) {
    result.omitted = {
      ...(omittedDistricts > 0 && { districts: omittedDistricts }),
      ...(omittedBuildings > 0 && { buildings: omittedBuildings }),
    };
  }
  return result;
}

function lookUpByIds(
  ids: string[],
  isFull: boolean,
  models: LandscapeModels,
  isComparing: boolean
): LandscapeQueryResult {
  const result: LandscapeQueryResult = { cities: [] };
  const unknownIds: string[] = [];

  for (const id of new Set(ids)) {
    const city = models.getCity(id);
    const district = models.getDistrict(id);
    const building = models.getBuilding(id);
    if (city) {
      result.cities.push(toCityEntry(city, isFull));
    } else if (district) {
      (result.districts ??= []).push(toDistrictEntry(district, isFull, true, isComparing));
    } else if (building) {
      (result.buildings ??= []).push(toBuildingEntry(building, isFull, true, isComparing));
    } else {
      unknownIds.push(id);
    }
  }

  if (unknownIds.length > 0) {
    result.unknownIds = unknownIds;
  }
  return result;
}

/**
 * Answers a chatbot query against the landscape. The result is kept as small
 * as the query allows: absent fields are dropped, lists are limited, and what
 * the limits cut off is reported as a count.
 */
export function queryLandscape(
  query: LandscapeQuery,
  models: LandscapeModels,
  isComparing = false
): LandscapeQueryResult {
  const detailLevel = query.detailLevel ?? 'structure';
  const isFull = detailLevel === 'full';

  if (query.ids && query.ids.length > 0) {
    return lookUpByIds(query.ids, isFull, models, isComparing);
  }

  const comparisons = query.commitComparison?.length ? query.commitComparison : undefined;
  if (comparisons && !isComparing) {
    throw new Error('commitComparison has no meaning now: no two commits of a repository are selected.');
  }

  const cityName = normalize(query.cityName);
  const districtName = normalize(query.districtName);
  const buildingName = normalize(query.buildingName);
  const sortByMetric = query.sortByMetric?.trim() || undefined;

  const cities = models.getAllCities().filter((city) => {
    const idMatches = !query.cityIds?.length || query.cityIds.includes(city.id);
    return idMatches && matchesText(city.name, cityName);
  });
  const withCityId = cities.length > 1;

  // A query for buildings only does not need every district listed alongside.
  const listsDistricts = Boolean(districtName) || (!buildingName && !sortByMetric && !comparisons);

  const result: LandscapeQueryResult = { cities: [] };
  const districts: District[] = [];
  const buildings: Building[] = [];

  for (const city of cities) {
    const cityDistricts = city.allContainedDistrictIds
      .map((id) => models.getDistrict(id))
      .filter((district): district is District => !!district && matchesName(district, districtName));
    const districtIds = new Set(cityDistricts.map(({ id }) => id));

    const cityBuildings = city.allContainedBuildingIds
      .map((id) => models.getBuilding(id))
      .filter(
        (building): building is Building =>
          !!building &&
          matchesName(building, buildingName) &&
          (!comparisons || comparisons.includes(building.commitComparison ?? 'UNCHANGED')) &&
          (!districtName || (!!building.parentDistrictId && districtIds.has(building.parentDistrictId)))
      );

    const isFiltered = Boolean(districtName || buildingName || comparisons);
    result.cities.push(
      compact({
        ...toCityEntry(city, isFull),
        ...(isComparing && { buildingsByCommitComparison: countByComparison(cityBuildings) }),
        ...(isFiltered && {
          matchingDistrictCount: listsDistricts ? cityDistricts.length : undefined,
          matchingBuildingCount: cityBuildings.length,
        }),
      })
    );

    if (listsDistricts) {
      districts.push(...cityDistricts);
    }
    buildings.push(...cityBuildings);
  }

  if (detailLevel === 'summary') {
    return result;
  }

  if (sortByMetric) {
    const valueOf = (building: Building) => building.metrics?.[sortByMetric]?.current ?? Number.NEGATIVE_INFINITY;
    buildings.sort((a, b) => valueOf(b) - valueOf(a));
  }

  const maxDistricts = toLimit(query.maxDistricts, DEFAULT_MAX_DISTRICTS);
  const maxBuildings = toLimit(query.maxBuildings, DEFAULT_MAX_BUILDINGS);

  if (listsDistricts) {
    result.districts = districts
      .slice(0, maxDistricts)
      .map((district) => toDistrictEntry(district, isFull, withCityId, isComparing));
  }
  result.buildings = buildings
    .slice(0, maxBuildings)
    .map((building) => toBuildingEntry(building, isFull, withCityId, isComparing, sortByMetric));

  return withOmitted(result, listsDistricts ? districts.length - maxDistricts : 0, buildings.length - maxBuildings);
}

/** The parts of a conversation message that are needed to find an earlier tool result. */
export interface ConversationMessage {
  role: string;
  content?: unknown;
  toolCallId?: string;
  toolCalls?: { id: string; function: { name: string; arguments: string } }[];
}

/** Below this size, repeating the result is cheaper than pointing to the earlier one. */
const MIN_LENGTH_WORTH_REFERENCING = 300;

/**
 * Replaces a tool result by a short note if the very same result is already in
 * the conversation. Comparing against the messages (rather than remembering
 * the last result) keeps this correct when the chat is reset, the model (and
 * with it the conversation) is switched, or the earlier result is no longer
 * part of the conversation.
 */
export function referenceEarlierResult(
  content: string,
  messages: readonly ConversationMessage[],
  currentToolCallId: string
): string {
  if (content.length < MIN_LENGTH_WORTH_REFERENCING) {
    return content;
  }

  const earlier = messages.find(
    (message) => message.role === 'tool' && message.toolCallId !== currentToolCallId && message.content === content
  );
  if (!earlier) {
    return content;
  }

  const earlierCall = messages
    .flatMap((message) => (message.role === 'assistant' ? (message.toolCalls ?? []) : []))
    .find((toolCall) => toolCall.id === earlier.toolCallId);
  const source = earlierCall
    ? `your earlier ${earlierCall.function.name} call with the arguments ${earlierCall.function.arguments}`
    : 'an earlier tool call in this conversation';

  return JSON.stringify({
    unchanged: true,
    note: `The data did not change: this result is identical to the result of ${source}. Use that result.`,
  });
}
