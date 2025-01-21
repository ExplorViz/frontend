import ELK from 'elkjs/lib/elk.bundled.js';
import { Application, Package } from './landscape-schemes/structure-data';
import { getStoredNumberSetting } from './settings/local-storage-settings';
import BoxLayout from 'explorviz-frontend/view-objects/layout-models/box-layout';

// We rely on prefixes having the same length
const APP_PREFIX = 'applc';
const PACKAGE_PREFIX = 'packg';
const CLASS_PREFIX = 'class';

let ASPECT_RATIO: number;
let CLASS_FOOTPRINT: number;
let CLASS_MARGIN: number;
let APP_LABEL_MARGIN: number;
let APP_MARGIN: number;
let PACKAGE_LABEL_MARGIN: number;
let PACKAGE_MARGIN: number;
let COMPONENT_HEIGHT: number;

export default async function layoutLandscape(applications: Application[]) {
  const elk = new ELK();

  ASPECT_RATIO = getStoredNumberSetting('applicationAspectRatio');
  CLASS_FOOTPRINT = getStoredNumberSetting('classFootprint');
  CLASS_MARGIN = getStoredNumberSetting('classMargin');
  APP_LABEL_MARGIN = getStoredNumberSetting('appLabelMargin');
  APP_MARGIN = getStoredNumberSetting('appMargin');
  PACKAGE_LABEL_MARGIN = getStoredNumberSetting('packageLabelMargin');
  PACKAGE_MARGIN = getStoredNumberSetting('packageMargin');
  COMPONENT_HEIGHT = getStoredNumberSetting('openedComponentHeight');

  // Initialize landscape graph
  const landscapeGraph: any = {
    id: 'landscape',
    children: [],
    edges: [],
    layoutOptions: {
      algorithm: 'force',
      'elk.padding': `[top=${APP_MARGIN},left=${APP_MARGIN},bottom=${APP_MARGIN},right=${APP_MARGIN}]`,
    },
  };

  // Add applications
  applications.forEach((app) => {
    const appGraph = createApplicationGraph(app);
    landscapeGraph.children.push(appGraph);
  });

  // Add edges for force layout between applications
  addEdges(landscapeGraph, applications);

  const layoutedGraph = await elk.layout(landscapeGraph);

  return convertToGraphLayoutMap(layoutedGraph);
}

function createApplicationGraph(application: Application) {
  const appGraph = {
    id: APP_PREFIX + application.id,
    children: [],
    layoutOptions: {
      aspectRatio: ASPECT_RATIO.toString(),
      algorithm: 'rectpacking',
      'elk.padding': `[top=${APP_MARGIN},left=${APP_LABEL_MARGIN},bottom=${APP_MARGIN},right=${APP_MARGIN}]`,
    },
  };
  populateAppGraph(appGraph, application);

  return appGraph;
}

function populateAppGraph(appGraph: any, application: Application) {
  application.packages.forEach((component) => {
    const packageGraph = {
      id: PACKAGE_PREFIX + component.id,
      children: [],
      layoutOptions: {
        algorithm: 'rectpacking',
        aspectRatio: ASPECT_RATIO,
        'spacing.nodeNode': CLASS_MARGIN,
        'elk.padding': `[top=${PACKAGE_MARGIN},left=${PACKAGE_LABEL_MARGIN},bottom=${PACKAGE_MARGIN},right=${PACKAGE_MARGIN}]`,
      },
    };
    appGraph.children.push(packageGraph);

    populatePackage(packageGraph.children, component);
  });
}

function populatePackage(packageGraphChildren: any[], component: Package) {
  component.classes.forEach((clazz) => {
    const node = {
      id: CLASS_PREFIX + clazz.id,
      children: [],
      width: CLASS_FOOTPRINT,
      height: CLASS_FOOTPRINT,
    };
    packageGraphChildren.push(node);
  });

  component.subPackages.forEach((subPackage) => {
    const node = {
      id: PACKAGE_PREFIX + subPackage.id,
      children: [],
      layoutOptions: {
        algorithm: 'rectpacking',
        aspectRatio: ASPECT_RATIO,
        'spacing.nodeNode': CLASS_MARGIN,
        'elk.padding': `[top=${PACKAGE_MARGIN},left=${PACKAGE_LABEL_MARGIN},bottom=${PACKAGE_MARGIN},right=${PACKAGE_MARGIN}]`,
      },
    };
    packageGraphChildren.push(node);

    if (subPackage.subPackages.length > 0 || subPackage.classes.length > 0) {
      populatePackage(node.children, subPackage);
    }
  });
}

function addEdges(landscapeGraph: any, applications: Application[]) {
  applications.forEach((sourceApp) => {
    applications.forEach((targetApp) => {
      landscapeGraph.edges.push({
        id: `eFrom${sourceApp.id}to${targetApp.id}`,
        sources: [`${APP_PREFIX}${sourceApp.id}`],
        targets: [`${APP_PREFIX}${targetApp.id}`],
      });
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
  const SCALAR = 0.3;

  let height = COMPONENT_HEIGHT;
  if (elkGraph.id.startsWith('class')) {
    height = 5;
  }

  const boxLayout = new BoxLayout();
  boxLayout.positionX = (xOffset + elkGraph.x!) * SCALAR;
  boxLayout.positionY = COMPONENT_HEIGHT * depth;
  boxLayout.positionZ = (zOffset + elkGraph.y!) * SCALAR;
  boxLayout.width = elkGraph.width! * SCALAR;
  boxLayout.height = height;
  boxLayout.depth = elkGraph.height! * SCALAR;

  // Ids in ELK must not start with numbers, therefore we added 5 letters
  layoutMap.set(elkGraph.id.substring(APP_PREFIX.length), boxLayout);

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

export function convertToGraphLayoutMap(layoutedGraph: any) {
  const graphLayoutMap = new Map();
  for (let index = 0; index < layoutedGraph.children.length; index++) {
    const appGraph = layoutedGraph.children[index];
    const appId = appGraph.id.substring(APP_PREFIX.length);
    graphLayoutMap.set(appId, appGraph);
  }
  return graphLayoutMap;
}
