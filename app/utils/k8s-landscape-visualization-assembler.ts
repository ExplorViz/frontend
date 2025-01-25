import { K8sNode } from './landscape-schemes/structure-data';
import K8sMesh from 'explorviz-frontend/view-objects/3d/k8s/k8s-mesh';
import * as THREE from 'three';
import Landscape3D from 'explorviz-frontend/view-objects/3d/landscape/landscape-3d';
import BoxMesh from 'explorviz-frontend/view-objects/3d/application/box-mesh';
import { ExplorVizColors } from 'explorviz-frontend/services/user-settings';
import { addBoxTextLabel } from './application-rendering/labeler';

export default function visualizeK8sLandscape(
  landscape3D: Landscape3D,
  nodes: K8sNode[],
  params: { font: any; colors: ExplorVizColors },
  boxLayoutMap: any
) {
  nodes.forEach((node) => {
    const nodeMesh = new K8sMesh(
      boxLayoutMap.get(node.name),
      { id: node.name, name: node.name, type: K8sEntity.NODE },
      params.colors.k8sNodeColor,
      params.colors.highlightedEntityColor
    );
    addMeshToLandscape(nodeMesh, landscape3D);
    addBoxTextLabel(nodeMesh, params.font, params.colors.k8sTextColor);

    node.k8sNamespaces.forEach((namespace) => {
      const namespaceMesh = new K8sMesh(
        boxLayoutMap.get(namespace.name),
        { id: namespace.name, name: namespace.name, type: K8sEntity.NAMESPACE },
        params.colors.k8sNamespaceColor,
        params.colors.highlightedEntityColor
      );
      addMeshToLandscape(namespaceMesh, landscape3D);
      addBoxTextLabel(namespaceMesh, params.font, params.colors.k8sTextColor);

      namespace.k8sDeployments.forEach((deployment) => {
        const deploymentMesh = new K8sMesh(
          boxLayoutMap.get(deployment.name),
          {
            id: deployment.name,
            name: deployment.name,
            type: K8sEntity.DEPLOYMENT,
          },
          params.colors.k8sDeploymentColor,
          params.colors.highlightedEntityColor
        );
        addMeshToLandscape(deploymentMesh, landscape3D);
        addBoxTextLabel(
          deploymentMesh,
          params.font,
          params.colors.k8sTextColor
        );

        deployment.k8sPods.forEach((pod) => {
          const podMesh = new K8sMesh(
            boxLayoutMap.get(pod.name),
            { id: deployment.name, name: pod.name, type: K8sEntity.POD },
            params.colors.k8sPodColor,
            params.colors.highlightedEntityColor
          );
          addMeshToLandscape(podMesh, landscape3D);
          addBoxTextLabel(podMesh, params.font, params.colors.k8sTextColor);
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

export enum K8sEntity {
  NODE = 'Node',
  NAMESPACE = 'Namespace',
  DEPLOYMENT = 'Deployment',
  POD = 'Pod',
}
