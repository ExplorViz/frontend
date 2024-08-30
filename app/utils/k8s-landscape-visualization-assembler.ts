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

export default function visualizeK8sLandscape(
  k8sNodes: K8sNode[],
  params: SimpleParentMeshParams,
  appToApp3d: (app: Application) => ApplicationObject3D
): SimpleParentMesh[] {
  return k8sNodes.map((n) => mapNode(n, params, appToApp3d));
}

function mapNode(
  node: K8sNode,
  params: SimpleParentMeshParams,
  appToApp3d: (app: Application) => ApplicationObject3D
): SimpleParentMesh {
  const children = node.k8sNamespaces.map((ns) =>
    mapNs(ns, params, appToApp3d)
  );
  return new SimpleParentMesh({
    ...params,
    children: children,
    label: node.name,
    color: 0xff70aa,
  });
}

function mapNs(
  ns: K8sNamespace,
  params: SimpleParentMeshParams,
  appToApp3d: (app: Application) => ApplicationObject3D
): SimpleParentMesh {
  const g = `ns:${ns.name}`;
  const children = ns.k8sDeployments.map((d) =>
    mapDeployment(d, params, appToApp3d, g)
  );
  return new SimpleParentMesh({
    ...params,
    children: children,
    label: ns.name,
    group: g,
    color: 0xff90cc,
  });
}

function mapDeployment(
  d: K8sDeployment,
  params: SimpleParentMeshParams,
  appToApp3d: (app: Application) => ApplicationObject3D,
  group: string
): SimpleParentMesh {
  const g = `${group};dp:${d.name}`;
  const children = d.k8sPods.map((p) => mapPod(p, params, appToApp3d, g));
  return new SimpleParentMesh({
    ...params,
    children: children,
    label: d.name,
    group: g,
    color: 0xcc90cc,
  });
}

function mapPod(
  p: K8sPod,
  params: SimpleParentMeshParams,
  appToApp3d: (app: Application) => ApplicationObject3D,
  group: string
): SimpleParentMesh {
  const g = `${group};pod`;
  return new SimpleParentMesh({
    ...params,
    label: p.name,
    children: p.applications.map(appToApp3d),
    group: g,
    color: 0xcc70cc,
  });
}
