import Modifier from 'ember-modifier';
import { LandscapeData } from 'explorviz-frontend/controllers/visualization';
import { Socket } from 'socket.io-client';
import { DefaultEventsMap } from 'socket.io/dist/typed-events';
import Service, { inject as service } from '@ember/service';
import ENV from 'explorviz-frontend/config/environment';
import { io } from 'socket.io-client';
import ApplicationObject3D from 'explorviz-frontend/view-objects/3d/application/application-object-3d';
import Auth from 'explorviz-frontend/services/auth';
import debugLogger from 'ember-debug-logger';
import { registerDestructor } from '@ember/destroyable';
import {
  Application,
  Class,
  Package,
} from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import ApplicationRenderer from 'explorviz-frontend/services/application-renderer';
import ApplicationRepository from 'explorviz-frontend/services/repos/application-repository';

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

// Server Setup
let socket: Socket<DefaultEventsMap, DefaultEventsMap>;

export default class IdeInteractionModifier extends Modifier {
  private log = debugLogger('IDE-INTERACTION');

  private previousVizData: OrderTuple[] = [];
  private foundationCommunicationLinksGlobal: CommunicationLink[] = [];

  // Arguments passed on hbs
  private landscapeData!: LandscapeData;
  private doubleClickOnMesh: any;
  private lookAtMesh: any;

  // Injections
  @service('auth')
  auth!: Auth;

  @service('application-renderer')
  applicationRenderer!: ApplicationRenderer;

  @service('repos/application-repository')
  applicationRepo!: ApplicationRepository;

  modify(
    _element: any,
    _positionalArgs: any[],
    { landscapeData, doubleClickOnMesh, lookAtMesh }: any
  ) {
    this.landscapeData = landscapeData;
    this.doubleClickOnMesh = doubleClickOnMesh;
    this.lookAtMesh = lookAtMesh;

    console.debug('landscape data', this.landscapeData);
    console.debug('double click', this.doubleClickOnMesh);
    console.debug('camera', this.lookAtMesh);

    if (!socket || socket.disconnected) {
      this.setupWebsocket();
      this.setupWebsocketListener();
      registerDestructor(this, this.cleanup);
    }

    this.handleNewLandscapeData();
  }

  setupWebsocket() {
    console.log('test');
    const { vsCodeService } = ENV.backendAddresses;
    this.log('Starting socket with: ', vsCodeService);
    socket = io(vsCodeService);
  }

  setupWebsocketListener() {
    socket.on('connect', () => {
      //socket.emit('update-user-info', { userId: this.auth.user?.user_id });
      socket.emit('update-user-info', { userId: 'explorviz-user' });
    });
  }

  handleNewLandscapeData() {
    const vizDataRaw = this.getVizData(this.foundationCommunicationLinksGlobal);

    const vizDataOrderTuple = VizDataToOrderTuple(vizDataRaw);

    if (this.previousVizData.length === 0) {
      this.log('Initial payload');
      this.emitToBackend(IDEApiDest.IDEDo, {
        action: IDEApiActions.GetVizData,
        data: vizDataOrderTuple,
        meshId: '',
        fqn: '',
        occurrenceID: -1,
        //foundationCommunicationLinks: data.foundationCommunicationLinks,
        foundationCommunicationLinks: [],
      });
    } else if (
      JSON.stringify(this.previousVizData) !== JSON.stringify(vizDataOrderTuple)
    ) {
      this.log('Update');
      this.emitToBackend(IDEApiDest.IDEDo, {
        action: IDEApiActions.GetVizData,
        data: vizDataOrderTuple,
        meshId: '',
        fqn: '',
        occurrenceID: -1,
        //foundationCommunicationLinks: data.foundationCommunicationLinks,
        foundationCommunicationLinks: [],
      });
    }
    this.previousVizData = vizDataOrderTuple;
  }

  emitToBackend(dest: IDEApiDest, apiCall: IDEApiCall) {
    // console.log(dest, apiCall, socket)
    socket.emit(dest, apiCall);
  }

  cleanup() {
    socket.disconnect();
  }

  getVizData(foundationCommunicationLinks: CommunicationLink[]): VizDataRaw {
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
