import { addBoxTextLabel } from 'explorviz-frontend/src/utils/application-rendering/labeler';
import { ExplorVizColors } from 'explorviz-frontend/src/stores/user-settings';
import { K8sNode } from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';

export default function visualizeK8sLandscape(
  landscape3D: Landscape3D,
  nodes: K8sNode[],
  params: { font: any; colors: ExplorVizColors },
  boxLayoutMap: any
) {
  // Add nodes
  nodes.forEach((node) => {
    const nodeMesh = new K8sMesh(
      boxLayoutMap.get(node.name),
      { id: node.name, name: node.name, type: K8sEntity.NODE },
      params.colors.k8sNodeColor,
      params.colors.highlightedEntityColor
    );
    landscape3D.addK8sMesh(nodeMesh);
    addBoxTextLabel(nodeMesh, params.font, params.colors.k8sTextColor);

    // Add namespaces
    node.k8sNamespaces.forEach((namespace) => {
      const namespaceMesh = new K8sMesh(
        boxLayoutMap.get(namespace.name),
        { id: namespace.name, name: namespace.name, type: K8sEntity.NAMESPACE },
        params.colors.k8sNamespaceColor,
        params.colors.highlightedEntityColor
      );
      landscape3D.addK8sMesh(namespaceMesh);
      addBoxTextLabel(namespaceMesh, params.font, params.colors.k8sTextColor);

      // Add deployments
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
        landscape3D.addK8sMesh(deploymentMesh);
        addBoxTextLabel(
          deploymentMesh,
          params.font,
          params.colors.k8sTextColor
        );

        // Add pods
        deployment.k8sPods.forEach((pod) => {
          const podMesh = new K8sMesh(
            boxLayoutMap.get(pod.name),
            { id: pod.name, name: pod.name, type: K8sEntity.POD },
            params.colors.k8sPodColor,
            params.colors.highlightedEntityColor
          );
          landscape3D.addK8sMesh(podMesh);
          addBoxTextLabel(podMesh, params.font, params.colors.k8sTextColor);
        });
      });
    });
  });
}

export enum K8sEntity {
  NODE = 'Node',
  NAMESPACE = 'Namespace',
  DEPLOYMENT = 'Deployment',
  POD = 'Pod',
}
