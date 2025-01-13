import SimpleParentMesh, {
  SimpleParentMeshParams,
} from 'react-lib/src/view-objects/3d/application/simple-parent-mesh';
import {
  Application,
  K8sDeployment,
  K8sNamespace,
  K8sNode,
  K8sPod,
} from 'react-lib/src/utils/landscape-schemes/structure-data';
import ApplicationObject3D from 'react-lib/src/view-objects/3d/application/application-object-3d';
import { GenericPopupEntiresFromObject } from 'explorviz-frontend/components/visualization/rendering/popups/generic-popup';

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
