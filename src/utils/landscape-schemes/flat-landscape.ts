import { TypeOfAnalysis } from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import isObject from 'explorviz-frontend/src/utils/object-helpers';

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
  originOfData?: TypeOfAnalysis;
  commitComparison?: CommitComparison; // For two selected commits
  editingState?: 'added' | 'removed'; // Reflect changes from restructuring
};

export type Language =
  | 'JAVA'
  | 'CPP'
  | 'JAVASCRIPT'
  | 'TYPESCRIPT'
  | 'PYTHON'
  | 'PLAINTEXT'
  | 'LANGUAGE_UNSPECIFIED';

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

export function isCity(x: any): x is City {
  return (
    isObject(x) &&
    Object.prototype.hasOwnProperty.call(x, 'allContainedBuildingIds')
  );
}

export function isDistrict(x: any): x is District {
  return (
    isObject(x) &&
    Object.prototype.hasOwnProperty.call(x, 'districtIds') &&
    Object.prototype.hasOwnProperty.call(x, 'parentCityId')
  );
}

export function isBuilding(x: any): x is Building {
  return (
    isObject(x) &&
    Object.prototype.hasOwnProperty.call(x, 'parentCityId') &&
    !Object.prototype.hasOwnProperty.call(x, 'districtIds') &&
    !Object.prototype.hasOwnProperty.call(x, 'allContainedBuildingIds')
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
