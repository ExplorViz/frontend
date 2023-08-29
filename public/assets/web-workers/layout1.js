// Wait for the initial message event.
self.addEventListener(
  'message',
  function (e) {
    let { structureLandscapeData, applicationCommunications } = e.data;

    let kielerGraph = layout1(
      structureLandscapeData,
      applicationCommunications
    );
    postMessage(kielerGraph);
  },
  false
);

// Ping the Ember service to say that everything is ok.
postMessage(true);

const CONVERT_TO_KIELER_FACTOR = 180.0;

const PADDING = 0.1;

function layout1(landscape, applicationCommunications) {
  let topLevelKielerGraph = {};

  // Maps for internal computations
  let modelIdToGraph = new Map();
  let modelIdToSourcePort = new Map();
  let modelIdToTargetPort = new Map();
  let modeldToKielerEdgeReference = new Map();

  // Maps for output
  let modelIdToPoints = new Map();

  const graph = createEmptyGraph('root');
  topLevelKielerGraph = graph;

  addNodes(landscape, topLevelKielerGraph);
  addEdges(applicationCommunications);

  return {
    graph,
    modelIdToPoints,
  };

  function createEmptyGraph(id) {
    const spacing = 0.2 * CONVERT_TO_KIELER_FACTOR;

    const layoutOptions = {
      'elk.edgeRouting': 'POLYLINE',
      'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
      'elk.spacing.nodeNode': spacing,
      'elk.spacing.edgeNode': 2 * spacing,
      'elk.layered.spacing.edgeEdgeBetweenLayers': 2.5 * spacing,
      'elk.layered.spacing.nodeNodeBetweenLayers': 2.5 * spacing,
      'elk.direction': 'RIGHT',
      'elk.interactive': true,
      'elk.layered.nodePlacement.strategy': 'LINEAR_SEGMENTS',
      'elk.layered.unnecessaryBendpoints': true,
      edgeSpacingFactor: 1.0,
    };

    const graph = {
      id: id,
      properties: layoutOptions,
      children: [],
      edges: [],
    };

    return graph;
  }

  function addEdges(totalApplicationCommunications) {
    totalApplicationCommunications.forEach((applicationcommunication) => {
      modeldToKielerEdgeReference.set(applicationcommunication.id, []);

      modelIdToPoints.set(applicationcommunication.id, []);

      let appSource = applicationcommunication.sourceApplication;
      let appTarget = applicationcommunication.targetApplication;

      if (appSource.id !== appTarget.id) {
        const edge = createEdgeBetweenSourceTarget(
          appSource,
          appTarget,
          applicationcommunication.id
        );
        let edgeReference = modeldToKielerEdgeReference.get(
          applicationcommunication.id
        );
        edgeReference.push(edge);
      }
    });
  } // END addEdges

  function addNodes(landscape, kielerGraph) {
    const nodes = landscape.nodes;

    nodes.forEach((node) => {
      createNodeAndItsApplications(kielerGraph, node);
    });
  } // END addNodes

  function createNodeAndItsApplications(kielerParentGraph, node) {
    const NODE_LABEL_HEIGHT = 0.2;
    const DEFAULT_WIDTH = 1.5;
    const DEFAULT_HEIGHT = 0.75;

    const nodeKielerGraph = createEmptyGraph(node.id);
    modelIdToGraph.set(node.id, nodeKielerGraph);

    // kieler scaled padding
    const ksp = 2.5 * PADDING * CONVERT_TO_KIELER_FACTOR;

    nodeKielerGraph.properties[
      'elk.padding'
    ] = `[top=${ksp}, left=${ksp}, bottom=${3 * ksp}, right=${ksp}]`;

    const minWidth = Math.max(
      DEFAULT_WIDTH * CONVERT_TO_KIELER_FACTOR,
      (calculateRequiredLabelLength(getDisplayName(node), NODE_LABEL_HEIGHT) +
        PADDING * 2.0) *
        CONVERT_TO_KIELER_FACTOR
    );

    const minHeight = DEFAULT_HEIGHT * CONVERT_TO_KIELER_FACTOR;

    if (!nodeKielerGraph.properties || !kielerParentGraph.children) return;

    nodeKielerGraph.properties['elk.nodeSize.constraints'] = 'MINIMUM_SIZE';
    nodeKielerGraph.properties['elk.nodeSize.minimum'] =
      '( ' + minWidth + ', ' + minHeight + '})';
    nodeKielerGraph.properties['elk.contentAlignment'] = 'V_CENTER,H_CENTER';

    kielerParentGraph.children.push(nodeKielerGraph);

    const applications = node.applications;

    applications.forEach((application) => {
      const DEFAULT_WIDTH = 1.5;
      const DEFAULT_HEIGHT = 0.75;

      const APPLICATION_PIC_SIZE = 0.16;
      const APPLICATION_PIC_PADDING_SIZE = 0.15;
      const APPLICATION_LABEL_HEIGHT = 0.21;

      const width = Math.max(
        DEFAULT_WIDTH * CONVERT_TO_KIELER_FACTOR,
        (calculateRequiredLabelLength(
          application.name,
          APPLICATION_LABEL_HEIGHT
        ) +
          APPLICATION_PIC_PADDING_SIZE +
          APPLICATION_PIC_SIZE +
          PADDING * 3.0) *
          CONVERT_TO_KIELER_FACTOR
      );

      const height = DEFAULT_HEIGHT * CONVERT_TO_KIELER_FACTOR;

      const applicationKielerNode = {
        id: application.id,
        width: width,
        height: height,
        children: [],
        edges: [],
        ports: [],
      };

      modelIdToGraph.set(application.id, applicationKielerNode);

      if (nodeKielerGraph.children)
        nodeKielerGraph.children.push(applicationKielerNode);
    });
  } // END createNodeAndItsApplications

  function createEdgeBetweenSourceTarget(
    sourceApplication,
    targetApplication,
    commId
  ) {
    const port1 = createSourcePortIfNotExisting(sourceApplication);
    const port2 = createTargetPortIfNotExisting(targetApplication);

    let edge = createEdgeHelper(
      sourceApplication,
      port1,
      targetApplication,
      port2,
      commId
    );
    return edge;

    //---------------------------inner functions
    function createSourcePortIfNotExisting(sourceApplication) {
      // Do not create duplicate port
      let maybePort = modelIdToSourcePort.get(sourceApplication.id);
      if (maybePort && modelIdToSourcePort.has(sourceApplication.id)) {
        return maybePort;
      } else {
        const DEFAULT_PORT_WIDTH = 0.000001;

        const DEFAULT_PORT_HEIGHT = 0.000001;

        const CONVERT_TO_KIELER_FACTOR = 180;

        const portId = sourceApplication.id + '_sp1';

        let port = {
          id: portId,
          width: DEFAULT_PORT_WIDTH * CONVERT_TO_KIELER_FACTOR,
          height: DEFAULT_PORT_HEIGHT * CONVERT_TO_KIELER_FACTOR,
          properties: {
            'elk.port.side': 'EAST',
          },
          x: 0,
          y: 0,
        };

        let sourceGraph = modelIdToGraph.get(sourceApplication.id);
        port.node = sourceGraph;

        modelIdToSourcePort.set(sourceApplication.id, port);
        sourceGraph?.ports?.push(port);

        return port;
      }
    }

    function createTargetPortIfNotExisting(targetApplication) {
      // Do not create duplicate port
      let maybePort = modelIdToTargetPort.get(targetApplication.id);
      if (maybePort && modelIdToTargetPort.has(targetApplication.id)) {
        return maybePort;
      } else {
        const DEFAULT_PORT_WIDTH = 0.000001;

        const DEFAULT_PORT_HEIGHT = 0.000001;

        const CONVERT_TO_KIELER_FACTOR = 180;

        const portId = targetApplication.id + '_tp1';

        let port = {
          id: portId,
          width: DEFAULT_PORT_WIDTH * CONVERT_TO_KIELER_FACTOR,
          height: DEFAULT_PORT_HEIGHT * CONVERT_TO_KIELER_FACTOR,
          properties: {
            'elk.port.side': 'WEST',
          },
          x: 0,
          y: 0,
        };

        let targetGraph = modelIdToGraph.get(targetApplication.id);
        port.node = targetGraph;

        modelIdToTargetPort.set(targetApplication.id, port);
        targetGraph?.ports?.push(port);

        return port;
      }
    }

    //---------------------------- end inner functions
  } // END createEdgeBetweenSourceTarget

  function createEdgeHelper(
    sourceApplication,
    port1,
    targetApplication,
    port2,
    commId
  ) {
    const id = sourceApplication.id + '_to_' + targetApplication.id;

    let edge = lookForExistingEdge(sourceApplication, id);

    if (edge) {
      return edge;
    }

    edge = createNewEdge(id);

    setEdgeLayoutProperties(edge);

    edge.source = sourceApplication.id;
    edge.target = targetApplication.id;

    edge.sourcePort = port1.id;
    edge.targetPort = port2.id;

    if (port1.x && port1.y) edge.sourcePoint = { x: port1.x, y: port1.y };

    if (port2.x && port2.y) edge.targetPoint = { x: port2.x, y: port2.y };

    edge.sPort = port1;
    edge.tPort = port2;

    edge.sourceNode = sourceApplication;
    edge.targetNode = targetApplication;

    edge.communicationId = commId;

    let graph = modelIdToGraph.get(sourceApplication.id);
    graph?.edges?.push(edge);

    return edge;

    //inner function
    // looks for already existing edges
    function lookForExistingEdge(sourceApplication, id) {
      let edges = modelIdToGraph.get(sourceApplication.id)?.edges;
      if (edges) {
        let length = edges.length;
        for (let i = 0; i < length; i++) {
          if (edges[i].id === id) {
            return edges[i];
          }
        }
      }
      return undefined;
    }
  } // END createEdgeHelper

  function createNewEdge(id) {
    const kielerEdge = {
      id: id,
    };
    return kielerEdge;
  }

  function setEdgeLayoutProperties(edge) {
    const lineThickness = 0.06 * 4.0 + 0.01;
    const oldThickness = edge.thickness ? edge.thickness : 0.0;
    edge.thickness = Math.max(
      lineThickness * CONVERT_TO_KIELER_FACTOR,
      oldThickness
    );
  }

  function getDisplayName(node) {
    if (node.hostName && node.hostName.length !== 0) {
      return node.hostName;
    } else {
      return node.ipAddress;
    }
  }

  function calculateRequiredLabelLength(text, quadSize) {
    if (text === null || text === '') {
      return 0;
    }

    return text.length * quadSize;
  }
}
