import ELK from 'elkjs/lib/elk.bundled';
import { Application, Package } from './landscape-schemes/structure-data';
import { getStoredNumberSetting } from './settings/local-storage-settings';

let ASPECT_RATIO: number;
let CLASS_FOOTPRINT: number;
let CLASS_MARGIN: number;
let APP_LABEL_MARGIN: number;
let APP_MARGIN: number;
let PACKAGE_LABEL_MARGIN: number;
let PACKAGE_MARGIN: number;
let COMPONENT_HEIGHT: number;

export default async function layoutCity(application: Application) {
  const elk = new ELK();

  ASPECT_RATIO = getStoredNumberSetting('applicationAspectRatio');
  CLASS_FOOTPRINT = getStoredNumberSetting('classFootprint');
  CLASS_MARGIN = getStoredNumberSetting('classMargin');
  APP_LABEL_MARGIN = getStoredNumberSetting('appLabelMargin');
  APP_MARGIN = getStoredNumberSetting('appMargin');
  PACKAGE_LABEL_MARGIN = getStoredNumberSetting('packageLabelMargin');
  PACKAGE_MARGIN = getStoredNumberSetting('packageMargin');
  COMPONENT_HEIGHT = getStoredNumberSetting('openedComponentHeight');

  const graph = {
    id: 'applc' + application.id,
    children: [],
    layoutOptions: {
      aspectRatio: ASPECT_RATIO.toString(),
      algorithm: 'rectpacking',
      'elk.padding': `[top=${APP_MARGIN},left=${APP_LABEL_MARGIN},bottom=${APP_MARGIN},right=${APP_MARGIN}]`,
    },
  };

  populateGraph(application, graph);

  return elk.layout(graph);
}

function populateGraph(application: Application, graph: any) {
  application.packages.forEach((component) => {
    const node = {
      id: 'packg' + component.id,
      children: [],
      layoutOptions: {
        algorithm: 'rectpacking',
        aspectRatio: ASPECT_RATIO,
        'spacing.nodeNode': CLASS_MARGIN,
        'elk.padding': `[top=${PACKAGE_MARGIN},left=${PACKAGE_LABEL_MARGIN},bottom=${PACKAGE_MARGIN},right=${PACKAGE_MARGIN}]`,
      },
    };
    graph.children.push(node);

    populatePackage(component, node.children);
  });
}

function populatePackage(component: Package, children: any[]) {
  component.classes.forEach((clazz) => {
    const node = {
      id: 'class' + clazz.id,
      children: [],
      width: CLASS_FOOTPRINT,
      height: CLASS_FOOTPRINT,
    };
    children.push(node);
  });

  component.subPackages.forEach((subPackage) => {
    const node = {
      id: 'packg' + subPackage.id,
      children: [],
      layoutOptions: {
        algorithm: 'rectpacking',
        aspectRatio: ASPECT_RATIO,
        'spacing.nodeNode': CLASS_MARGIN,
        'elk.padding': `[top=${PACKAGE_MARGIN},left=${PACKAGE_LABEL_MARGIN},bottom=${PACKAGE_MARGIN},right=${PACKAGE_MARGIN}]`,
      },
    };
    children.push(node);

    if (subPackage.subPackages.length > 0 || subPackage.classes.length > 0) {
      populatePackage(subPackage, node.children);
    }
  });
}

export function convertElkToLayoutData(
  elkGraph: any,
  layoutMap: any,
  xOffset = 0,
  zOffset = 0,
  depth = 0
): void {
  const SCALAR = 0.3;

  let height = COMPONENT_HEIGHT;
  if (elkGraph.id.startsWith('class')) {
    height = 5;
  }

  layoutMap.set(elkGraph.id.substring(5), {
    height: height,
    width: elkGraph.width! * SCALAR,
    depth: elkGraph.height! * SCALAR,
    positionX: (xOffset + elkGraph.x!) * SCALAR,
    positionY: COMPONENT_HEIGHT * depth,
    positionZ: (zOffset + elkGraph.y!) * SCALAR,
  });

  elkGraph.children?.forEach((child: any) => {
    convertElkToLayoutData(
      child,
      layoutMap,
      xOffset + elkGraph.x!,
      zOffset + elkGraph.y!,
      depth + 1
    );
  });
}
