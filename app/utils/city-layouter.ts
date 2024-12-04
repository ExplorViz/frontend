import ELK from 'elkjs/lib/elk.bundled';
import { Application, Package } from './landscape-schemes/structure-data';
import { getStoredSettingValueById } from './settings/local-storage-settings';

let APP_ASPECT_RATIO = getStoredSettingValueById('applicationAspectRatio');
let PACKAGE_ASPECT_RATIO = getStoredSettingValueById('packageAspectRatio');
let CLASS_FOOTPRINT = getStoredSettingValueById('classFootprint');
let CLASS_MARGIN = getStoredSettingValueById('classMargin');
let APP_LABEL_MARGIN = getStoredSettingValueById('appLabelMargin');
let APP_MARGIN = getStoredSettingValueById('appMargin');
let PACKAGE_LABEL_MARGIN = getStoredSettingValueById('packageLabelMargin');
let PACKAGE_MARGIN = getStoredSettingValueById('packageMargin');

export default async function layoutCity(application: Application) {
  const elk = new ELK();

  APP_ASPECT_RATIO = getStoredSettingValueById('applicationAspectRatio');
  PACKAGE_ASPECT_RATIO = getStoredSettingValueById('packageAspectRatio');
  CLASS_FOOTPRINT = getStoredSettingValueById('classFootprint');
  CLASS_MARGIN = getStoredSettingValueById('classMargin');
  APP_LABEL_MARGIN = getStoredSettingValueById('appLabelMargin');
  APP_MARGIN = getStoredSettingValueById('appMargin');
  PACKAGE_LABEL_MARGIN = getStoredSettingValueById('packageLabelMargin');
  PACKAGE_MARGIN = getStoredSettingValueById('packageMargin');

  const graph = {
    id: 'applc' + application.id,
    children: [],
    layoutOptions: {
      aspectRatio: APP_ASPECT_RATIO.toString(),
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
        aspectRatio: PACKAGE_ASPECT_RATIO,
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
        aspectRatio: PACKAGE_ASPECT_RATIO,
        'spacing.node': CLASS_MARGIN,
        'elk.padding': `[top=${PACKAGE_MARGIN},left=${PACKAGE_LABEL_MARGIN},bottom=${PACKAGE_MARGIN},right=${PACKAGE_MARGIN}]`,
      },
      /*
      layoutOptions:
        subPackage.classes.length > 0
          ? {}
          : {
              'elk.padding': '[top=0.0,left=0.0,bottom=0.0,right=0.0]',
            },
      */
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
  depth = 1
): void {
  const SCALAR = 0.3;
  const COMPONENT_HEIGHT = 1.5;

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
