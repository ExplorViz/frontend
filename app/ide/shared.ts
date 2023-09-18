import type ApplicationRenderer from 'explorviz-frontend/services/application-renderer';
import type { Application } from 'explorviz-frontend/utils/landscape-schemes/structure-data';

import * as THREE from 'three';
import ClazzCommunicationMesh from 'explorviz-frontend/view-objects/3d/application/clazz-communication-mesh';
import ClazzMesh from 'explorviz-frontend/view-objects/3d/application/clazz-mesh';
import CommunicationArrowMesh from 'explorviz-frontend/view-objects/3d/application/communication-arrow-mesh';
import ComponentMesh from 'explorviz-frontend/view-objects/3d/application/component-mesh';
import FoundationMesh from 'explorviz-frontend/view-objects/3d/application/foundation-mesh';
import FakeInstanceMesh from 'explorviz-frontend/view-objects/3d/application/fake-mesh';

export enum IDEApiDest {
  VizDo = 'vizDo',
  IDEDo = 'ideDo',
}

export enum IDEApiActions {
  Refresh = 'refresh',
  SingleClickOnMesh = 'singleClickOnMesh',
  DoubleClickOnMesh = 'doubleClickOnMesh',
  ClickTimeline = 'clickTimeLine',
  GetVizData = 'getVizData',
  JumpToLocation = 'jumpToLocation',
  JumpToMonitoringClass = 'jumpToMonitoringClass',
}

export type MonitoringData = {
  fqn: string;
  description: string;
};

export type CommunicationLink = {
  sourceMeshID: string;
  targetMeshID: string;
  meshID: string;
  methodName: string;
};

export type IDEApiCall = {
  action: IDEApiActions;
  data: OrderTuple[];
  meshId: string;
  occurrenceID: number;
  fqn: string;
  foundationCommunicationLinks: CommunicationLink[];
};

export type VizDataRaw = {
  applications: Application[];
  communicationLinks: CommunicationLink[];
};

export type ParentOrder = {
  fqn: string;
  meshid: string;
  childs: ParentOrder[];
  methods: ParentOrder[];
};

export type OrderTuple = {
  hierarchyModel: ParentOrder;
  meshes: { meshNames: string[]; meshIds: string[] };
};

/**
 * Warning this function will modify the contents of foundationCommunicationLinks.
 * @modifies foundationCommunicationLinks
 */
export function getVizData(
  applicationRenderer: ApplicationRenderer,
  foundationCommunicationLinks: CommunicationLink[]
): VizDataRaw {
  const openApplications = applicationRenderer.getOpenApplications();
  const communicationLinks: CommunicationLink[] = foundationCommunicationLinks;

  const communicationMeshIDs = new Set<CommunicationLink['meshID']>(
    communicationLinks.map((cl) => cl.meshID)
  );

  openApplications.forEach((application) => {
    const drawableClassCommunications =
      application.data.drawableClassCommunications;

    // Add Communication meshes inside the foundations to the foundation communicationLinks list
    drawableClassCommunications.forEach((element) => {
      const meshIDs = element.id.split('_');
      const tempCL: CommunicationLink = {
        meshID: element.id,
        sourceMeshID: meshIDs[0],
        targetMeshID: meshIDs[1],
        methodName: meshIDs[2],
      };

      if (communicationMeshIDs.has(element.id)) {
        // TODO: this modifies foundationCommunicationLinks, is that intended?
        communicationLinks.push(tempCL);
        communicationMeshIDs.add(element.id);
      }
    });
  });

  return {
    applications: openApplications.map((app3D) => app3D.data.application),
    communicationLinks: communicationLinks,
  };
}

export function getIdFromMesh(mesh: THREE.Object3D<THREE.Event>): string {
  if (mesh instanceof FoundationMesh) {
    return mesh.dataModel.id;
  } else if (mesh instanceof FakeInstanceMesh) {
    return mesh.dataModel.id;
  } else if (mesh instanceof ComponentMesh) {
    return mesh.dataModel.id;
  } else if (mesh instanceof ClazzMesh) {
    console.error('ClazzMesh --- Mesh Type not Supported!');
    return mesh.dataModel.id;
  } else if (mesh instanceof ClazzCommunicationMesh) {
    console.error('ClazzCommunicationMesh --- Mesh Type not Supported!');
    console.log(mesh.dataModel);
    return mesh.dataModel.id;
    // return 'Not implemented ClazzCommunicationMesh';
  } else if (mesh instanceof CommunicationArrowMesh) {
    console.error('CommunicationArrowMesh --- Mesh Type not Supported!');
    return 'Not implemented CommunicationArrowMesh';
  } else if (mesh instanceof THREE.InstancedMesh) {
    console.warn(`Cannot (yet) get id from mesh (instanced mesh)`);
    return 'Not implemented';
  } else {
    //
    console.error(typeof mesh, ' --- Mesh Type not Supported!');
    return 'Not implemented';
  }
}

export function OpenObject(
  doSomethingOnMesh: (meshID: string) => void,
  fullQualifiedName: string,
  occurrenceID: number,
  lookAtMesh: (meshID: string) => void,
  vizDataOrderTuple: OrderTuple[]
) {
  resetFoundation(doSomethingOnMesh, vizDataOrderTuple);

  vizDataOrderTuple.forEach((ot) => {
    const occurrenceName = occurrenceID == -1 ? '.' : '.' + occurrenceID + '.';

    console.log('ot.hierarchyModel.fqn', ot.hierarchyModel.fqn);
    recursivelyOpenObjects(
      doSomethingOnMesh,
      lookAtMesh,
      ot.hierarchyModel.fqn + occurrenceName + fullQualifiedName,
      ot
    );
  });
}

function recursivelyOpenObjects(
  doSomethingOnMesh: (meshID: string) => void,
  lookAtMesh: (meshID: string) => void,
  toOpen: string,
  orderTuple: OrderTuple
) {
  if (orderTuple.meshes.meshNames.indexOf(toOpen) === -1) {
    return;
  }

  orderTuple.hierarchyModel.childs.forEach((element) => {
    const tempOrder: ParentOrder = {
      fqn: element.fqn,
      childs: element.childs,
      meshid: element.meshid,
      methods: [],
    };
    if (element.methods.length != 0) {
      console.log('Methods elem: ', element);
    } else if (isInParentOrder(element, toOpen)) {
      doSomethingOnMesh(element.meshid);
      if (toOpen === element.fqn) {
        // TODO: stop iteration once found?
        lookAtMesh(element.meshid);
      }
      recursivelyOpenObjects(doSomethingOnMesh, lookAtMesh, toOpen, {
        hierarchyModel: tempOrder,
        meshes: orderTuple.meshes,
      });
    }
  });
}

function isInParentOrder(po: ParentOrder, name: string): boolean {
  if (po.fqn === name) {
    return true;
  } else if (po.childs.length === 0) {
    return false;
  }

  for (const child of po.childs) {
    if (
      isInParentOrder(
        {
          fqn: child.fqn,
          childs: child.childs,
          meshid: child.meshid,
          methods: [],
        },
        name
      )
    ) {
      return true;
    }
  }

  return false;
}

function resetFoundation(
  doSomethingOnMesh: (meshID: string) => void,
  orderTuple: OrderTuple[]
) {
  orderTuple.forEach((ot) => {
    doSomethingOnMesh(ot.hierarchyModel.meshid);
  });
}
