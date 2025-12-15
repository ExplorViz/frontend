import ELK from 'elkjs/lib/elk.bundled.js';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import {
  getAllClassIdsInApplication,
  getAllPackageIdsInApplications,
} from 'explorviz-frontend/src/utils/application-helpers';
import generateUuidv4 from 'explorviz-frontend/src/utils/helpers/uuid4-generator';
import { metricMappingMultipliers } from 'explorviz-frontend/src/utils/settings/default-settings';
import { SelectedClassMetric } from 'explorviz-frontend/src/utils/settings/settings-schemas';
import BoxLayout from 'explorviz-frontend/src/view-objects/layout-models/box-layout';
import {
  applyCircleLayoutToClasses,
  collectApplicationClassesForCircleLayout,
} from './circle-layouter';
import {
  applySpiralLayoutToClasses,
  calculateSpiralSideLength,
} from './spiral-layouter';
import {
  Application,
  K8sDeployment,
  K8sNamespace,
  K8sNode,
  K8sPod,
  Package,
} from './landscape-schemes/structure-data';

// Prefixes with leading non-number characters are temporarily added
// since ELK cannot handle IDs with leading numbers
// We rely on prefixes having the same length for their later removal
const LANDSCAPE_PREFIX = 'land-';
const K8S_NODE_PREFIX = 'node-';
const K8S_NAMESPACE_PREFIX = 'nspc-';
const K8S_DEPLOYMENT_PREFIX = 'depl-';
const K8S_POD_PREFIX = 'kpod-';
const APP_PREFIX = 'appl-';
const PACKAGE_PREFIX = 'pack-';
const CLASS_PREFIX = 'clss-';
const DUMMY_PREFIX = 'dumy-';

let APPLICATION_ALGORITHM: string;
let PACKAGE_ALGORITHM: string;
let CLASS_ALGORITHM: string;
let DESIRED_EDGE_LENGTH: number;
let ASPECT_RATIO: number;
let CLASS_FOOTPRINT: number;
let WIDTH_METRIC: string;
let WIDTH_METRIC_MULTIPLIER: number;
let DEPTH_METRIC: string;
let DEPTH_METRIC_MULTIPLIER: number;
let CLASS_MARGIN: number;
let APP_LABEL_MARGIN: number;
let APP_MARGIN: number;
let PACKAGE_LABEL_MARGIN: number;
let PACKAGE_MARGIN: number;
let COMPONENT_HEIGHT: number;
let COMPONENT_LABEL_PLACEMENT: string;

function setVisualizationSettings() {
  const { visualizationSettings: vs } = useUserSettingsStore.getState();

  APPLICATION_ALGORITHM = vs.applicationLayoutAlgorithm.value;
  PACKAGE_ALGORITHM = vs.packageLayoutAlgorithm.value;
  CLASS_ALGORITHM = vs.classLayoutAlgorithm.value;
  DESIRED_EDGE_LENGTH = vs.applicationDistance.value;
  ASPECT_RATIO = vs.applicationAspectRatio.value;
  CLASS_FOOTPRINT = vs.classFootprint.value;
  WIDTH_METRIC = vs.classWidthMetric.value;
  WIDTH_METRIC_MULTIPLIER = vs.classWidthMultiplier.value;
  DEPTH_METRIC = vs.classDepthMetric.value;
  DEPTH_METRIC_MULTIPLIER = vs.classDepthMultiplier.value;
  CLASS_MARGIN = vs.classMargin.value;
  APP_LABEL_MARGIN = vs.appLabelMargin.value;
  APP_MARGIN = vs.appMargin.value;
  PACKAGE_LABEL_MARGIN = vs.packageLabelMargin.value;
  PACKAGE_MARGIN = vs.packageMargin.value;
  COMPONENT_HEIGHT = vs.openedComponentHeight.value;
  COMPONENT_LABEL_PLACEMENT = vs.componentLabelPlacement.value;
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
  k8sNodes: K8sNode[],
  applications: Application[],
  removedComponentIds: Set<string>
) {
  const elk = new ELK();

  setVisualizationSettings();

  const useCircleLayout = CLASS_ALGORITHM === 'circle';
  const useSpiralLayout = CLASS_ALGORITHM === 'spiral';
  const useCustomClassLayout = useCircleLayout || useSpiralLayout;

  // Initialize landscape graph
  const landscapeGraph: any = {
    id: LANDSCAPE_PREFIX + 'landscape',
    children: [],
    edges: [],
    layoutOptions: {
      algorithm: APPLICATION_ALGORITHM,
      desiredEdgeLength: DESIRED_EDGE_LENGTH,
      'elk.padding': getPaddingForLabelPlacement(
        COMPONENT_LABEL_PLACEMENT,
        APP_LABEL_MARGIN,
        APP_MARGIN
      ),
    },
  };

  k8sNodes.forEach((k8sNode) => {
    const k8sNodeGraph = createK8sNodeGraph(k8sNode);
    landscapeGraph.children.push(k8sNodeGraph);
  });

  // Add applications
  applications.forEach((app) => {
    const classCount = getAllClassIdsInApplication(app).length;
    if (useCustomClassLayout) {
      if (useCircleLayout) {
        const circumference =
          classCount * (CLASS_FOOTPRINT * 2 + CLASS_MARGIN * 2);
        let diameter;
        if (classCount <= 2) {
          diameter = CLASS_FOOTPRINT * 4;
        } else {
          diameter = circumference / Math.PI;
        }
        landscapeGraph.children.push(
          createdFixedSizeApplication(app, {
            width: diameter,
            depth: diameter,
          })
        );
      } else {
        // Spiral layout: calculate size based on spiral pattern
        const { visualizationSettings: vs } = useUserSettingsStore.getState();

        const spiralSideLength = calculateSpiralSideLength(
          classCount,
          CLASS_FOOTPRINT,
          CLASS_MARGIN,
          vs.spiralGap.value,
          vs.spiralCenterOffset.value
        );

        landscapeGraph.children.push(
          createdFixedSizeApplication(app, {
            width: spiralSideLength,
            depth: spiralSideLength,
          })
        );
      }
    } else {
      landscapeGraph.children.push(
        createApplicationGraph(app, removedComponentIds)
      );
    }
  });

  // Add edges for force layout between applications
  addEdges(landscapeGraph, applications);

  const layoutedGraph = await elk.layout(landscapeGraph);

  const boxLayoutMap = convertElkToBoxLayout(layoutedGraph);

  // Apply custom class layout if enabled
  if (useCustomClassLayout) {
    // Remove package layouts from the map since packages should not be rendered
    // Collect all package IDs from all applications
    getAllPackageIdsInApplications([...applications]).forEach((id) => {
      boxLayoutMap.delete(id);
    });

    // Apply the selected layout algorithm to classes
    if (useCircleLayout) {
      applyCircleLayoutToClasses(
        boxLayoutMap,
        applications,
        removedComponentIds
      );
    } else if (useSpiralLayout) {
      applySpiralLayoutToClasses(
        boxLayoutMap,
        applications,
        removedComponentIds
      );
    }
  }

  return boxLayoutMap;
}

function createK8sNodeGraph(k8sNode: K8sNode) {
  const k8sNodeGraph = {
    id: K8S_NODE_PREFIX + k8sNode.name,
    children: [],
    layoutOptions: {
      aspectRatio: ASPECT_RATIO.toString(),
      algorithm: PACKAGE_ALGORITHM,
      'elk.padding': getPaddingForLabelPlacement(
        COMPONENT_LABEL_PLACEMENT,
        APP_LABEL_MARGIN,
        APP_MARGIN
      ),
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
        algorithm: PACKAGE_ALGORITHM,
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
        algorithm: PACKAGE_ALGORITHM,
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
        algorithm: PACKAGE_ALGORITHM,
        'elk.padding': `[top=${APP_MARGIN},left=${APP_MARGIN},bottom=${APP_LABEL_MARGIN},right=${APP_MARGIN}]`,
      },
    };

    populatePod(podGraph, pod.applications);

    deploymentGraph.children.push(podGraph);
  });
}

function populatePod(podGraph: any, applications: Application[]) {
  applications.forEach((application) => {
    const appGraph = createApplicationGraph(application, new Set<string>());

    podGraph.children.push(appGraph);
  });
}

function createApplicationGraph(
  application: Application,
  removedComponentIds: Set<string>
) {
  const appGraph = {
    id: APP_PREFIX + application.id,
    children: [],
    layoutOptions: {
      aspectRatio: ASPECT_RATIO,
      algorithm: PACKAGE_ALGORITHM,
      'elk.padding': getPaddingForLabelPlacement(
        COMPONENT_LABEL_PLACEMENT,
        APP_LABEL_MARGIN,
        APP_MARGIN
      ),
    },
  };
  populateAppGraph(appGraph, application, removedComponentIds);

  return appGraph;
}

function createdFixedSizeApplication(
  application: Application,
  size: { width: number; depth: number }
) {
  // TODO: The fixed sizing does not work correctly
  const appGraph = {
    id: APP_PREFIX + application.id,
    width: size.width,
    height: size.depth,
    children: [],
    layoutOptions: {
      algorithm: PACKAGE_ALGORITHM,
      'nodeSize.fixedGraphSize': true,
      'nodeSize.constraints': 'MINIMUM_SIZE',
      'elk.padding': getPaddingForLabelPlacement(
        COMPONENT_LABEL_PLACEMENT,
        APP_LABEL_MARGIN,
        APP_MARGIN
      ),
    },
  };

  populateAppGraph(appGraph, application, new Set());

  return appGraph;
}

function populateAppGraph(
  appGraph: any,
  application: Application,
  removedComponentIds: Set<string>
) {
  // Check if custom class layout is enabled
  const { visualizationSettings } = useUserSettingsStore.getState();
  const classLayoutAlgorithm = visualizationSettings.classLayoutAlgorithm.value;
  const useCustomClassLayout =
    classLayoutAlgorithm === 'circle' || classLayoutAlgorithm === 'spiral';

  if (useCustomClassLayout) {
    const allClassNodes = collectApplicationClassesForCircleLayout(
      application,
      removedComponentIds
    );

    // Add all classes directly to the application graph
    appGraph.children.push(...allClassNodes);
  } else {
    // Normal layout: use packages
    application.packages.forEach((component) => {
      if (removedComponentIds.has(component.id)) {
        return;
      }
      const packageGraph = {
        id: PACKAGE_PREFIX + component.id,
        children: [],
        layoutOptions: {
          algorithm: PACKAGE_ALGORITHM,
          aspectRatio: ASPECT_RATIO,
          'spacing.nodeNode': CLASS_MARGIN,
          'elk.padding': getPaddingForLabelPlacement(
            COMPONENT_LABEL_PLACEMENT,
            PACKAGE_LABEL_MARGIN,
            PACKAGE_MARGIN
          ),
        },
      };
      appGraph.children.push(packageGraph);

      populatePackage(packageGraph.children, component, removedComponentIds);
    });
  }
}

function populatePackage(
  packageGraphChildren: any[],
  component: Package,
  removedComponentIds: Set<string>
) {
  component.classes.forEach((classModel) => {
    let widthByMetric = 0;
    if (WIDTH_METRIC === SelectedClassMetric.Method) {
      widthByMetric =
        WIDTH_METRIC_MULTIPLIER *
        metricMappingMultipliers['Method Count'] *
        classModel.methods.length;
    }

    let depthByMetric = 0;
    if (DEPTH_METRIC === SelectedClassMetric.Method) {
      depthByMetric =
        DEPTH_METRIC_MULTIPLIER *
        metricMappingMultipliers['Method Count'] *
        classModel.methods.length;
    }

    const classNode = {
      id: CLASS_PREFIX + classModel.id,
      children: [],
      width: CLASS_FOOTPRINT + widthByMetric,
      height: CLASS_FOOTPRINT + depthByMetric,
    };
    packageGraphChildren.push(classNode);
  });

  component.subPackages.forEach((subPackage) => {
    if (removedComponentIds.has(subPackage.id)) {
      return;
    }
    const packageNode = {
      id: PACKAGE_PREFIX + subPackage.id,
      children: [],
      layoutOptions: {
        algorithm: PACKAGE_ALGORITHM,
        aspectRatio: ASPECT_RATIO,
        'spacing.nodeNode': CLASS_MARGIN,
        'elk.padding': getPaddingForLabelPlacement(
          COMPONENT_LABEL_PLACEMENT,
          PACKAGE_LABEL_MARGIN,
          PACKAGE_MARGIN
        ),
      },
    };
    packageGraphChildren.push(packageNode);

    if (subPackage.subPackages.length > 0 || subPackage.classes.length > 0) {
      populatePackage(packageNode.children, subPackage, removedComponentIds);
    } else {
      // Add dummy class, otherwise package would be assigned with zero width/depth
      populateWithDummyClass(packageNode.children);
    }
  });
}

function populateWithDummyClass(packageGraphChildren: any[]) {
  const dummyClassNode = {
    id: DUMMY_PREFIX + generateUuidv4(),
    children: [],
    width: CLASS_FOOTPRINT,
    height: CLASS_FOOTPRINT,
  };
  packageGraphChildren.push(dummyClassNode);
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
  let height = COMPONENT_HEIGHT;
  if (elkGraph.id.startsWith(CLASS_PREFIX)) {
    height = CLASS_FOOTPRINT;
  }

  const boxLayout = new BoxLayout();

  // Prevent 0 value for width and depth
  boxLayout.width = elkGraph.width || CLASS_FOOTPRINT;
  boxLayout.depth = elkGraph.height || CLASS_FOOTPRINT;
  boxLayout.height = height;

  boxLayout.positionX = xOffset + elkGraph.x!;
  boxLayout.positionY = COMPONENT_HEIGHT * (depth - 1) + height / 2.0;
  boxLayout.positionZ = zOffset + elkGraph.y!;

  boxLayout.level = depth;

  // Landscape and applications are on the same level
  if (elkGraph.id.startsWith(LANDSCAPE_PREFIX)) {
    // eslint-disable-next-line
    depth = depth - 1;
  }

  if (elkGraph.id.startsWith(APP_PREFIX)) {
    // Add application offset since all components and classes are placed directly in app
    xOffset -= boxLayout.positionX;
    zOffset -= boxLayout.positionZ;
  }

  if (
    elkGraph.id.startsWith(PACKAGE_PREFIX) ||
    elkGraph.id.startsWith(CLASS_PREFIX)
  ) {
    // Geometries in three.js are centered around the origin
    boxLayout.positionX = boxLayout.positionX + boxLayout.width / 2.0;
    boxLayout.positionZ = boxLayout.positionZ + boxLayout.depth / 2.0;
  }

  // Ids in ELK must not start with numbers, therefore we added letters as prefix
  if (elkGraph.id.substring(APP_PREFIX.length) !== DUMMY_PREFIX) {
    layoutMap.set(elkGraph.id.substring(APP_PREFIX.length), boxLayout);
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
