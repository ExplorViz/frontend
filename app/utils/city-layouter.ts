import ELK from 'elkjs/lib/elk.bundled';
import { Application, Package } from './landscape-schemes/structure-data';

const APP_ASPECT_RATIO = 1;
const PACKAGE_ASPECT_RATIO = 1.25;

const CLASS_FOOTPRINT = 5;
const CLASS_MARGIN = 10;

const APP_LABEL_MARGIN = 15;
const APP_MARGIN = 6;

const PACKAGE_LABEL_MARGIN = 13;
const PACKAGE_MARGIN = 6;

export default async function layoutCity(application: Application) {
  const elk = new ELK();

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
