import ELK from 'elkjs/lib/elk.bundled';
import { Application, Package } from './landscape-schemes/structure-data';

export default async function layoutCity(application: Application) {
  const elk = new ELK();

  const graph = {
    id: 'applc' + application.id,
    children: [],
    layoutOptions: {
      // aspectRatio: '1.0',
      algorithm: 'rectpacking',
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
      /*
      layoutOptions:
        component.classes.length > 0
          ? {}
          : {
              'elk.padding': '[top=0.0,left=0.0,bottom=0.0,right=0.0]',
            },
      */
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
      width: 5,
      height: 5,
    };
    children.push(node);
  });

  component.subPackages.forEach((subPackage) => {
    const node = {
      id: 'packg' + subPackage.id,
      children: [],
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
