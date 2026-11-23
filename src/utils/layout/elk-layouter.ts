import { useEvolutionAnimationStore } from 'explorviz-frontend/src/components/visualization/page-setup/bottom-bar/animation/evolution-animation-store.ts';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import {
  Building,
  City,
  District,
  FlatLandscape,
  getFlatLandscapeStructureSignature,
} from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import BoxLayout from 'explorviz-frontend/src/utils/layout/box-layout';
import { applyCircleLayoutToClasses as applyCircleLayoutToBuildings } from 'explorviz-frontend/src/utils/layout/circle-layouter';
import getElk from 'explorviz-frontend/src/utils/layout/elk-instance';
import {
  BuildingSizing,
  getBuildingFootprint,
  getCustomBuildingLayoutCitySize,
  getMinimumCitySize,
  getPaddingForLabelPlacement as getPadding,
  hasVisibleBuildingsRecursively,
} from 'explorviz-frontend/src/utils/layout/layout-dimensions';
import { applySpiralLayoutToClasses as applySpiralLayoutToBuildings } from 'explorviz-frontend/src/utils/layout/spiral-layouter';
import { getCachedBuildingMetricBounds } from 'explorviz-frontend/src/utils/settings/building-metrics';
import { VisualizationSettings } from 'explorviz-frontend/src/utils/settings/settings-schemas';

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
let BUILDING_SIZING: BuildingSizing;
let BUILDING_MARGIN: number;
let CITY_LABEL_MARGIN: number;
let CITY_PADDING: number;
let CITY_MARGIN: number;
let DISTRICT_LABEL_MARGIN: number;
let DISTRICT_PADDING: number;
let DISTRICT_HEIGHT: number;
let DISTRICT_LABEL_PLACEMENT: string;
let VISUALIZATION_SETTINGS: VisualizationSettings;

//Caching for performance reasons
let cachedLayoutResult: Map<string, BoxLayout> | null = null;
let cachedLayoutSignature: string | null = null;
let cachedLandscapeSignature: string | null = null;
let cachedSkeletonRef: FlatLandscape | null = null;
let pendingLayout: Promise<Map<string, BoxLayout>> | null = null;
let pendingLandscapeRef: FlatLandscape | null = null;
let pendingLandscapeSignature: string | null = null;
let pendingSkeletonRef: FlatLandscape | null = null;
let pendingSignature: string | null = null;
let layoutGeneration = 0;
let latestCacheableGeneration = 0;

export function invalidateLayoutCache(): void {
  cachedLayoutResult = null;
  cachedLayoutSignature = null;
  cachedLandscapeSignature = null;
  cachedSkeletonRef = null;
  pendingLayout = null;
  pendingLandscapeRef = null;
  pendingLandscapeSignature = null;
  pendingSkeletonRef = null;
  pendingSignature = null;
  layoutGeneration = 0;
  latestCacheableGeneration = 0;
}

function layoutCoversLandscape(layoutMap: Map<string, BoxLayout>, landscape: FlatLandscape): boolean {
  for (const buildingId of Object.keys(landscape.buildings)) {
    if (!layoutMap.has(buildingId)) {
      return false;
    }
  }
  return true;
}

function layoutInputSignature(landscape: FlatLandscape, removedDistrictIds: Set<string>): string {
  const { visualizationSettings: vs } = useUserSettingsStore.getState();
  const settings = Object.entries(vs)
    .map(([id, setting]) => `${id}=${(setting as { value: unknown }).value}`)
    .join('|');
  // Take city labels into account as they could affect the minimum size of cities
  const cityIdsAndLabels = Object.values(landscape.cities)
    .map((city) => `${city.id}:${city.name}`)
    .join(',');
  return `${settings};removed=${[...removedDistrictIds].join(',')};cities=${cityIdsAndLabels}`;
}

function setVisualizationSettings() {
  const { visualizationSettings: vs } = useUserSettingsStore.getState();

  VISUALIZATION_SETTINGS = vs;
  CITY_ALGORITHM = vs.cityLayoutAlgorithm.value;
  DISTRICT_ALGORITHM = vs.districtLayoutAlgorithm.value;
  BUILDING_ALGORITHM = vs.buildingLayoutAlgorithm.value;
  DESIRED_EDGE_LENGTH = vs.cityDistance.value;
  ASPECT_RATIO = vs.cityAspectRatio.value;
  BUILDING_FOOTPRINT = vs.buildingFootprint.value;
  BUILDING_MARGIN = vs.buildingMargin.value;
  CITY_LABEL_MARGIN = vs.cityLabelMargin.value;
  CITY_PADDING = vs.cityPadding.value;
  CITY_MARGIN = vs.cityMargin.value;
  DISTRICT_LABEL_MARGIN = vs.districtLabelMargin.value;
  DISTRICT_PADDING = vs.districtPadding.value;
  DISTRICT_HEIGHT = vs.openedDistrictHeight.value;
  DISTRICT_LABEL_PLACEMENT = vs.districtLabelPlacement.value;
}

function getPaddingForLabelPlacement(labelPlacement: string, labelMargin: number, baseMargin: number): string {
  const { top, left, bottom, right } = getPadding(labelPlacement, labelMargin, baseMargin);
  return `[top=${top},left=${left},bottom=${bottom},right=${right}]`;
}

export default async function layoutLandscape(landscape: FlatLandscape, removedDistrictIds: Set<string>) {
  setVisualizationSettings();
  const generation = ++layoutGeneration;
  const animationState = useEvolutionAnimationStore.getState();
  const skeleton = animationState.stableFrame;
  const cacheable = skeleton != null;
  if (cacheable) {
    latestCacheableGeneration = generation;
  }
  const signature = layoutInputSignature(landscape, removedDistrictIds);
  const landscapeSignature = getFlatLandscapeStructureSignature(landscape);

  if (
    cacheable &&
    cachedLayoutResult !== null &&
    cachedSkeletonRef === skeleton &&
    cachedLayoutSignature === signature &&
    cachedLandscapeSignature === landscapeSignature &&
    layoutCoversLandscape(cachedLayoutResult, landscape)
  ) {
    return cachedLayoutResult;
  }

  // The landscape watcher and the canvas both request a layout when new
  // landscape data arrives. Since the result is fully determined by the
  // landscape, the removed districts and the visualization settings, an
  // in-flight run with identical inputs can always be shared instead of paying
  // for a second ELK pass.
  if (
    pendingLayout !== null &&
    pendingLandscapeRef === landscape &&
    pendingLandscapeSignature === landscapeSignature &&
    pendingSkeletonRef === skeleton &&
    pendingSignature === signature
  ) {
    return pendingLayout;
  }

  const run = computeLayout(landscape, removedDistrictIds);

  pendingLayout = run;
  pendingLandscapeRef = landscape;
  pendingLandscapeSignature = landscapeSignature;
  pendingSkeletonRef = skeleton;
  pendingSignature = signature;

  try {
    const boxLayoutMap = await run;
    if (cacheable && generation === latestCacheableGeneration) {
      cachedLayoutSignature = signature;
      cachedLandscapeSignature = landscapeSignature;
      cachedSkeletonRef = skeleton;
      cachedLayoutResult = boxLayoutMap;
    }
    return boxLayoutMap;
  } finally {
    if (pendingLayout === run) {
      pendingLayout = null;
      pendingLandscapeRef = null;
      pendingLandscapeSignature = null;
      pendingSkeletonRef = null;
      pendingSignature = null;
    }
  }
}

async function computeLayout(landscape: FlatLandscape, removedDistrictIds: Set<string>) {
  BUILDING_SIZING = {
    vs: VISUALIZATION_SETTINGS,
    widthBounds: getCachedBuildingMetricBounds(landscape.buildings, VISUALIZATION_SETTINGS.buildingWidthMetric.value),
    depthBounds: getCachedBuildingMetricBounds(landscape.buildings, VISUALIZATION_SETTINGS.buildingDepthMetric.value),
  };

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
      ...(CITY_MARGIN_ALGORITHMS.has(CITY_ALGORITHM) ? { 'spacing.nodeNode': CITY_MARGIN } : {}),
      'elk.padding': getPaddingForLabelPlacement(DISTRICT_LABEL_PLACEMENT, CITY_LABEL_MARGIN, CITY_PADDING),
    },
  };

  // Add buildings
  const cities = Object.values(landscape.cities);
  cities.forEach((city) => {
    if (useCustomBuildingLayout) {
      landscapeGraph.children.push(
        createdFixedSizeCity(city, getCustomBuildingLayoutCitySize(landscape, city, VISUALIZATION_SETTINGS))
      );
      // Layout without special class layout algorithm
    } else {
      landscapeGraph.children.push(createCityGraph(landscape, city, removedDistrictIds));
    }
  });

  // Add edges for force layout between buildings
  addEdges(landscapeGraph, cities);

  const elk = await getElk();
  const layoutedGraph = await elk.layout(landscapeGraph);

  const boxLayoutMap = convertElkToBoxLayout(layoutedGraph);

  // Apply custom building layout if enabled
  if (useCustomBuildingLayout) {
    if (useCircleLayout) {
      applyCircleLayoutToBuildings(boxLayoutMap, landscape, cities);
    } else {
      applySpiralLayoutToBuildings(boxLayoutMap, landscape, cities);
    }
  }
  return boxLayoutMap;
}

function createCityGraph(landscape: FlatLandscape, city: City, removedDistrictIds: Set<string>) {
  const minimumSize = getMinimumCitySize(city, VISUALIZATION_SETTINGS);
  const cityGraph = {
    id: CITY_PREFIX + city.id,
    children: [],
    layoutOptions: {
      'elk.nodeSize.constraints': 'MINIMUM_SIZE',
      'elk.nodeSize.minimum': `(${minimumSize.width}, ${minimumSize.height})`,
      aspectRatio: ASPECT_RATIO,
      algorithm: DISTRICT_ALGORITHM,
      'elk.padding': getPaddingForLabelPlacement(DISTRICT_LABEL_PLACEMENT, CITY_LABEL_MARGIN, CITY_PADDING),
    },
  };

  populateCityGraph(cityGraph, landscape, city, removedDistrictIds);

  return cityGraph;
}

function createdFixedSizeCity(city: City, size: { width: number; depth: number }) {
  const buildingGraph: any = {
    id: CITY_PREFIX + city.id,
    width: size.width,
    height: size.depth,
    children: [],
    layoutOptions: {
      algorithm: DISTRICT_ALGORITHM,
      'nodeSize.fixedGraphSize': true,
      'elk.padding': getPaddingForLabelPlacement(DISTRICT_LABEL_PLACEMENT, CITY_LABEL_MARGIN, CITY_PADDING),
    },
  };

  return buildingGraph;
}

function populateCityGraph(cityGraph: any, landscape: FlatLandscape, city: City, removedDistrictIds: Set<string>) {
  city.districtIds.forEach((districtId) => {
    if (removedDistrictIds.has(districtId)) {
      return;
    }
    const district = landscape.districts[districtId];
    if (!district || !hasVisibleBuildingsRecursively(landscape, district, removedDistrictIds)) {
      return;
    }
    const districtGraph = {
      id: DISTRICT_PREFIX + districtId,
      children: [],
      layoutOptions: {
        algorithm: DISTRICT_ALGORITHM,
        aspectRatio: ASPECT_RATIO,
        'spacing.nodeNode': BUILDING_MARGIN,
        'elk.padding': getPaddingForLabelPlacement(DISTRICT_LABEL_PLACEMENT, DISTRICT_LABEL_MARGIN, DISTRICT_PADDING),
      },
    };
    cityGraph.children.push(districtGraph);

    populateDistrict(districtGraph.children, landscape, district, removedDistrictIds);
  });

  city.buildingIds.forEach((buildingId) => {
    const building = landscape.buildings[buildingId];
    if (!building) {
      return;
    }
    const buildingNode = createBuildingNode(building);
    cityGraph.children.push(buildingNode);
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
    const buildingNode = createBuildingNode(building);
    districtGraphChildren.push(buildingNode);
  });

  district.districtIds.forEach((districtId) => {
    if (removedDistrictIds.has(districtId)) {
      return;
    }
    const district = landscape.districts[districtId];
    if (!district || !hasVisibleBuildingsRecursively(landscape, district, removedDistrictIds)) {
      return;
    }
    const packageNode = {
      id: DISTRICT_PREFIX + districtId,
      children: [],
      layoutOptions: {
        algorithm: DISTRICT_ALGORITHM,
        aspectRatio: ASPECT_RATIO,
        'spacing.nodeNode': BUILDING_MARGIN,
        'elk.padding': getPaddingForLabelPlacement(DISTRICT_LABEL_PLACEMENT, DISTRICT_LABEL_MARGIN, DISTRICT_PADDING),
      },
    };
    districtGraphChildren.push(packageNode);

    populateDistrict(packageNode.children, landscape, district, removedDistrictIds);
  });
}

function createBuildingNode(building: Building) {
  const { width, depth } = getBuildingFootprint(building, BUILDING_SIZING);
  return {
    id: BUILDING_PREFIX + building.id,
    children: [],
    width,
    height: depth,
  };
}

// These algorithms position cities purely by size, so the complete city graph
// below would be built (O(cities²) edges) and shipped to ELK for nothing.
// Verified to yield identical layouts with and without the edges; `random`,
// `force`, `stress` and `layered` do react to them and are therefore excluded.
const EDGE_AGNOSTIC_CITY_ALGORITHMS = new Set(['box', 'rectpacking', 'sporeOverlap']);

const CITY_MARGIN_ALGORITHMS = new Set(['box', 'random', 'rectpacking', 'sporeOverlap']);

function addEdges(landscapeGraph: any, cities: City[]) {
  if (EDGE_AGNOSTIC_CITY_ALGORITHMS.has(CITY_ALGORITHM)) {
    return;
  }

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
    convertElkToBoxLayout(child, layoutMap, xOffset + elkGraph.x!, zOffset + elkGraph.y!, depth + 1);
  });

  return layoutMap;
}
