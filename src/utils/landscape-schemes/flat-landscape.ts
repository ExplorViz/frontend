import { TypeOfAnalysis } from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import { isStringRecord } from '../object-helpers';

export type CommitComparison = 'ADDED' | 'REMOVED' | 'MODIFIED' | 'UNCHANGED';

export type FlatLandscape = {
  landscapeToken: string;
  cities: Record<string, City>;
  districts: Record<string, District>;
  buildings: Record<string, Building>;
};

export type AnimationFrame = {
  commitHash: string;
  authorDate: number; // epoch ms → new Date(authorDate)
  ordinal: number; // global index in commit history (authorDate ASC)
  landscape: FlatLandscape;
};

export type AnimationWindow = {
  totalCount: number;
  windowStart: number;
  frames: AnimationFrame[];
};

export type AnimationSkeleton = {
  landscape: FlatLandscape;
  fqnToFirstOrdinal: Record<string, number>;
  orderedCommitHashes: string[];
  orderedCommitTimestamps: number[];
};

export type BuildingState = {
  fqn: string;
  lastChangeOrdinal: number;
  lastChangeDate: number;
  lastAction: CommitComparison;
};

export type BuildingChange = {
  fqn: string;
  action: CommitComparison;
};

export type AnimationDeltaFrame = {
  commitHash: string;
  authorDate: number;
  ordinal: number;
  keyframe: boolean;
  tsFrom: number;
  tsTo: number;
  commitCount: number;
  state: BuildingState[] | null;
  changes: BuildingChange[] | null;
};

export type AnimationDeltaWindow = {
  totalCount: number;
  windowStart: number;
  frames: AnimationDeltaFrame[];
};

type FlatBaseModel = {
  id: string;
  name: string;
  fqn?: string;
  telemetryKey?: string; // Lookup key to request telemetry data for this entity
  originOfData?: TypeOfAnalysis;
  commitComparison?: CommitComparison; // For two selected commits
  editingState?: 'added' | 'removed'; // Reflect changes from restructuring
  isPlaceholder?: boolean; // Flag to make it invisible in animation
  agingFactor?: number; // 0 = just changed, 1 = fully aged (unchanged past threshold); animation only
  lastAction?: CommitComparison;
};

export type Language =
  | 'LANGUAGE_UNSPECIFIED'
  | 'C'
  | 'CPP'
  | 'CSHARP'
  | 'GO'
  | 'JAVA'
  | 'JAVASCRIPT'
  | 'KOTLIN'
  | 'PHP'
  | 'PLAINTEXT'
  | 'PYTHON'
  | 'RUST'
  | 'SWIFT'
  | 'TYPESCRIPT';

export type City = FlatBaseModel & {
  buildingIds: string[];
  districtIds: string[];
  allContainedBuildingIds: string[];
  allContainedDistrictIds: string[];
};

export type District = FlatBaseModel & {
  parentCityId: string;
  parentDistrictId?: string;
  districtIds: string[];
  buildingIds: string[];
};

export type Building = FlatBaseModel & {
  parentCityId: string;
  parentDistrictId?: string;
  language?: Language;
  metrics?: Record<string, MetricValue>;
};

export type MetricValue = {
  current: number | null;
  previous?: number | null;
};

export function isFlatLandscape(x: any): x is FlatLandscape {
  return (
    x !== null &&
    typeof x === 'object' &&
    typeof x.landscapeToken === 'string' &&
    isStringRecord(x.cities) &&
    isStringRecord(x.districts) &&
    isStringRecord(x.buildings) &&
    Object.values(x.cities).every(isCity) &&
    Object.values(x.districts).every(isDistrict) &&
    Object.values(x.buildings).every(isBuilding)
  );
}

function isFlatBaseModel(x: any): x is FlatBaseModel {
  return (
    x !== null &&
    typeof x === 'object' &&
    typeof x.id === 'string' &&
    typeof x.name === 'string' &&
    (x.fqn === undefined || typeof x.fqn === 'string') &&
    (x.telemetryKey === undefined || typeof x.telemetryKey === 'string') &&
    (x.originOfData === undefined ||
      Object.values(TypeOfAnalysis).includes(x.originOfData)) &&
    (x.commitComparison === undefined ||
      typeof x.commitComparison === 'string') &&
    (x.editingState === undefined || typeof x.editingState === 'string')
  );
}

export function isCity(x: any): x is City {
  return (
    isFlatBaseModel(x) &&
    'buildingIds' in x &&
    'districtIds' in x &&
    'allContainedBuildingIds' in x &&
    'allContainedDistrictIds' in x &&
    Array.isArray(x.buildingIds) &&
    Array.isArray(x.districtIds) &&
    Array.isArray(x.allContainedBuildingIds) &&
    Array.isArray(x.allContainedDistrictIds) &&
    isFlatBaseModel(x)
  );
}

export function isDistrict(x: any): x is District {
  return (
    isFlatBaseModel(x) &&
    'parentCityId' in x &&
    'districtIds' in x &&
    'buildingIds' in x &&
    typeof x.parentCityId === 'string' &&
    (!('parentDistrictId' in x) || typeof x.parentDistrictId === 'string') &&
    Array.isArray(x.districtIds) &&
    Array.isArray(x.buildingIds)
  );
}

export function isBuilding(x: any): x is Building {
  return (
    isFlatBaseModel(x) &&
    'parentCityId' in x &&
    typeof x.parentCityId === 'string' &&
    (!('parentDistrictId' in x) || typeof x.parentDistrictId === 'string') &&
    (!('language' in x) || typeof x.language === 'string') &&
    (!('metrics' in x) ||
      (isStringRecord(x.metrics) &&
        Object.values(x.metrics).every(isMetricValue)))
  );
}

export function isMetricValue(x: any): x is MetricValue {
  return (
    x !== null &&
    typeof x === 'object' &&
    (x.current === null || typeof x.current === 'number') &&
    (x.previous === undefined ||
      x.previous === null ||
      typeof x.previous === 'number')
  );
}

export function getAllIdsOfFlatLandscape(
  flatLandscape: FlatLandscape
): string[] {
  return Object.entries(flatLandscape)
    .filter(
      ([, value]) =>
        typeof value === 'object' && !Array.isArray(value) && value !== null
    )
    .flatMap(([, value]) =>
      Object.values(value as Record<string, { id: string }>)
    )
    .filter((item) => 'id' in item)
    .map((item) => item.id);
}

export function getBuildingById(
  flatLandscape: FlatLandscape,
  buildingId: string
): Building | undefined {
  return flatLandscape.buildings[buildingId];
}

export type FlatLandscapeEntityType = 'city' | 'district' | 'building';

export function getFlatLandscapeEntityType(
  entityId: string,
  flatLandscape: FlatLandscape
): FlatLandscapeEntityType | null {
  if (entityId in flatLandscape.cities) {
    return 'city';
  }
  if (entityId in flatLandscape.districts) {
    return 'district';
  }
  if (entityId in flatLandscape.buildings) {
    return 'building';
  }
  return null;
}

export function getFunctionIdToBuildingMap(flatLandscape: FlatLandscape) {
  const functionIdToBuildingMap = new Map<string, Building>();

  Object.values(flatLandscape.buildings).forEach((building) => {
    functionIdToBuildingMap.set(building.id, building);
  });

  return functionIdToBuildingMap;
}

/**
 * Order-independent hash over all entity ids. Sorting the ids and joining them
 * into one string produced a multi-megabyte allocation on every landscape
 * update, while only ever being compared against the previous signature.
 */
function hashFlatLandscapeEntityIds(flatLandscape: FlatLandscape): string {
  let sum = 0;
  let mixed = 0;

  for (const value of Object.values(flatLandscape)) {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      continue;
    }

    for (const entity of Object.values(
      value as Record<string, { id?: string }>
    )) {
      const id = entity?.id;
      if (id === undefined) {
        continue;
      }

      let idHash = 0x811c9dc5;
      for (let i = 0; i < id.length; i++) {
        idHash ^= id.charCodeAt(i);
        idHash = Math.imul(idHash, 0x01000193);
      }
      sum = (sum + idHash) | 0;
      mixed = (mixed + Math.imul(idHash ^ (idHash >>> 15), 0x2545f491)) | 0;
    }
  }

  return `${sum >>> 0}.${mixed >>> 0}`;
}

export function getFlatLandscapeStructureSignature(
  flatLandscape: FlatLandscape
): string {
  const buildingCount = Object.keys(flatLandscape.buildings).length;
  const districtCount = Object.keys(flatLandscape.districts).length;
  const containedDistrictCount = Object.values(flatLandscape.cities).reduce(
    (count, city) => count + city.allContainedDistrictIds.length,
    0
  );

  return `${hashFlatLandscapeEntityIds(flatLandscape)}|b:${buildingCount}|d:${districtCount}|cd:${containedDistrictCount}`;
}
