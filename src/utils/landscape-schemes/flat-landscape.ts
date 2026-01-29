import {
  Application,
  Package,
  StructureLandscapeData,
  TypeOfAnalysis,
} from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';

export type FlatLandscape = {
  landscapeToken: string;
  cities: Record<string, City>;
  districts: Record<string, District>;
  buildings: Record<string, Building>;
  classes: Record<string, Cls>;
  functions: Record<string, Func>;
};

type FlatBaseModel = {
  id: string;
  name: string;
  originOfData?: TypeOfAnalysis;
  editingState?: 'added' | 'removed';
};

export enum Language {
  LANGUAGE_UNSPECIFIED = 0,
  JAVA = 1,
  JAVASCRIPT = 2,
  TYPESCRIPT = 3,
  PYTHON = 4,
  PLAINTEXT = 5,
}

export type City = FlatBaseModel & {
  rootDistrictIds: string[];
  districtIds: string[];
  buildingIds: string[];
};

export type District = FlatBaseModel & {
  parentCityId: string;
  parentDistrictId?: string;
  districtIds: string[];
  buildingIds: string[];
};

export type Building = FlatBaseModel & {
  parentCityId: string;
  parentDistrictId: string;
  language?: Language;
  classIds?: string[];
  functionIds?: string[];
  metrics?: Record<string, number>;
};

export type Cls = FlatBaseModel & {
  functionIds: string[];
};

export type Func = FlatBaseModel & {
  parentId: string;
  metrics?: Record<string, number>;
};

export function convertToFlatLandscape(
  input: StructureLandscapeData
): FlatLandscape {
  const cities: Record<string, City> = {};
  const districts: Record<string, District> = {};
  const buildings: Record<string, Building> = {};
  const classes: Record<string, Cls> = {};
  const functions: Record<string, Func> = {};

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
        parentCityId: cityId,
        parentDistrictId,
        districtIds: pkg.subPackages.map((subPkg) => subPkg.id),
        buildingIds: [],
      };

      // Handle root packages (packages without parent package)
      if (!pkg.parent) {
        cities[cityId].rootDistrictIds.push(districtId);
      }
      cities[cityId].districtIds.push(districtId);
    }

    for (const cls of pkg.classes) {
      const buildingId = cls.id;

      if (!buildings[buildingId]) {
        buildings[buildingId] = {
          id: buildingId,
          name: cls.name,
          originOfData: cls.originOfData,
          language:
            app.language === 'Java'
              ? Language.JAVA
              : Language.LANGUAGE_UNSPECIFIED,
          parentCityId: cityId,
          parentDistrictId: districtId,
          classIds: [],
          functionIds: [],
          metrics: { numOfFunctions: 0 },
        };

        districts[districtId].buildingIds.push(buildingId);
      }

      cities[cityId].buildingIds.push(buildingId);

      if (!classes[cls.id]) {
        classes[cls.id] = {
          id: cls.id,
          name: cls.name,
          originOfData: cls.originOfData,
          functionIds: [],
        };
      }

      buildings[buildingId].classIds?.push(cls.id);

      for (const method of cls.methods) {
        const functionId = method.methodHash;

        if (!functions[functionId]) {
          functions[functionId] = {
            id: functionId,
            name: method.name,
            originOfData: method.originOfData,
            parentId: buildingId,
          };
        }

        buildings[buildingId].functionIds?.push(functionId);
      }
    }

    // Recurse into sub-packages
    for (const sub of pkg.subPackages) {
      walkPackages(sub, app, cityId, currentPath, districtId);
    }
  }

  for (const node of input.nodes) {
    for (const app of node.applications) {
      const cityId = app.name;

      if (!cities[cityId]) {
        cities[cityId] = {
          id: app.id,
          name: app.name,
          rootDistrictIds: [],
          districtIds: [],
          buildingIds: [],
        };
      }

      for (const pkg of app.packages) {
        walkPackages(pkg, app, cityId, [cityId]);
      }
    }
  }

  return {
    landscapeToken: input.landscapeToken,
    cities,
    districts,
    buildings,
    classes,
    functions,
  };
}
