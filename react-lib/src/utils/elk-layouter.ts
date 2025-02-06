import ELK from 'elkjs/lib/elk.bundled.js';
import {
  Application,
  K8sDeployment,
  K8sNamespace,
  K8sNode,
  K8sPod,
  Package,
} from './landscape-schemes/structure-data';
import { getStoredNumberSetting } from './settings/local-storage-settings';
import BoxLayout from 'react-lib/src/view-objects/layout-models/box-layout';

// Prefixes with leading non-number characters are temporarily added
// since ELK cannot handle IDs with leading numbers
// We rely on prefixes having the same length for later removal
const LANDSCAPE_PREFIX = 'land-';
const K8S_NODE_PREFIX = 'node-';
const K8S_NAMESPACE_PREFIX = 'nspc-';
const K8S_DEPLOYMENT_PREFIX = 'depl-';
const K8S_POD_PREFIX = 'kpod-';
const APP_PREFIX = 'appl-';
const PACKAGE_PREFIX = 'pack-';
const CLASS_PREFIX = 'clss-';

let DESIRED_EDGE_LENGTH: number;
let ASPECT_RATIO: number;
let CLASS_FOOTPRINT: number;
let CLASS_MARGIN: number;
let APP_LABEL_MARGIN: number;
let APP_MARGIN: number;
let PACKAGE_LABEL_MARGIN: number;
let PACKAGE_MARGIN: number;
let COMPONENT_HEIGHT: number;

export default async function layoutLandscape(
  k8sNodes: K8sNode[],
  applications: Application[]
) {
  const elk = new ELK();

  DESIRED_EDGE_LENGTH = getStoredNumberSetting('applicationDistance');
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
    id: LANDSCAPE_PREFIX + 'landscape',
    children: [],
    edges: [],
    layoutOptions: {
      algorithm: 'stress',
      desiredEdgeLength: DESIRED_EDGE_LENGTH,
      'elk.padding': `[top=${APP_MARGIN},left=${APP_MARGIN},bottom=${APP_MARGIN},right=${APP_MARGIN}]`,
    },
  };

  k8sNodes.forEach((k8sNode) => {
    const k8sNodeGraph = createK8sNodeGraph(k8sNode);
    landscapeGraph.children.push(k8sNodeGraph);
  });

  // Add applications
  applications.forEach((app) => {
    const appGraph = createApplicationGraph(app);
    landscapeGraph.children.push(appGraph);
  });

  // Add edges for force layout between applications
  addEdges(landscapeGraph, applications);

  const layoutedGraph = await elk.layout(landscapeGraph);

  return convertElkToBoxLayout(layoutedGraph);
}

function createK8sNodeGraph(k8sNode: K8sNode) {
  const k8sNodeGraph = {
    id: K8S_NODE_PREFIX + k8sNode.name,
    children: [],
    layoutOptions: {
      aspectRatio: ASPECT_RATIO.toString(),
      algorithm: 'rectpacking',
      'elk.padding': `[top=${APP_MARGIN},left=${APP_MARGIN},bottom=${APP_LABEL_MARGIN},right=${APP_MARGIN}]`,
    },
  };

  populateK8sNodeGraph(k8sNodeGraph, k8sNode.k8sNamespaces);

  return k8sNodeGraph;
}

function populateK8sNodeGraph(nodeGraph: any, namespaces: K8sNamespace[]) {
  namespaces.forEach((namespace) => {
    const namespaceGraph = {
      id: K8S_NAMESPACE_PREFIX + namespace.name,
      children: [],
      layoutOptions: {
        aspectRatio: ASPECT_RATIO.toString(),
        algorithm: 'rectpacking',
        'elk.padding': `[top=${APP_MARGIN},left=${APP_MARGIN},bottom=${APP_LABEL_MARGIN},right=${APP_MARGIN}]`,
      },
    };

    populateNamespaceGraph(namespaceGraph, namespace.k8sDeployments);

    nodeGraph.children.push(namespaceGraph);
  });
}

function populateNamespaceGraph(
  namespaceGraph: any,
  deployments: K8sDeployment[]
) {
  deployments.forEach((deployment) => {
    const deploymentGraph = {
      id: K8S_DEPLOYMENT_PREFIX + deployment.name,
      children: [],
      layoutOptions: {
        aspectRatio: ASPECT_RATIO.toString(),
        algorithm: 'rectpacking',
        'elk.padding': `[top=${APP_MARGIN},left=${APP_MARGIN},bottom=${APP_LABEL_MARGIN},right=${APP_MARGIN}]`,
      },
    };

    populateDeployment(deploymentGraph, deployment.k8sPods);

    namespaceGraph.children.push(deploymentGraph);
  });
}

function populateDeployment(deploymentGraph: any, pods: K8sPod[]) {
  pods.forEach((pod) => {
    const podGraph = {
      id: K8S_POD_PREFIX + pod.name,
      children: [],
      layoutOptions: {
        aspectRatio: ASPECT_RATIO.toString(),
        algorithm: 'rectpacking',
        'elk.padding': `[top=${APP_MARGIN},left=${APP_MARGIN},bottom=${APP_LABEL_MARGIN},right=${APP_MARGIN}]`,
      },
    };

    populatePod(podGraph, pod.applications);

    deploymentGraph.children.push(podGraph);
  });
}

function populatePod(podGraph: any, applications: Application[]) {
  applications.forEach((application) => {
    const appGraph = createApplicationGraph(application);

    podGraph.children.push(appGraph);
  });
}

function createApplicationGraph(application: Application) {
  const appGraph = {
    id: APP_PREFIX + application.id,
    children: [],
    layoutOptions: {
      aspectRatio: ASPECT_RATIO,
      algorithm: 'rectpacking',
      'elk.padding': `[top=${APP_MARGIN},left=${APP_MARGIN},bottom=${APP_LABEL_MARGIN},right=${APP_MARGIN}]`,
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
        'elk.padding': `[top=${PACKAGE_MARGIN},left=${PACKAGE_MARGIN},bottom=${PACKAGE_LABEL_MARGIN},right=${PACKAGE_MARGIN}]`,
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
        'elk.padding': `[top=${PACKAGE_MARGIN},left=${PACKAGE_MARGIN},bottom=${PACKAGE_LABEL_MARGIN},right=${PACKAGE_MARGIN}]`,
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
        sources: [APP_PREFIX + sourceApp.id],
        targets: [APP_PREFIX + targetApp.id],
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
  if (elkGraph.id.startsWith(CLASS_PREFIX)) {
    height = 5;
  }

  const boxLayout = new BoxLayout();
  boxLayout.positionX = (xOffset + elkGraph.x!) * SCALAR;
  boxLayout.positionY = COMPONENT_HEIGHT * depth;
  boxLayout.positionZ = (zOffset + elkGraph.y!) * SCALAR;
  boxLayout.width = elkGraph.width! * SCALAR;
  boxLayout.height = height;
  boxLayout.depth = elkGraph.height! * SCALAR;

  // Landscape and applications are on the same level
  if (elkGraph.id.startsWith(LANDSCAPE_PREFIX)) {
    // eslint-disable-next-line
    depth = depth - 1;
  }

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
