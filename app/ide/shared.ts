import ApplicationRenderer from 'explorviz-frontend/services/application-renderer';
import ApplicationRepository from 'explorviz-frontend/services/repos/application-repository';
import type {
  Application,
  Class,
  Package,
} from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import type ApplicationObject3D from 'explorviz-frontend/view-objects/3d/application/application-object-3d';

import ClazzCommunicationMesh from 'explorviz-frontend/view-objects/3d/application/clazz-communication-mesh';
import ClazzMesh from 'explorviz-frontend/view-objects/3d/application/clazz-mesh';
import CommunicationArrowMesh from 'explorviz-frontend/view-objects/3d/application/communication-arrow-mesh';
import ComponentMesh from 'explorviz-frontend/view-objects/3d/application/component-mesh';
import FoundationMesh from 'explorviz-frontend/view-objects/3d/application/foundation-mesh';

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
  applicationObject3D: ApplicationObject3D[];
  communicationLinks: CommunicationLink[];
};

type ParentOrder = {
  fqn: string;
  meshid: string;
  childs: ParentOrder[];
  methods: ParentOrder[];
};

export type OrderTuple = {
  hierarchyModel: ParentOrder;
  meshes: { meshNames: string[]; meshIds: string[] };
};

export function getVizData(
  applicationRenderer: ApplicationRenderer,
  applicationRepo: ApplicationRepository,
  foundationCommunicationLinks: CommunicationLink[]
): VizDataRaw {
  const openApplications = applicationRenderer.getOpenApplications();
  const communicationLinks: CommunicationLink[] = foundationCommunicationLinks;

  openApplications.forEach((application) => {
    const applicationData = applicationRepo.getById(application.getModelId());

    const drawableClassCommunications =
      applicationData?.drawableClassCommunications;

    // console.log(drawableClassCommunications)

    // Add Communication meshes inside the foundations to the foundation communicationLinks list
    drawableClassCommunications?.forEach((element) => {
      const meshIDs = element.id.split('_');
      const tempCL: CommunicationLink = {
        meshID: element.id,
        sourceMeshID: meshIDs[0],
        targetMeshID: meshIDs[1],
        methodName: meshIDs[2],
      };
      // TODO: Consider using a set of meshIDs
      if (communicationLinks.findIndex((e) => e.meshID === element.id) === -1) {
        communicationLinks.push(tempCL);
      }
    });
  });

  // console.log("communicationLinks", communicationLinks)
  return {
    applicationObject3D: openApplications,
    communicationLinks: communicationLinks,
  };
}

export function getIdFromMesh(mesh: THREE.Object3D<THREE.Event>): string {
  if (mesh instanceof FoundationMesh) {
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
  } else {
    //
    console.error(typeof mesh, ' --- Mesh Type not Supported!');
    return 'Not implemented';
  }
}

export function VizDataToOrderTuple(vizData: VizDataRaw): OrderTuple[] {
  return vizData.applicationObject3D.map((element) => {
    const orderedParents = getOrderedParents(element.data.application);
    const meshes = getFqnForMeshes(orderedParents);
    const orderTuple: OrderTuple = {
      hierarchyModel: orderedParents,
      meshes: meshes,
    };
    addCommunicationLinksToOrderTuple(orderTuple, vizData.communicationLinks);
    return orderTuple;
  });
}

export function OpenObject(
  doSomethingOnMesh: (meshID: string) => void,
  fullQualifiedName: string,
  occurrenceID: number,
  lookAtMesh: (meshID: string) => void,
  vizData: VizDataRaw
) {
  const orderTuple: OrderTuple[] = VizDataToOrderTuple(vizData);

  resetFoundation(doSomethingOnMesh, orderTuple);

  orderTuple.forEach((ot) => {
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

/**
 * Create a tree containing all packages, classes and methods
 * from the given data model but with fully qualified names.
 * The fully qualified name has a prefix containing the parent
 * names joined by dots.
 */
function getOrderedParents(dataModel: Application): ParentOrder {
  const childs = dataModel.packages.map((element) => {
    const fqn = dataModel.name + '.' + element.name;
    return {
      fqn: fqn,
      childs: parentPackage(fqn, element.subPackages, element.classes),
      meshid: element.id,
      methods: [],
    };
  });

  const result: ParentOrder = {
    fqn: dataModel.name,
    childs,
    meshid: dataModel.id,
    methods: [],
  };

  return result;
}

function parentPackage(
  fqn: string,
  subpackages: Package[],
  classes: Class[]
): ParentOrder[] {
  if (subpackages.length === 0) {
    return parentClass(fqn, classes);
  }

  return subpackages.map((element) => {
    const newFqn = fqn + '.' + element.name;
    return {
      fqn: newFqn,
      childs: parentPackage(newFqn, element.subPackages, element.classes),
      meshid: element.id,
      methods: [],
    };
  });
}

function parentClass(fqn: string, classes: Class[]): ParentOrder[] {
  return classes.map((element) => {
    const newFqn = fqn + '.' + element.name;
    return {
      fqn: newFqn,
      childs: [],
      meshid: element.id,
      methods: [],
    };
  });
}

function getFqnForMeshes(orderedParents: ParentOrder): {
  meshNames: string[];
  meshIds: string[];
} {
  const meshName: string = orderedParents.fqn;
  const meshId: string = orderedParents.meshid;

  const meshTemp = { meshNames: [meshName], meshIds: [meshId] };

  if (orderedParents.methods.length > 0) {
    // TODO: consider using map & flat
    orderedParents.methods.forEach((element) => {
      // TODO: only call getFqnForMeshes once
      meshTemp.meshNames = meshTemp.meshNames.concat(
        getFqnForMeshes(element).meshNames
      );
      meshTemp.meshIds = meshTemp.meshIds.concat(
        getFqnForMeshes(element).meshIds
      );
    });
  } else {
    orderedParents.childs.forEach((element) => {
      // TODO: only call getFqnForMeshes once
      meshTemp.meshNames = meshTemp.meshNames.concat(
        getFqnForMeshes(element).meshNames
      );
      meshTemp.meshIds = meshTemp.meshIds.concat(
        getFqnForMeshes(element).meshIds
      );
    });
  }

  return meshTemp;
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
      if (toOpen == element.fqn) {
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
  let tempBool = false;
  // TODO: use for loop and do an early exit
  po.childs.forEach((element) => {
    tempBool =
      tempBool ||
      isInParentOrder(
        {
          fqn: element.fqn,
          childs: element.childs,
          meshid: element.meshid,
          methods: [],
        },
        name
      );
  });

  return tempBool;
}

function resetFoundation(
  doSomethingOnMesh: (meshID: string) => void,
  orderTuple: OrderTuple[]
) {
  orderTuple.forEach((ot) => {
    doSomethingOnMesh(ot.hierarchyModel.meshid);
  });
}

function addCommunicationLinksToOrderTuple(
  ot: OrderTuple,
  communicationLinks: CommunicationLink[]
): void {
  communicationLinks.forEach((cl) => {
    // TODO: consider using a different data structure such as map
    const communicationLinkFQNIndex = ot.meshes.meshIds.findIndex(
      (e) => e === cl.targetMeshID
    );
    if (communicationLinkFQNIndex >= 0) {
      const communicationLinkFQN =
        ot.meshes.meshNames[communicationLinkFQNIndex] + '.' + cl.methodName;

      ot.hierarchyModel = insertCommunicationInParentOrder(
        cl,
        communicationLinkFQN,
        ot.hierarchyModel
      );
      ot.meshes.meshNames.push(communicationLinkFQN);
      ot.meshes.meshIds.push(cl.meshID);
    }
  });
}

function insertCommunicationInParentOrder(
  cl: CommunicationLink,
  communicationLinkFQN: string,
  po: ParentOrder
): ParentOrder {
  if (cl.targetMeshID === po.meshid) {
    const newPO: ParentOrder = {
      childs: [],
      fqn: communicationLinkFQN,
      meshid: cl.meshID,
      methods: [],
    };
    po.childs.push(newPO);
  } else {
    po.childs = po.childs.map((element) =>
      insertCommunicationInParentOrder(cl, communicationLinkFQN, element)
    );
  }

  return po;
}