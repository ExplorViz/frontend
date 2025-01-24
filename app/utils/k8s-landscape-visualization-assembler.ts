import SimpleParentMesh, {
  SimpleParentMeshParams,
} from 'explorviz-frontend/view-objects/3d/application/simple-parent-mesh';
import {
  Application,
  K8sDeployment,
  K8sNamespace,
  K8sNode,
  K8sPod,
} from './landscape-schemes/structure-data';
import ApplicationObject3D from 'explorviz-frontend/view-objects/3d/application/application-object-3d';
import K8sNodeMesh from 'explorviz-frontend/view-objects/3d/k8s/k8s-node-mesh';
import * as THREE from 'three';
import Landscape3D from 'explorviz-frontend/view-objects/3d/landscape/landscape-3d';
import BoxMesh from 'explorviz-frontend/view-objects/3d/application/box-mesh';
import { VisualizationSettings } from './settings/settings-schemas';
import { ExplorVizColors } from 'explorviz-frontend/services/user-settings';

export default function visualizeK8sLandscape(
  landscape3D: Landscape3D,
  nodes: K8sNode[],
  params: { font: any; colors: ExplorVizColors },
  boxLayoutMap: any,
  appToApp3d: (app: Application) => ApplicationObject3D
) {
  nodes.forEach((node) => {
    const nodeMesh = new K8sNodeMesh(
      boxLayoutMap.get(node.name),
      { id: node.name },
      params.colors.k8sNodeColor,
      params.colors.highlightedEntityColor
    );
    addMeshToLandscape(nodeMesh, landscape3D);

    node.k8sNamespaces.forEach((namespace) => {
      const namespaceMesh = new K8sNodeMesh(
        boxLayoutMap.get(namespace.name),
        { id: namespace.name },
        params.colors.k8sNamespaceColor,
        params.colors.highlightedEntityColor
      );
      addMeshToLandscape(namespaceMesh, landscape3D);

      namespace.k8sDeployments.forEach((deployment) => {
        const deploymentMesh = new K8sNodeMesh(
          boxLayoutMap.get(deployment.name),
          { id: deployment.name },
          params.colors.k8sDeploymentColor,
          params.colors.highlightedEntityColor
        );
        addMeshToLandscape(deploymentMesh, landscape3D);

        deployment.k8sPods.forEach((pod) => {
          const podMesh = new K8sNodeMesh(
            boxLayoutMap.get(pod.name),
            { id: deployment.name },
            params.colors.k8sPodColor,
            params.colors.highlightedEntityColor
          );
          addMeshToLandscape(podMesh, landscape3D);
        });
      });
    });
  });

  // return nodes.map((n) => mapNode(n, params, appToApp3d));
}

function addMeshToLandscape(mesh: BoxMesh, landscape3D: Landscape3D) {
  const layoutPosition = mesh.layout.position;

  const centerPoint = new THREE.Vector3(
    layoutPosition.x + mesh.layout.width / 2.0,
    layoutPosition.y + mesh.layout.height / 2.0,
    layoutPosition.z + mesh.layout.depth / 2.0
  );

  mesh.position.copy(centerPoint);
  mesh.saveOriginalAppearence();
  landscape3D.add(mesh);
}
