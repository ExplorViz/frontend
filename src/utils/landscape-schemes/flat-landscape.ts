import {
  Application,
  Class,
  Method,
  Node,
  Package,
  StructureLandscapeData,
  TypeOfAnalysis,
} from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
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
  current: number;
  previous?: number;
};


export function isCity(x: any): x is City {
  return isObject(x) && Object.prototype.hasOwnProperty.call(x, 'allContainedBuildingIds');
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

export function getAllIdsOfFlatLandscape(flatLandscape: FlatLandscape): string[] {
  return Object.entries(flatLandscape)
      .filter(([, value]) => typeof value === "object" && !Array.isArray(value) && value !== null)
      .flatMap(([, value]) => Object.values(value as Record<string, { id: string }>))
      .filter(item => "id" in item)
      .map(item => item.id);
}

export function convertToFlatLandscape(
  input: StructureLandscapeData
): FlatLandscape {
  const cities: Record<string, City> = {};
  const districts: Record<string, District> = {};
  const buildings: Record<string, Building> = {};

  function walkPackages(
    pkg: Package,
    app: Application,
    cityId: string,
    path: string[],
    parentDistrictId?: string
  ) {
    const currentPath = [...path, pkg.name];

    const districtId = pkg.id;

    if (!districts[districtId]) {
      districts[districtId] = {
        id: districtId,
        name: pkg.name,
        fqn: pkg.fqn,
        parentCityId: cityId,
        parentDistrictId,
        districtIds: pkg.subPackages.map((subPkg) => subPkg.id),
        buildingIds: [],
      };

      // Handle root packages (packages without parent package)
      if (!pkg.parent) {
        cities[cityId].districtIds.push(districtId);
      }
      cities[cityId].allContainedDistrictIds.push(districtId);
    }

    for (const cls of pkg.classes) {
      const buildingId = cls.id;

      if (!buildings[buildingId]) {
        buildings[buildingId] = {
          id: buildingId,
          name: cls.name,
          fqn: cls.fqn,
          originOfData: cls.originOfData,
          language: (() => {
            const lang = app.language.toUpperCase();
            if (lang === 'JAVA') return 'JAVA';
            if (lang === 'CPP' || lang === 'C++') return 'CPP';
            if (lang === 'PYTHON') return 'PYTHON';
            if (lang === 'JAVASCRIPT' || lang === 'JS') return 'JAVASCRIPT';
            if (lang === 'TYPESCRIPT' || lang === 'TS') return 'TYPESCRIPT';
            return 'LANGUAGE_UNSPECIFIED';
          })(),
          parentCityId: cityId,
          parentDistrictId: districtId,
          metrics: {},
        };

        districts[districtId].buildingIds.push(buildingId);
      }

      cities[cityId].allContainedBuildingIds.push(buildingId);
    }

    // Recurse into sub-packages
    for (const sub of pkg.subPackages) {
      walkPackages(sub, app, cityId, currentPath, districtId);
    }
  }

  for (const node of input.nodes) {
    for (const app of node.applications) {
      const cityId = app.id;

      if (!cities[cityId]) {
        cities[cityId] = {
          id: app.id,
          name: app.name,
          fqn: app.name,
          buildingIds: [],
          districtIds: [],
          allContainedDistrictIds: [],
          allContainedBuildingIds: [],
        };
      }

      for (const pkg of app.packages) {
        walkPackages(pkg, app, cityId, [app.name]);
      }

      if (app.classes) {
        for (const cls of app.classes) {
          const buildingId = cls.id;

          if (!buildings[buildingId]) {
            buildings[buildingId] = {
              id: buildingId,
              name: cls.name,
              fqn: cls.fqn,
              originOfData: cls.originOfData,
              language: (() => {
                const lang = app.language.toUpperCase();
                if (lang === 'JAVA') return 'JAVA';
                if (lang === 'CPP' || lang === 'C++') return 'CPP';
                if (lang === 'PYTHON') return 'PYTHON';
                if (lang === 'JAVASCRIPT' || lang === 'JS') return 'JAVASCRIPT';
                if (lang === 'TYPESCRIPT' || lang === 'TS') return 'TYPESCRIPT';
                return 'LANGUAGE_UNSPECIFIED';
              })(),
              parentCityId: cityId,
              metrics: {},
            };

            cities[cityId].buildingIds.push(buildingId);
          }

          cities[cityId].allContainedBuildingIds.push(buildingId);
        }
      }
    }
  }

  return {
    landscapeToken: input.landscapeToken,
    cities,
    districts,
    buildings,
  };
}

export function convertStructureLandscapeFromFlat(
  flatLandscape: FlatLandscape
): StructureLandscapeData {
  const nodes: Node[] = [];

  // Create a default node as FlatLandscape doesn't preserve Node structure
  // We'll group all applications under this node
  const defaultNode: Node = {
    id: 'default-node',
    ipAddress: '127.0.0.1',
    hostName: 'structure-from-flat',
    name: 'Default Node',
    applications: [],
    originOfData: TypeOfAnalysis.Dynamic,
  };

  nodes.push(defaultNode);

  const { cities, districts, buildings } = flatLandscape;

  Object.values(cities).forEach((city) => {
    const app: Application = {
      id: city.id,
      name: city.name,
      language: 'JAVA', // Default or infer from buildings?
      instanceId: '',
      parentId: defaultNode.id,
      packages: [],
      originOfData: city.originOfData || TypeOfAnalysis.Dynamic,
    };

    city.districtIds.forEach((districtId) => {
      const pkg = buildPackage(districtId, districts, buildings);
      if (pkg) {
        pkg.parent = undefined; // Root packages have no parent
        pkg.level = 0;
        app.packages.push(pkg);
      }
    });

    city.buildingIds.forEach((buildingId) => {
      const building = buildings[buildingId];
      if (building) {
        if (!app.classes) app.classes = [];
        const cls = buildClass(building);
        app.classes.push(cls);
      }
    });

    // Determine language from first building if available
    if (city.allContainedBuildingIds.length > 0) {
      const firstBuilding = buildings[city.allContainedBuildingIds[0]];
      if (firstBuilding?.language) {
        app.language = firstBuilding.language;
      }
    }

    defaultNode.applications.push(app);
  });

  // Calculate levels (since we set them to 0 or relative during build)
  defaultNode.applications.forEach((app) => {
    calculateLevels(app.packages, 0);
  });

  return {
    landscapeToken: flatLandscape.landscapeToken,
    nodes,
  };
}

function buildPackage(
  districtId: string,
  districts: Record<string, District>,
  buildings: Record<string, Building>
): Package | undefined {
  const district = districts[districtId];
  if (!district) return undefined;

  const pkg: Package = {
    id: district.id,
    name: district.name,
    fqn: district.fqn,
    originOfData: district.originOfData || TypeOfAnalysis.Dynamic,
    subPackages: [],
    classes: [],
    level: 0, // Will be recalculated
  };

  district.districtIds.forEach((subDistrictId) => {
    const subPkg = buildPackage(subDistrictId, districts, buildings);
    if (subPkg) {
      subPkg.parent = pkg;
      pkg.subPackages.push(subPkg);
    }
  });

  district.buildingIds.forEach((buildingId) => {
    const building = buildings[buildingId];
    if (building) {
      const cls = buildClass(building);
      cls.parent = pkg;
      pkg.classes.push(cls);
    }
  });

  return pkg;
}

function buildClass(
  building: Building
): Class {
  return {
    id: building.id,
    name: building.name,
    fqn: building.fqn,
    methods: [],
    originOfData: building.originOfData || TypeOfAnalysis.Dynamic,
    parent: undefined as any, // Set by caller
    level: 0, // Set by caller/recalculate
  };
}

function calculateLevels(packages: Package[], level: number) {
  packages.forEach((pkg) => {
    pkg.level = level;
    calculateLevels(pkg.subPackages, level + 1);
    pkg.classes.forEach((cls) => {
      cls.level = level + 1;
    });
  });
}

