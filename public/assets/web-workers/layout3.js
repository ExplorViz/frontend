// Wait for the initial message event.
self.addEventListener('message', function(e) {
  let { structureLandscapeData, modelIdToPoints, graph, applicationCommunications } = e.data;

  let landscape = layout3(structureLandscapeData, modelIdToPoints, graph, applicationCommunications);
  postMessage(landscape);
}, false);

const CONVERT_TO_KIELER_FACTOR = 180.0;

function layout3(landscape, modelIdToPoints, graph, applicationCommunications) {

  let modelIdToGraph = new Map();
  let modeldToKielerEdgeReference = new Map();

  // Maps for output
  let modelIdToLayout = new Map();

  createModelIdToGraphMap(graph);
  createModelIdToEdgeMap();

  updateGraphWithResults(landscape, applicationCommunications); 

  return { modelIdToLayout, modelIdToPoints, modeldToKielerEdgeReference, modelIdToGraph, graph };

  function createModelIdToGraphMap(kielerGraph) {
    if(kielerGraph.id !== 'root') {
      modelIdToGraph.set(kielerGraph.id, kielerGraph);
    }
    kielerGraph.children?.forEach((childGraph) => {
      createModelIdToGraphMap(childGraph);
    });
  }

  function createModelIdToEdgeMap() {
    modelIdToGraph?.forEach((kielerGraph) => {
      kielerGraph.edges?.forEach((edge) => {
        if(edge.communicationId)
          modeldToKielerEdgeReference.set(edge.communicationId, [edge]);
      })
    })
  }


  function updateGraphWithResults(landscape, applicationCommunications) {

    const { nodes } = landscape;

    nodes?.forEach((node) => {

      updateNodeValues(node);

      const applications = node.applications;

      applications.forEach((application) => {

        updateNodeValues(application);
        setAbsolutePositionForNode(application, node);

      });

    });

    addBendPointsInAbsoluteCoordinates(applicationCommunications);

    nodes?.forEach((node) => {

      const applications = node.applications;

      applications?.forEach((application) => {

        convertToExplorVizCoords(application);

      });

      convertToExplorVizCoords(node);

    });

  } // END updateGraphWithResults

  function addBendPointsInAbsoluteCoordinates(applicationCommunications) {

    const totalApplicationCommunications = applicationCommunications;
    // Points for drawing which represent an edge
    const edgeIdToPoints = new Map();

    totalApplicationCommunications?.forEach((applicationcommunication) => {

      const kielerEdgeReferences = modeldToKielerEdgeReference.get(applicationcommunication.id);

      kielerEdgeReferences?.forEach((edge) => {
        if (edge != null) {

          let maybePoints = edgeIdToPoints.get(edge.id);
          if (maybePoints) {
            modelIdToPoints.set(applicationcommunication.id, maybePoints);
            return;
          }

          let sourceApplication = applicationcommunication.sourceApplication;
          let parentNode = sourceApplication.parent;

          if (parentNode) {

            let points = [];

            if (edge.sections && edge.sections[0]?.bendPoints) {
              points = edge.sections[0]?.bendPoints;
            }

            var sourcePoint = null;

            if (isDescendant(edge.targetNode, edge.sourceNode)) {

              // Self edges..
              let sourcePort = edge.sPort;

              if (!sourcePort?.x || !sourcePort.y) return;

              sourcePoint = {
                x: sourcePort.x,
                y: sourcePort.y
              };

              let sourceGraph = modelIdToGraph.get(edge.sourceNode.id);

              if (!sourceGraph) return;
            }
            else {

              if (edge.source && edge.sections && edge.sections[0]?.startPoint) {
                sourcePoint = {
                  x: edge.sections[0].startPoint.x,
                  y: edge.sections[0].startPoint.y
                };
              } else if (edge.sPort?.x && edge.sPort.y){
                sourcePoint = {
                  x: edge.sPort.x,
                  y: edge.sPort.y
                };
              } else {
                return;
              }

            }

            points.unshift(sourcePoint);

            if (!edge.tPort?.x || !edge.tPort.y) return;

            let targetPoint = (edge.sections && edge.sections[0]?.endPoint) ? {
              x: edge.sections[0].endPoint.x,
              y: edge.sections[0].endPoint.y
            } : {
                x: edge.tPort.x,
                y: edge.tPort.y
              }

            points.push(targetPoint);

            let pOffsetX = 0.0;
            let pOffsetY = 0.0;

            if (parentNode) {
              let insetLeft = 0.0;
              let insetTop = 0.0;

              let layout = modelIdToLayout.get(parentNode.id);
              if (layout){
                pOffsetX = layout?.positionX + insetLeft;
                pOffsetY = layout?.positionY - insetTop;
              }
            }

            let updatedPoints = [];
            points?.forEach((point) => {
              let resultPoint = {
                x: 0,
                y: 0
              };

              resultPoint.x = (point.x + pOffsetX) / CONVERT_TO_KIELER_FACTOR;
              resultPoint.y = (point.y * -1 + pOffsetY) / CONVERT_TO_KIELER_FACTOR; // KIELER has inverted Y coords
              let points = modelIdToPoints.get(applicationcommunication.id);
              if (points) {
                points.push(resultPoint);
                modelIdToPoints.set(applicationcommunication.id, points);
              }
              updatedPoints.push(resultPoint);

            });

            edgeIdToPoints.set(edge.id, updatedPoints);

          } // END if (parentNode != null)
        }
      });
    });
  } // END addBendPoints

  function updateNodeValues(entity) {
    let entityIdentifier = entity.id;
    let entityGraph = modelIdToGraph.get(entityIdentifier);
    if (entityGraph && entityGraph.x && entityGraph.y && entityGraph.width && entityGraph.height) {
      let layout = {
        positionX: entityGraph.x,
        positionY: entityGraph.y * -1,
        width: entityGraph.width,
        height: entityGraph.height,
      }
      modelIdToLayout.set(entityIdentifier, layout);
    }
  }

  function convertToExplorVizCoords(entity) {
    let entityIdentifier = entity.id;
    let layout = modelIdToLayout.get(entityIdentifier);
    if (layout) {
      layout.positionX /= CONVERT_TO_KIELER_FACTOR;
      layout.positionY /= CONVERT_TO_KIELER_FACTOR;
      layout.width /= CONVERT_TO_KIELER_FACTOR;
      layout.height /= CONVERT_TO_KIELER_FACTOR;
    }
  }

  function setAbsolutePositionForNode(application, node) {
    let childLayout = modelIdToLayout.get(application.id);
    let parentLayout = modelIdToLayout.get(node.id);
    let parentGraph = modelIdToGraph.get(node.id);

    if (childLayout && parentLayout) {
      childLayout.positionX += parentLayout.positionX;
      childLayout.positionY += parentLayout.positionY;
    }
  }

  function isDescendant(child, parent) {

    let current = child;
    let next = child.parent;

    while (next) {
      current = next;
      if (current === parent) {
        return true;
      }
      next = current.parent;
    }

    return false;
  }
}