import { TypeOfAnalysis } from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import { isStringRecord } from '../object-helpers';

export type CommitComparison = 'ADDED' | 'REMOVED' | 'MODIFIED' | 'UNCHANGED';

export type FlatLandscape = {
  landscapeToken: string;
  cities: Record<string, City>;
  districts: Record<string, District>;
  buildings: Record<string, Building>;
};

type FlatBaseModel = {
  id: string;
  name: string;
  fqn?: string;
  telemetryKey?: string; // Lookup key to request telemetry data for this entity
  originOfData?: TypeOfAnalysis;
  commitComparison?: CommitComparison; // For two selected commits
  editingState?: 'added' | 'removed'; // Reflect changes from restructuring
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

export function getFunctionIdToBuildingMap(flatLandscape: FlatLandscape) {
  const functionIdToBuildingMap = new Map<string, Building>();

  Object.values(flatLandscape.buildings).forEach((building) => {
    functionIdToBuildingMap.set(building.id, building);
  });

  return functionIdToBuildingMap;
}
