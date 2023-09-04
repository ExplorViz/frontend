import {
  OrderTuple,
  VizDataRaw,
  ParentOrder,
  CommunicationLink,
} from 'explorviz-frontend/ide/shared';
import type {
  Application,
  Class,
  Package,
} from 'explorviz-frontend/utils/landscape-schemes/structure-data';

export function convertVizDataToOrderTuple(vizData: VizDataRaw): OrderTuple[] {
  return vizData.applications.map((application) => {
    const orderedParents = getOrderedParents(application);
    const meshes = getFqnForMeshes(orderedParents);
    const orderTuple: OrderTuple = {
      hierarchyModel: orderedParents,
      meshes: meshes,
    };
    addCommunicationLinksToOrderTuple(orderTuple, vizData.communicationLinks);
    return orderTuple;
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
