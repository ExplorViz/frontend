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
import { GenericPopupEntiresFromObject } from 'explorviz-frontend/components/visualization/rendering/popups/generic-popup';
import K8sNodeMesh from 'explorviz-frontend/view-objects/3d/k8s/k8s-node-mesh';
import * as THREE from 'three';
import Landscape3D from 'explorviz-frontend/view-objects/3d/landscape/landscape-3d';
import BoxMesh from 'explorviz-frontend/view-objects/3d/application/box-mesh';

export default function visualizeK8sLandscape(
  landscape3D: Landscape3D,
  nodes: K8sNode[],
  params: SimpleParentMeshParams,
  boxLayoutMap: any,
  appToApp3d: (app: Application) => ApplicationObject3D
) {
  nodes.forEach((node) => {
    const nodeMesh = new K8sNodeMesh(
      boxLayoutMap.get(node.name),
      { id: node.name },
      new THREE.Color('green'),
      new THREE.Color('red')
    );
    addMeshToLandscape(nodeMesh, landscape3D);

    node.k8sNamespaces.forEach((namespace) => {
      const namespaceMesh = new K8sNodeMesh(
        boxLayoutMap.get(namespace.name),
        { id: namespace.name },
        new THREE.Color('blue'),
        new THREE.Color('red')
      );
      addMeshToLandscape(namespaceMesh, landscape3D);

      namespace.k8sDeployments.forEach((deployment) => {
        const deploymentMesh = new K8sNodeMesh(
          boxLayoutMap.get(deployment.name),
          { id: deployment.name },
          new THREE.Color('yellow'),
          new THREE.Color('red')
        );
        addMeshToLandscape(deploymentMesh, landscape3D);

        deployment.k8sPods.forEach((pod) => {
          const podMesh = new K8sNodeMesh(
            boxLayoutMap.get(pod.name),
            { id: deployment.name },
            new THREE.Color('red'),
            new THREE.Color('red')
          );
          addMeshToLandscape(podMesh, landscape3D);

          pod.applications.forEach((application) => {
            const app3D = appToApp3d(application);
          });
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

function mapNode(
  node: K8sNode,
  params: SimpleParentMeshParams,
  appToApp3d: (app: Application) => ApplicationObject3D
): SimpleParentMesh {
  const meta: any = {
    'Kubernetes Node': node.name,
  };

  const children = node.k8sNamespaces.map((ns) =>
    mapNs(ns, params, appToApp3d, meta)
  );

  return new SimpleParentMesh({
    ...params,
    children: children,
    label: node.name,
    color: 0x03045e,
    popupData: {
      title: node.name,
      entries: [
        { key: 'Type', value: 'Kubernetes Node' },
        ...GenericPopupEntiresFromObject(meta),
      ],
      tabs: [],
    },
  });
}

function mapNs(
  ns: K8sNamespace,
  params: SimpleParentMeshParams,
  appToApp3d: (app: Application) => ApplicationObject3D,
  meta: any
): SimpleParentMesh {
  const meta1 = {
    ...meta,
    'Kubernetes Namespace': ns.name,
  };
  const g = `ns:${ns.name}`;
  const children = ns.k8sDeployments.map((d) =>
    mapDeployment(d, params, appToApp3d, g, meta)
  );
  return new SimpleParentMesh({
    ...params,
    children: children,
    label: ns.name,
    group: g,
    color: 0x0077b6,
    popupData: {
      title: ns.name,
      entries: [
        { key: 'Type', value: 'Kubernetes Namespace' },
        ...GenericPopupEntiresFromObject(meta1),
      ],
      tabs: [],
    },
  });
}

function mapDeployment(
  d: K8sDeployment,
  params: SimpleParentMeshParams,
  appToApp3d: (app: Application) => ApplicationObject3D,
  group: string,
  meta: any
): SimpleParentMesh {
  const meta1 = {
    ...meta,
    'Kubernetes Deployment': d.name,
  };
  const g = `${group};dp:${d.name}`;
  const children = d.k8sPods.map((p) => mapPod(p, params, appToApp3d, g));
  return new SimpleParentMesh({
    ...params,
    children: children,
    label: d.name,
    group: g,
    color: 0x00b4d8,
    popupData: {
      title: d.name,
      entries: [
        { key: 'Type', value: 'Kubernetes Deployment' },
        ...GenericPopupEntiresFromObject(meta1),
      ],
      tabs: [],
    },
  });
}

function mapPod(
  p: K8sPod,
  params: SimpleParentMeshParams,
  appToApp3d: (app: Application) => ApplicationObject3D,
  group: string,
  meta: any
): SimpleParentMesh {
  const meta1 = {
    ...meta,
    'Kubernetes Pod': p.name,
  };
  const g = `${group};pod`;
  return new SimpleParentMesh({
    ...params,
    label: p.name,
    children: p.applications.map(appToApp3d),
    group: g,
    color: 0x90e0ef,
    popupData: {
      title: p.name,
      entries: [
        { key: 'Type', value: 'Kubernetes Pod' },
        ...GenericPopupEntiresFromObject(meta1),
      ],
      tabs: [],
    },
  });
}
