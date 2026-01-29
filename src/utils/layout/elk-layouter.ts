import ELK from 'elkjs/lib/elk.bundled.js';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import generateUuidv4 from 'explorviz-frontend/src/utils/helpers/uuid4-generator';
import {
  City,
  District,
  FlatLandscape,
} from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import BoxLayout from 'explorviz-frontend/src/utils/layout/box-layout';
import { calculateSpiralSideLength } from 'explorviz-frontend/src/utils/layout/spiral-layouter';
import { metricMappingMultipliers } from 'explorviz-frontend/src/utils/settings/default-settings';
import { SelectedBuildingMetric } from 'explorviz-frontend/src/utils/settings/settings-schemas';

// Prefixes with leading non-number characters are temporarily added
// since ELK cannot handle IDs with leading numbers
// We rely on prefixes having the same length for their later removal
const LANDSCAPE_PREFIX = 'land-';
const CITY_PREFIX = 'city-';
const DISTRICT_PREFIX = 'dist-';
const BUILDING_PREFIX = 'buil-';
const DUMMY_PREFIX = 'dumy-';

let CITY_ALGORITHM: string;
let DISTRICT_ALGORITHM: string;
let BUILDING_ALGORITHM: string;
let DESIRED_EDGE_LENGTH: number;
let ASPECT_RATIO: number;
let BUILDING_FOOTPRINT: number;
let WIDTH_METRIC: string;
let WIDTH_METRIC_MULTIPLIER: number;
let DEPTH_METRIC: string;
let DEPTH_METRIC_MULTIPLIER: number;
let BUILDING_MARGIN: number;
let CITY_LABEL_MARGIN: number;
let CITY_MARGIN: number;
let DISTRICT_LABEL_MARGIN: number;
let DISTRICT_MARGIN: number;
let DISTRICT_HEIGHT: number;
let DISTRICT_LABEL_PLACEMENT: string;

function setVisualizationSettings() {
  const { visualizationSettings: vs } = useUserSettingsStore.getState();

  CITY_ALGORITHM = vs.cityLayoutAlgorithm.value;
  DISTRICT_ALGORITHM = vs.districtLayoutAlgorithm.value;
  BUILDING_ALGORITHM = vs.buildingLayoutAlgorithm.value;
  DESIRED_EDGE_LENGTH = vs.cityDistance.value;
  ASPECT_RATIO = vs.cityAspectRatio.value;
  BUILDING_FOOTPRINT = vs.buildingFootprint.value;
  WIDTH_METRIC = vs.buildingWidthMetric.value;
  WIDTH_METRIC_MULTIPLIER = vs.buildingWidthMultiplier.value;
  DEPTH_METRIC = vs.buildingDepthMetric.value;
  DEPTH_METRIC_MULTIPLIER = vs.buildingDepthMultiplier.value;
  BUILDING_MARGIN = vs.buildingMargin.value;
  CITY_LABEL_MARGIN = vs.cityLabelMargin.value;
  CITY_MARGIN = vs.cityMargin.value;
  DISTRICT_LABEL_MARGIN = vs.districtLabelMargin.value;
  DISTRICT_MARGIN = vs.districtMargin.value;
  DISTRICT_HEIGHT = vs.openedDistrictHeight.value;
  DISTRICT_LABEL_PLACEMENT = vs.districtLabelPlacement.value;
}

function getPaddingForLabelPlacement(
  labelPlacement: string,
  labelMargin: number,
  baseMargin: number
): string {
  const top = labelPlacement === 'top' ? labelMargin : baseMargin;
  const bottom = labelPlacement === 'bottom' ? labelMargin : baseMargin;
  const left = labelPlacement === 'left' ? labelMargin : baseMargin;
  const right = labelPlacement === 'right' ? labelMargin : baseMargin;

  return `[top=${top},left=${left},bottom=${bottom},right=${right}]`;
}

export default async function layoutLandscape(
  landscape: FlatLandscape,
  removedDistrictIds: Set<string>
) {
  const elk = new ELK();

  setVisualizationSettings();

  const useCircleLayout = BUILDING_ALGORITHM === 'circle';
  const useSpiralLayout = BUILDING_ALGORITHM === 'spiral';
  const useCustomBuildingLayout = useCircleLayout || useSpiralLayout;

  // Initialize landscape graph
  const landscapeGraph: any = {
    id: LANDSCAPE_PREFIX + 'landscape',
    children: [],
    edges: [],
    layoutOptions: {
      algorithm: CITY_ALGORITHM,
      desiredEdgeLength: DESIRED_EDGE_LENGTH,
      'elk.padding': getPaddingForLabelPlacement(
        DISTRICT_LABEL_PLACEMENT,
        CITY_LABEL_MARGIN,
        CITY_MARGIN
      ),
    },
  };

  // Add buildings
  const cities = Object.values(landscape.cities);
  cities.forEach((city) => {
    const buildingCount = city.buildingIds.length;
    if (useCustomBuildingLayout) {
      let citySideLength = 1;
      if (useCircleLayout) {
        const circumference =
          buildingCount * (BUILDING_FOOTPRINT * 2 + BUILDING_MARGIN * 2);
        if (buildingCount <= 2) {
          citySideLength = BUILDING_FOOTPRINT * 4;
        } else {
          citySideLength = circumference / Math.PI;
        }
      } else {
        const { visualizationSettings: vs } = useUserSettingsStore.getState();

        citySideLength = calculateSpiralSideLength(
          buildingCount,
          BUILDING_FOOTPRINT,
          BUILDING_MARGIN,
          vs.spiralGap.value,
          vs.spiralCenterOffset.value
        );
      }
      landscapeGraph.children.push(
        createdFixedSizeCity(city, {
          width: citySideLength,
          depth: citySideLength,
        })
      );
      // Layout without special class layout algorithm
    } else {
      landscapeGraph.children.push(
        createCityGraph(landscape, city, removedDistrictIds)
      );
    }
  });

  // Add edges for force layout between buildings
  addEdges(landscapeGraph, cities);

  const layoutedGraph = await elk.layout(landscapeGraph);

  const boxLayoutMap = convertElkToBoxLayout(layoutedGraph);

  // Apply custom class layout if enabled
  if (useCustomBuildingLayout) {
    // Note: In flat structure with buildings, we might need a different way
    // to apply circle/spiral layout if buildings contain multiple classes.
    // For now, we keep the structure but skip the package removal since
    // we don't have packages in the building graph.
    // TODO: Adapt applyCircleLayoutToClasses and applySpiralLayoutToClasses for Building[] if needed
  }

  return boxLayoutMap;
}

function createCityGraph(
  landscape: FlatLandscape,
  city: City,
  removedDistrictIds: Set<string>
) {
  const cityGraph = {
    id: CITY_PREFIX + city.id,
    children: [],
    layoutOptions: {
      aspectRatio: ASPECT_RATIO,
      algorithm: DISTRICT_ALGORITHM,
      'elk.padding': getPaddingForLabelPlacement(
        DISTRICT_LABEL_PLACEMENT,
        CITY_LABEL_MARGIN,
        CITY_MARGIN
      ),
    },
  };

  populateCityGraph(cityGraph, landscape, city, removedDistrictIds);

  return cityGraph;
}

function createdFixedSizeCity(
  city: City,
  size: { width: number; depth: number }
) {
  const buildingGraph = {
    id: CITY_PREFIX + city.id,
    width: size.width,
    height: size.depth,
    children: [],
    layoutOptions: {
      algorithm: DISTRICT_ALGORITHM,
      'nodeSize.fixedGraphSize': true,
      'elk.padding': getPaddingForLabelPlacement(
        DISTRICT_LABEL_PLACEMENT,
        CITY_LABEL_MARGIN,
        CITY_MARGIN
      ),
    },
  };

  return buildingGraph;
}

function populateCityGraph(
  cityGraph: any,
  landscape: FlatLandscape,
  city: City,
  removedDistrictIds: Set<string>
) {
  city.rootDistrictIds.forEach((districtId) => {
    if (removedDistrictIds.has(districtId)) {
      return;
    }
    const districtGraph = {
      id: DISTRICT_PREFIX + districtId,
      children: [],
      layoutOptions: {
        algorithm: DISTRICT_ALGORITHM,
        aspectRatio: ASPECT_RATIO,
        'spacing.nodeNode': BUILDING_MARGIN,
        'elk.padding': getPaddingForLabelPlacement(
          DISTRICT_LABEL_PLACEMENT,
          DISTRICT_LABEL_MARGIN,
          DISTRICT_MARGIN
        ),
      },
    };
    cityGraph.children.push(districtGraph);

    populateDistrict(
      districtGraph.children,
      landscape,
      landscape.districts[districtId],
      removedDistrictIds
    );
  });
}

function populateDistrict(
  districtGraphChildren: any[],
  landscape: FlatLandscape,
  district: District,
  removedDistrictIds: Set<string>
) {
  district.buildingIds.forEach((buildingId) => {
    const building = landscape.buildings[buildingId];
    if (!building) {
      return;
    }
    let widthByMetric = 0;
    if (WIDTH_METRIC === SelectedBuildingMetric.Method) {
      widthByMetric = building.functionIds
        ? WIDTH_METRIC_MULTIPLIER *
          metricMappingMultipliers['Function Count'] *
          building.functionIds.length
        : 0;
    }

    let depthByMetric = 0;
    if (DEPTH_METRIC === SelectedBuildingMetric.Method) {
      depthByMetric = building.functionIds
        ? DEPTH_METRIC_MULTIPLIER *
          metricMappingMultipliers['Function Count'] *
          building.functionIds.length
        : 0;
    }

    const buildingNode = {
      id: BUILDING_PREFIX + building.id,
      children: [],
      width: BUILDING_FOOTPRINT + widthByMetric,
      height: BUILDING_FOOTPRINT + depthByMetric,
    };
    districtGraphChildren.push(buildingNode);
  });

  district.districtIds.forEach((districtId) => {
    if (removedDistrictIds.has(districtId)) {
      return;
    }
    const packageNode = {
      id: DISTRICT_PREFIX + districtId,
      children: [],
      layoutOptions: {
        algorithm: DISTRICT_ALGORITHM,
        aspectRatio: ASPECT_RATIO,
        'spacing.nodeNode': BUILDING_MARGIN,
        'elk.padding': getPaddingForLabelPlacement(
          DISTRICT_LABEL_PLACEMENT,
          DISTRICT_LABEL_MARGIN,
          DISTRICT_MARGIN
        ),
      },
    };
    districtGraphChildren.push(packageNode);

    const district = landscape.districts[districtId];
    if (district.districtIds.length > 0 || district.buildingIds.length > 0) {
      populateDistrict(
        packageNode.children,
        landscape,
        district,
        removedDistrictIds
      );
    } else {
      // Add dummy class, otherwise package would be assigned with zero width/depth
      populateWithDummyBuilding(packageNode.children);
    }
  });
}

function populateWithDummyBuilding(packageGraphChildren: any[]) {
  const dummyClassNode = {
    id: DUMMY_PREFIX + generateUuidv4(),
    children: [],
    width: BUILDING_FOOTPRINT,
    height: BUILDING_FOOTPRINT,
  };
  packageGraphChildren.push(dummyClassNode);
}

function addEdges(landscapeGraph: any, cities: City[]) {
  cities.forEach((sourceCity) => {
    cities.forEach((targetCity) => {
      if (sourceCity.id !== targetCity.id) {
        landscapeGraph.edges.push({
          id: `eFrom${sourceCity.id}to${targetCity.id}`,
          sources: [CITY_PREFIX + sourceCity.id],
          targets: [CITY_PREFIX + targetCity.id],
        });
      }
    });
  });
}

export function convertElkToBoxLayout(
  elkGraph: any,
  layoutMap = new Map<string, BoxLayout>(),
  xOffset = 0,
  zOffset = 0,
  depth = 0
): Map<string, BoxLayout> {
  let height = DISTRICT_HEIGHT;
  if (elkGraph.id.startsWith(BUILDING_PREFIX)) {
    height = BUILDING_FOOTPRINT;
  }

  const boxLayout = new BoxLayout();

  // Prevent 0 value for width and depth
  boxLayout.width = elkGraph.width || BUILDING_FOOTPRINT;
  boxLayout.depth = elkGraph.height || BUILDING_FOOTPRINT;
  boxLayout.height = height;

  boxLayout.positionX = xOffset + elkGraph.x!;
  boxLayout.positionY = DISTRICT_HEIGHT * depth;
  boxLayout.positionZ = zOffset + elkGraph.y!;

  boxLayout.level = depth;

  if (elkGraph.id.startsWith(CITY_PREFIX)) {
    // Add city offset since all districts and buildings are placed directly in city
    xOffset -= boxLayout.positionX;
    zOffset -= boxLayout.positionZ;
  }

  // Ids in ELK must not start with numbers, therefore we added letters as prefix
  if (elkGraph.id.substring(CITY_PREFIX.length) !== DUMMY_PREFIX) {
    layoutMap.set(elkGraph.id.substring(CITY_PREFIX.length), boxLayout);
  }

  elkGraph.children?.forEach((child: any) => {
    convertElkToBoxLayout(
      child,
      layoutMap,
      xOffset + elkGraph.x!,
      zOffset + elkGraph.y!,
      depth + 1
    );
  });

  return layoutMap;
}
