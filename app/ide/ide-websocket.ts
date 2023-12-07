import { inject as service } from '@ember/service';
import ENV from 'explorviz-frontend/config/environment';
import { Socket, io } from 'socket.io-client';
import ApplicationObject3D from 'explorviz-frontend/view-objects/3d/application/application-object-3d';
import Auth from 'explorviz-frontend/services/auth';
import { setOwner } from '@ember/application';
import {
  Application,
  Class,
  Package,
} from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import ClazzCommunicationMesh from 'explorviz-frontend/view-objects/3d/application/clazz-communication-mesh';
import ClazzMesh from 'explorviz-frontend/view-objects/3d/application/clazz-mesh';
import CommunicationArrowMesh from 'explorviz-frontend/view-objects/3d/application/communication-arrow-mesh';
import ComponentMesh from 'explorviz-frontend/view-objects/3d/application/component-mesh';
import FoundationMesh from 'explorviz-frontend/view-objects/3d/application/foundation-mesh';
import debugLogger from 'ember-debug-logger';
import IdeWebsocketFacade from 'explorviz-frontend/services/ide-websocket-facade';
import ApplicationRenderer from 'explorviz-frontend/services/application-renderer';
import ApplicationRepository from 'explorviz-frontend/services/repos/application-repository';
import { DefaultEventsMap } from '@socket.io/component-emitter';
import AlertifyHandler from 'explorviz-frontend/utils/alertify-handler';
import { Object3DEventMap } from 'three';

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
  ConnectIDE = 'connectIDE',
  DisconnectIDE = 'disconnectIDE',
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

const { vsCodeService } = ENV.backendAddresses;

let httpSocket = vsCodeService;
let socket: Socket<DefaultEventsMap, DefaultEventsMap> | undefined = undefined;
// @ts-ignore value is set in listener function of websocket
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let vizDataOrderTupleGlobal: OrderTuple[] = [];
let foundationCommunicationLinksGlobal: CommunicationLink[] = [];

const log = debugLogger('ide-websocket');

export default class IdeWebsocket {
  @service('auth')
  auth!: Auth;

  @service('ide-websocket-facade')
  ideWebsocketFacade!: IdeWebsocketFacade;

  @service('application-renderer')
  applicationRenderer!: ApplicationRenderer;

  @service('repos/application-repository')
  applicationRepo!: ApplicationRepository;

  handleDoubleClickOnMesh: (meshID: string) => void;
  lookAtMesh: (meshID: string) => void;

  constructor(
    owner: any,
    handleDoubleClickOnMesh: (meshID: string) => void,
    lookAtMesh: (meshID: string) => void
  ) {
    setOwner(this, owner);

    this.handleDoubleClickOnMesh = handleDoubleClickOnMesh;
    this.lookAtMesh = lookAtMesh;

    this.ideWebsocketFacade.on(
      'ide-refresh-data',
      this.refreshVizData.bind(this)
    );

    this.ideWebsocketFacade.on(
      'ide-restart-connection',
      this.reInitialize.bind(this)
    );
  }

  private reInitialize() {
    this.restartAndSetSocket(httpSocket);
    this.setupSocketListeners();
  }

  private setupSocketListeners() {
    if (!socket) {
      return;
    }

    // Disconnect-Event from a Frontend-Client.
    socket!.on('disconnect', (err) => {
      if (err === 'transport close') {
        this.ideWebsocketFacade.isConnected = false;
      }
    });

    socket.on('reconnect', () => {
      this.ideWebsocketFacade.isConnected = true;
    });

    socket!.on('connect', () => {
      socket!.emit(
        'update-user-info',
        { userId: this.auth.user?.nickname },
        (roomName: string) => {
          this.ideWebsocketFacade.roomName = roomName;
          this.ideWebsocketFacade.isConnected = true;
        }
      );
      //socket.emit('update-user-info', { userId: 'explorviz-user' });
    });

    socket!.on('connect_error', () => {
      AlertifyHandler.showAlertifyMessageWithDurationAndClickCallback(
        'IDE connection was unexpectedly closed. Will try to reconnect. <b><u>Click here to stop reconnection.</u></b>',
        4,
        () => {
          console.log('hello from the other side');
          socket?.disconnect();
        },
        'error'
      );
    });

    socket!.on('reconnect_error', (error) => {
      console.log(`error due to ${error.message}`);
    });

    socket!.on('reconnect_error', (error) => {
      console.log(`error due to ${error.message}`);
    });

    socket!.on('reconnect_failed', () => {
      console.log(`reconnect failed`);
    });

    // Handling the event an IDE successfully connects.
    socket!.on('vizDo', (data: IDEApiCall) => {
      const vizDataRaw = this.getVizData(foundationCommunicationLinksGlobal);
      const vizDataOrderTuple = VizDataToOrderTuple(vizDataRaw);

      vizDataOrderTupleGlobal = vizDataOrderTuple;
      // foundationCommunicationLinksGlobal = data.foundationCommunicationLinks;

      switch (data.action) {
        case 'singleClickOnMesh':
          break;

        case 'doubleClickOnMesh':
          console.log('vizDataOrderTuple:', vizDataOrderTuple);
          console.log('data: ', data);
          //this.openObjects(vizDataOrderTuple, data.fqn);
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
          emitToBackend(IDEApiDest.IDEDo, {
            action: IDEApiActions.Refresh,
            data: vizDataOrderTuple,
            meshId: '',
            fqn: '',
            occurrenceID: -1,
            foundationCommunicationLinks: data.foundationCommunicationLinks,
          });
          break;

        case 'connectIDE':
          AlertifyHandler.showAlertifySuccess(
            'An IDE has successfully connected to this room.'
          );
          console.log('An IDE has successfully connected.');
          this.ideWebsocketFacade.numConnectedIDEs++;
          break;

        case 'disconnectIDE':
          console.log('An IDE has disconnected.');
          AlertifyHandler.showAlertifySuccess('An IDE has disconnected.');
          this.ideWebsocketFacade.numConnectedIDEs--;
          break;

        default:
          break;
      }
    });
  }

  private getVizData(
    foundationCommunicationLinks: CommunicationLink[]
  ): VizDataRaw {
    const openApplications = this.applicationRenderer.getOpenApplications();
    const communicationLinks: CommunicationLink[] =
      foundationCommunicationLinks;
    openApplications.forEach((element) => {
      const application = element;

      const applicationData = this.applicationRepo.getById(
        application.getModelId()
      );

      const classCommunications = applicationData?.classCommunications;

      // console.log(classCommunications)

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

    // console.log("communicationLinks", communicationLinks)
    return {
      applicationObject3D: openApplications,
      communicationLinks: communicationLinks,
    };
  }

  //jumpToLocation(object: THREE.Object3D<THREE.Event>) {
  jumpToLocation(object: THREE.Object3D<Object3DEventMap>) {
    if (!socket || (socket && socket.disconnected)) {
      return;
    }

    const vizDataRaw: VizDataRaw = this.getVizData(
      foundationCommunicationLinksGlobal
    );
    const vizDataOrderTuple: OrderTuple[] = VizDataToOrderTuple(vizDataRaw);
    emitToBackend(IDEApiDest.IDEDo, {
      action: IDEApiActions.JumpToLocation,
      data: vizDataOrderTuple,
      meshId: getIdFromMesh(object),
      fqn: '',
      occurrenceID: -1,
      foundationCommunicationLinks: foundationCommunicationLinksGlobal,
    });
  }

  refreshVizData(cl: CommunicationLink[]) {
    if (!socket || (socket && socket.disconnected)) {
      return;
    }

    foundationCommunicationLinksGlobal = cl;

    const vizDataRaw: VizDataRaw = this.getVizData(
      foundationCommunicationLinksGlobal
    );
    const vizDataOrderTuple: OrderTuple[] = VizDataToOrderTuple(vizDataRaw);

    log('Send new data to ide');
    emitToBackend(IDEApiDest.IDEDo, {
      action: IDEApiActions.Refresh,
      data: vizDataOrderTuple,
      meshId: '',
      fqn: '',
      occurrenceID: -1,
      foundationCommunicationLinks: foundationCommunicationLinksGlobal,
    });
  }

  dispose() {
    log('Disconnecting socket');
    if (socket) {
      socket.disconnect();
      this.ideWebsocketFacade.isConnected = false;
    }
  }

  restartAndSetSocket(newHttpSocket: string) {
    httpSocket = newHttpSocket;
    if (socket) {
      socket.disconnect();
      this.ideWebsocketFacade.isConnected = false;
    }
    log('Restarting socket with: ', newHttpSocket);
    socket = io(newHttpSocket, {
      path: '/v2/ide/',
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
  // console.log(classes)
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
    const orderedParents = getOrderedParents(element.data.application);
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

export function emitToBackend(dest: IDEApiDest, apiCall: IDEApiCall) {
  socket!.emit(dest, apiCall);
}

export function sendMonitoringData(monitoringData: MonitoringData[]) {
  // emitToBackend(IDEApiDest.VizDo, { action: IDEApiActions.DoubleClickOnMesh, fqn: "org.springframework.samples.petclinic.model.Person", data: vizDataGlobal, meshId: "fde04de43a0b4da545d3df022ce824591fe61705835ca96b80f5dfa39f7b1be6", occurrenceID: 0 })
  console.log('monitroingData: ', monitoringData);
  socket!.emit(IDEApiDest.IDEDo, {
    action: IDEApiActions.JumpToMonitoringClass,
    monitoringData: monitoringData,
  });
  // emitToBackend(IDEApiDest.IDEDo, {
  //   action: IDEApiActions.JumpToMonitoringClass,
  //   data: vizDataGlobal,
  //   meshId: 'fde04de43a0b4da545d3df022ce824591fe61705835ca96b80f5dfa39f7b1be6',
  //   fqn: '',
  //   occurrenceID: -1,
  //   monitoringData: monitoringData
  // });
}

//function getIdFromMesh(mesh: THREE.Object3D<THREE.Event>): string {
function getIdFromMesh(mesh: THREE.Object3D<Object3DEventMap>): string {
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
