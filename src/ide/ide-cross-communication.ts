import ApplicationObject3D from 'explorviz-frontend/src/view-objects/3d/application/application-object-3d';
import {
  Application,
  Class,
  Package,
} from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import ClazzCommunicationMesh from 'explorviz-frontend/src/view-objects/3d/application/clazz-communication-mesh';
import ClazzMesh from 'explorviz-frontend/src/view-objects/3d/application/clazz-mesh';
import CommunicationArrowMesh from 'explorviz-frontend/src/view-objects/3d/application/communication-arrow-mesh';
import ComponentMesh from 'explorviz-frontend/src/view-objects/3d/application/component-mesh';
import FoundationMesh from 'explorviz-frontend/src/view-objects/3d/application/foundation-mesh';
import { useApplicationRendererStore } from 'explorviz-frontend/src/stores/application-renderer';
import { useApplicationRepositoryStore } from 'explorviz-frontend/src/stores/repos/application-repository';
import IdeCrossCommunicationEvent from 'explorviz-frontend/src/ide/ide-cross-communication-event';
import { Object3DEventMap } from 'three';
import eventEmitter from 'explorviz-frontend/src/utils/event-emitter';

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

type OrderTuple = {
  hierarchyModel: ParentOrder;
  meshes: { meshNames: string[]; meshIds: string[] };
};

// @ts-ignore value is set in listener function of websocket
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let vizDataOrderTupleGlobal: OrderTuple[] = [];
let foundationCommunicationLinksGlobal: CommunicationLink[] = [];

export default class IdeCrossCommunication {
  handleDoubleClickOnMesh: (meshID: string) => void;
  lookAtMesh: (meshID: string) => void;

  constructor(
    handleDoubleClickOnMesh: (meshID: string) => void,
    lookAtMesh: (meshID: string) => void
  ) {
    this.handleDoubleClickOnMesh = handleDoubleClickOnMesh;
    this.lookAtMesh = lookAtMesh;

    eventEmitter.on('ide-refresh-data', this.refreshVizData.bind(this));

    this.setupCrossOriginListener();
  }

  private setupCrossOriginListener() {
    window.addEventListener(
      'message',
      (event: IdeCrossCommunicationEvent) => {
        const data = event.data;

        if (!data) {
          return;
        }

        const vizDataRaw = this.getVizData(foundationCommunicationLinksGlobal);
        const vizDataOrderTuple = VizDataToOrderTuple(vizDataRaw);

        vizDataOrderTupleGlobal = vizDataOrderTuple;

        switch (data.action) {
          case 'singleClickOnMesh':
            break;

          case 'doubleClickOnMesh':
            console.log('vizDataOrderTuple:', vizDataOrderTuple);
            console.log('data: ', data);
            OpenObject(
              this.handleDoubleClickOnMesh,
              data.fqn,
              data.occurrenceID,
              this.lookAtMesh,
              vizDataRaw
            );

            break;

          case 'clickTimeLine':
            break;

          case 'getVizData':
            emitToBackend({
              action: IDEApiActions.Refresh,
              data: vizDataOrderTuple,
              meshId: '',
              fqn: '',
              occurrenceID: -1,
              foundationCommunicationLinks: data.foundationCommunicationLinks,
            });
            break;

          default:
            break;
        }
      },
      false
    );
  }

  private getVizData(
    foundationCommunicationLinks: CommunicationLink[]
  ): VizDataRaw {
    const openApplications = useApplicationRendererStore
      .getState()
      .getOpenApplications();
    const communicationLinks: CommunicationLink[] =
      foundationCommunicationLinks;
    openApplications.forEach((element) => {
      const application = element;

      const applicationData = useApplicationRepositoryStore
        .getState()
        .getById(application.getModelId());

      const classCommunications = applicationData?.classCommunications;

      // Add Communication meshes inside the foundations to the foundation communicationLinks list
      if (classCommunications && classCommunications.length != 0) {
        classCommunications.forEach((element) => {
          const meshIDs = element.id.split('_');
          const tempCL: CommunicationLink = {
            meshID: element.id,
            sourceMeshID: meshIDs[0],
            targetMeshID: meshIDs[1],
            methodName: meshIDs[2],
          };
          if (
            communicationLinks.findIndex((e) => e.meshID == element.id) == -1
          ) {
            communicationLinks.push(tempCL);
          }
        });
      }
    });

    return {
      applicationObject3D: openApplications,
      communicationLinks: communicationLinks,
    };
  }

  jumpToLocation(object: THREE.Object3D<Object3DEventMap>) {
    const vizDataRaw: VizDataRaw = this.getVizData(
      foundationCommunicationLinksGlobal
    );
    const vizDataOrderTuple: OrderTuple[] = VizDataToOrderTuple(vizDataRaw);
    emitToBackend({
      action: IDEApiActions.JumpToLocation,
      data: vizDataOrderTuple,
      meshId: getIdFromMesh(object),
      fqn: '',
      occurrenceID: -1,
      foundationCommunicationLinks: foundationCommunicationLinksGlobal,
    });
  }

  refreshVizData(cl: CommunicationLink[]) {
    foundationCommunicationLinksGlobal = cl;

    const vizDataRaw: VizDataRaw = this.getVizData(
      foundationCommunicationLinksGlobal
    );
    const vizDataOrderTuple: OrderTuple[] = VizDataToOrderTuple(vizDataRaw);

    emitToBackend({
      action: IDEApiActions.Refresh,
      data: vizDataOrderTuple,
      meshId: '',
      fqn: '',
      occurrenceID: -1,
      foundationCommunicationLinks: foundationCommunicationLinksGlobal,
    });
  }
}

function getOrderedParents(dataModel: Application): ParentOrder {
  const result: ParentOrder = {
    fqn: dataModel.name,
    childs: [],
    meshid: dataModel.id,
    methods: [],
  };
  const temp: ParentOrder[] = [];
  dataModel.packages.forEach((element) => {
    const fqn = dataModel.name + '.' + element.name;
    temp.push({
      fqn: fqn,
      childs: parentPackage(fqn, element.subPackages, element.classes),
      meshid: element.id,
      methods: [],
    });
  });

  result.childs = temp;

  return result;
}

function parentPackage(
  fqn: string,
  subpackages: Package[],
  classes: Class[]
): ParentOrder[] {
  const temp: ParentOrder[] = [];

  if (subpackages.length === 0) {
    return parentClass(fqn, classes);
  }
  subpackages.forEach((element) => {
    const newFqn = fqn + '.' + element.name;
    temp.push({
      fqn: newFqn,
      childs: parentPackage(newFqn, element.subPackages, element.classes),
      meshid: element.id,
      methods: [],
    });
  });

  return temp;
}

function parentClass(fqn: string, classes: Class[]): ParentOrder[] {
  const temp: ParentOrder[] = [];
  if (classes.length === 0) {
    return temp;
  }
  classes.forEach((element) => {
    const newFqn = fqn + '.' + element.name;
    temp.push({
      fqn: newFqn,
      childs: [],
      meshid: element.id,
      methods: [],
    });
  });

  return temp;
}

function getFqnForMeshes(orderedParents: ParentOrder): {
  meshNames: string[];
  meshIds: string[];
} {
  const meshName: string = orderedParents.fqn;
  const meshId: string = orderedParents.meshid;

  const meshTemp = { meshNames: [meshName], meshIds: [meshId] };

  if (orderedParents.methods.length != 0) {
    orderedParents.methods.forEach((element) => {
      meshTemp.meshNames = meshTemp.meshNames.concat(
        getFqnForMeshes(element).meshNames
      );
      meshTemp.meshIds = meshTemp.meshIds.concat(
        getFqnForMeshes(element).meshIds
      );
    });
  } else {
    orderedParents.childs.forEach((element) => {
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
function VizDataToOrderTuple(vizData: VizDataRaw): OrderTuple[] {
  const vizDataOrderTuple: OrderTuple[] = [];
  vizData.applicationObject3D.forEach((element) => {
    const orderedParents = getOrderedParents(element.dataModel.application);
    const meshes = getFqnForMeshes(orderedParents);
    let tempOT: OrderTuple = { hierarchyModel: orderedParents, meshes: meshes };
    tempOT = addCommunicationLinksToOrderTuple(
      tempOT,
      vizData.communicationLinks
    );
    vizDataOrderTuple.push(tempOT);
  });
  return vizDataOrderTuple;
}

function OpenObject(
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

export function emitToBackend(apiCall: IDEApiCall) {
  window.parent.postMessage(apiCall, '*');
}

function getIdFromMesh(mesh: THREE.Object3D<Object3DEventMap>): string {
  if (mesh instanceof FoundationMesh) {
    return mesh.dataModel.id;
  } else if (mesh instanceof ComponentMesh) {
    return mesh.dataModel.id;
  } else if (mesh instanceof ClazzMesh) {
    return mesh.dataModel.id;
  } else if (mesh instanceof ClazzCommunicationMesh) {
    return mesh.dataModel.id;
  } else if (mesh instanceof CommunicationArrowMesh) {
    return 'Not implemented CommunicationArrowMesh';
  } else {
    return 'Not implemented';
  }
}
function addCommunicationLinksToOrderTuple(
  ot: OrderTuple,
  communicationLinks: CommunicationLink[]
): OrderTuple {
  const tempOT = ot;

  communicationLinks.forEach((cl) => {
    const communicationLinkFQNIndex = ot.meshes.meshIds.findIndex(
      (e) => e === cl.targetMeshID
    );
    if (communicationLinkFQNIndex >= 0) {
      const communicationLinkFQN =
        ot.meshes.meshNames[communicationLinkFQNIndex] + '.' + cl.methodName;

      tempOT.hierarchyModel = insertCommunicationInParentOrder(
        cl,
        communicationLinkFQN,
        tempOT.hierarchyModel
      );
      tempOT.meshes.meshNames.push(communicationLinkFQN);
      tempOT.meshes.meshIds.push(cl.meshID);
    }
  });

  return tempOT;
}

function insertCommunicationInParentOrder(
  cl: CommunicationLink,
  communicationLinkFQN: string,
  po: ParentOrder
): ParentOrder {
  if (cl.targetMeshID == po.meshid) {
    const newPO: ParentOrder = {
      childs: [],
      fqn: communicationLinkFQN,
      meshid: cl.meshID,
      methods: [],
    };
    const tempPO = po;
    tempPO.childs.push(newPO);
    return tempPO;
  } else {
    const temp: ParentOrder[] = [];
    po.childs.forEach((element) => {
      temp.push(
        insertCommunicationInParentOrder(cl, communicationLinkFQN, element)
      );
    });
    return {
      fqn: po.fqn,
      meshid: po.meshid,
      methods: po.methods,
      childs: temp,
    };
  }
}
