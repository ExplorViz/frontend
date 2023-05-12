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

const { vsCodeService } = ENV.backendAddresses;

let httpSocket = vsCodeService;
let socket: Socket<DefaultEventsMap, DefaultEventsMap> | undefined = undefined;
// @ts-ignore value is set in listener function of websocket
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let vizDataOrderTupleGlobal: OrderTuple[] = [];
let foundationCommunicationLinksGlobal: CommunicationLink[] = [];

let previousVizData: OrderTuple[] = [];

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

    socket!.on('disconnect', (err) => {
      if (err === 'transport close') {
        AlertifyHandler.showAlertifyError(
          'IDE connection was unexpectedly closed. Will try to reconnect.'
        );
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

    socket!.on('vizDo', (data: IDEApiCall) => {
      const vizDataRaw = this.getVizData(foundationCommunicationLinksGlobal);
      const vizDataOrderTuple = VizDataToOrderTuple(vizDataRaw);

      console.log('vizdo');

      vizDataOrderTupleGlobal = vizDataOrderTuple;
      // foundationCommunicationLinksGlobal = data.foundationCommunicationLinks;

      socket!.on('connect_error', (err: any) => {
        console.log(`connect_error due to ${err.message}`);
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

      switch (data.action) {
        case 'singleClickOnMesh':
          // handleSingleClickOnMesh(applObj3D.children[29])
          // recursivelyOpenObjects(handleSingleClickOnMesh, "explorviz", Open3dObjectsHelper(applObj3D))
          // console.log(applObj3D.children[29])
          break;
        case 'doubleClickOnMesh':
          // handleDoubleClickOnMesh(applObj3D.children[1])
          // OpenObject(handleDoubleClickOnMesh, "sampleApplication")
          console.log('data: ', data.fqn, data.occurrenceID, vizDataOrderTuple);

          this.openObjects2(vizDataOrderTuple);
          // OpenObject(handleDoubleClickOnMesh,"petclinic-demo.org.springframework.samples.petclinic.owner")
          // recursivelyOpenObjects(handleDoubleClickOnMesh, "samples", Open3dObjectsHelper(applObj3D))
          // console.log(applObj3D)

          break;
        case 'clickTimeLine':
          break;
        case 'getVizData':
          // console.log("VizData: ")
          // console.log(vizData)
          // emitToBackend(IDEApiDest.IDEDo, { action: IDEApiActions.GetVizData, data: [], meshId: "" })
          if (previousVizData.length === 0) {
            log('Initial payload');
            emitToBackend(IDEApiDest.IDEDo, {
              action: IDEApiActions.GetVizData,
              data: vizDataOrderTuple,
              meshId: '',
              fqn: '',
              occurrenceID: -1,
              foundationCommunicationLinks: data.foundationCommunicationLinks,
            });
          } else if (
            JSON.stringify(previousVizData) !==
            JSON.stringify(vizDataOrderTuple)
          ) {
            log('Update');
            emitToBackend(IDEApiDest.IDEDo, {
              action: IDEApiActions.GetVizData,
              data: vizDataOrderTuple,
              meshId: '',
              fqn: '',
              occurrenceID: -1,
              foundationCommunicationLinks: data.foundationCommunicationLinks,
            });
          }
          previousVizData = vizDataOrderTuple;
          break;
        default:
          break;
      }
    });
  }

  private openObjects2(orderTuple: OrderTuple[]) {
    //console.log(
    //  'orderTuple in OpenObject: ',
    //  orderTuple,
    //  vizData.communicationLinks
    //);
    //resetFoundation(doSomethingOnMesh, orderTuple);

    orderTuple.forEach((ot) => {
      const meshId = ot.hierarchyModel.meshid;
      const mesh = this.applicationRenderer.getMeshById(meshId);

      this.handleDoubleClickOnMesh(meshId);

      //console.log(isComponent mesh);

      //for (const application of this.applicationRepo.getAll()) {
      //  application.application.
      // }
      // this.applicationRenderer.openParents(mesh.get, 1);
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
        application.dataModel.id
      );

      const drawableClassCommunications =
        applicationData?.drawableClassCommunications;

      // console.log(drawableClassCommunications)

      // Add Communication meshes inside the foundations to the foundation communicationLinks list
      if (
        drawableClassCommunications &&
        drawableClassCommunications.length != 0
      ) {
        drawableClassCommunications.forEach((element) => {
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

  jumpToLocation(object: THREE.Object3D<THREE.Event>) {
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
    socket = io(newHttpSocket);
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

    // if (element.classes.length !== 0) {
    //   console.log("test")
    //   temp.push({ name: fqn, childs: parentClass(fqn, element.classes) })
    // }
    // else if (element.subPackages.length !== 0) {
    //   console.log(fqn)
    //   temp.push({ name: fqn, childs: parentPackage(fqn, element.subPackages) })

    // }
    // else {
    //   console.error("getOrderedParents miss a Case")
    // }
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
    // console.log(newFqn, ": ", element.methods)
    temp.push({
      fqn: newFqn,
      // childs: [],
      childs: [],
      meshid: element.id,
      methods: [],
      // methods: parentMethod(newFqn, element.methods)
    });
    // temp.push({ fqn: newFqn, childs: [], meshid: element.id });
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
  // console.log("applObj3D:", applObj3D.commIdToMesh)
  const vizDataOrderTuple: OrderTuple[] = [];
  vizData.applicationObject3D.forEach((element) => {
    // const temp = VizDataToOrderTuple(element)
    // vizDataOrderTuple.push(temp);
    const orderedParents = getOrderedParents(element.dataModel);
    const meshes = getFqnForMeshes(orderedParents);
    let tempOT: OrderTuple = { hierarchyModel: orderedParents, meshes: meshes };
    tempOT = addCommunicationLinksToOrderTuple(
      tempOT,
      vizData.communicationLinks
    );
    vizDataOrderTuple.push(tempOT);
  });
  // console.log(orderedParents)
  // console.log(meshNames)
  //console.log(
  //  'vizDataOrderTuple',
  //  vizDataOrderTuple,
  //  vizData.communicationLinks
  //);

  return vizDataOrderTuple;
}

function OpenObject(
  doSomethingOnMesh: (meshID: string) => void,
  _fullQualifiedName: string,
  _occurrenceID: number,
  _lookAtMesh: (meshID: string) => void,
  vizData: VizDataRaw
) {
  // console.log(fullQualifiedName)

  const orderTuple: OrderTuple[] = VizDataToOrderTuple(vizData);

  //console.log(
  //  'orderTuple in OpenObject: ',
  //  orderTuple,
  //  vizData.communicationLinks
  //);
  //resetFoundation(doSomethingOnMesh, orderTuple);

  const that = this;

  orderTuple.forEach((ot) => {
    const meshId = ot.hierarchyModel.meshid;
    const mesh = that.applicationRenderer.getMeshById(meshId);
    that.applicationRenderer.openParents(mesh);
  });
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

function getIdFromMesh(mesh: THREE.Object3D<THREE.Event>): string {
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
