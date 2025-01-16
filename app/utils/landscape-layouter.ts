import ELK from 'elkjs/lib/elk.bundled.js';
import ApplicationObject3D from 'explorviz-frontend/view-objects/3d/application/application-object-3d';
import * as THREE from 'three';

let APP_MARGIN: number;

export default async function layoutLandscape(
  applications: ApplicationObject3D[]
) {
  const elk = new ELK();

  APP_MARGIN = 0;

  const graph: any = {
    id: 'landscape',
    children: [],
    edges: [],
    layoutOptions: {
      algorithm: 'force',
      'elk.padding': `[top=${APP_MARGIN},left=${APP_MARGIN},bottom=${APP_MARGIN},right=${APP_MARGIN}]`,
    },
  };

  // Add connections between applications
  applications.forEach((sourceApp) => {
    applications.forEach((targetApp) => {
      graph.edges.push({
        id: `eFrom${sourceApp.dataModel.application.id}to${targetApp.dataModel.application.id}`,
        sources: [`app${sourceApp.dataModel.application.id}`],
        targets: [`app${targetApp.dataModel.application.id}`],
      });
    });
  });

  populateGraph(applications, graph);

  const layoutedGraph = await elk.layout(graph);

  console.log('layoutedGraph:', layoutedGraph);

  applyElkLayoutToLandscape(layoutedGraph, applications);
}

function populateGraph(applications: ApplicationObject3D[], graph: any) {
  applications.forEach((application) => {
    const boundingBox = new THREE.Box3().setFromObject(application);
    console.log(boundingBox);

    const node = {
      id: `app${application.dataModel.application.id}`,
      children: [],
      width: Math.abs(boundingBox.min.z) + Math.abs(boundingBox.max.z),
      height: Math.abs(boundingBox.min.y) + Math.abs(boundingBox.max.y),
      layoutOptions: {
        algorithm: 'force',
        'spacing.nodeNode': APP_MARGIN,
        'elk.padding': `[top=${APP_MARGIN},left=${APP_MARGIN},bottom=${APP_MARGIN},right=${APP_MARGIN}]`,
      },
    };
    graph.children.push(node);
  });
}

export function applyElkLayoutToLandscape(
  elkGraph: any,
  applications: ApplicationObject3D[]
) {
  elkGraph.children.forEach((appNode: any) => {
    console.log('AppNode', appNode);

    applications.forEach((app) => {
      if (`app${app.dataModel.application.id}` == appNode.id) {
        console.log('Found application');

        app.position.x = appNode.x;
        app.position.z = appNode.y;
      }
    });
  });
}
