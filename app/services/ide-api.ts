import Service from '@ember/service';
import Evented from '@ember/object/evented';
import ENV from 'explorviz-frontend/config/environment';
import { io } from 'socket.io-client';
import ApplicationObject3D from 'explorviz-frontend/view-objects/3d/application/application-object-3d';

import {
  Application,
  Class,
  Package,
  Method
} from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import ClazzCommunicationMesh from 'explorviz-frontend/view-objects/3d/application/clazz-communication-mesh';
import ClazzMesh from 'explorviz-frontend/view-objects/3d/application/clazz-mesh';
import CommunicationArrowMesh from 'explorviz-frontend/view-objects/3d/application/communication-arrow-mesh';
import ComponentMesh from 'explorviz-frontend/view-objects/3d/application/component-mesh';
import FoundationMesh from 'explorviz-frontend/view-objects/3d/application/foundation-mesh';
import { GraphNode } from 'explorviz-frontend/rendering/application/force-graph';
import { DrawableClassCommunication } from 'explorviz-frontend/utils/application-rendering/class-communication-computer';

const { vsCodeService } = ENV.backendAddresses;

let httpSocket = vsCodeService;
let socket = io(httpSocket);
let vizDataOrderTupleGlobal: OrderTuple[] = [];
let foundationCommunicationLinksGlobal: CommunicationLink[] = []

export function restartAndSetSocket(newHttpSocket: string) {
  httpSocket = newHttpSocket;
  socket.disconnect();

  console.debug('Restarting socket with: ', newHttpSocket);
  socket = io(newHttpSocket);
}

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
  fqn: string,
  description: string
}

export type CommunicationLink = {
    sourceMeshID: string;
    targetMeshID: string;
    meshID: string;
}

type IDEApiCall = {
  action: IDEApiActions;
  data: OrderTuple[];
  meshId: string;
  occurrenceID: number;
  fqn: string;
  foundationCommunicationLinks: CommunicationLink[]
};

export type VizDataRaw = {
    applicationObject3D: ApplicationObject3D[],
    communicationLinks: CommunicationLink[]
}

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

export default class IDEApi extends Service.extend(Evented) {
  constructor(
    //handleSingleClickOnMesh: (mesh: THREE.Object3D) => void,
    handleDoubleClickOnMesh: (mesh: THREE.Object3D) => void,
    lookAtMesh: (mesh: THREE.Object3D) => void,
    getVizData: (foundationCommunicationLinks: CommunicationLink[]) => VizDataRaw
  ) {
    super();

    socket.on('vizDo', (data: IDEApiCall) => {
      const vizDataRaw = getVizData(data.foundationCommunicationLinks);
      const vizDataOrderTuple = VizDataToOrderTuple(vizDataRaw)
      
      // console.log("vizdo")
      
      vizDataOrderTupleGlobal = vizDataOrderTuple;
      foundationCommunicationLinksGlobal = data.foundationCommunicationLinks;

      socket.on('connect_error', (err: any) => {
        console.log(`connect_error due to ${err.message}`);
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
          console.log('data: ', data.fqn);

          OpenObject(
            handleDoubleClickOnMesh,
            data.fqn,
            data.occurrenceID,
            lookAtMesh,
            vizDataRaw
          );
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
          emitToBackend(IDEApiDest.IDEDo, {
            action: IDEApiActions.GetVizData,
            data: vizDataOrderTuple,
            meshId: '',
            fqn: '',
            occurrenceID: -1,
            foundationCommunicationLinks: data.foundationCommunicationLinks
          });
          break;

        default:
          break;
      }
    });

    this.on('jumpToLocation', (object: THREE.Object3D<THREE.Event>) => {
      const vizDataRaw: VizDataRaw = getVizData(foundationCommunicationLinksGlobal);
      const vizDataOrderTuple: OrderTuple[] = VizDataToOrderTuple(vizDataRaw);

      // vizData.applicationObject3D.forEach((element) => {
      //   const temp = VizDataToOrderTuple(element);
      //   vizDataOrderTuple.push(temp);
      // });
      // console.log(vizDataOrderTuple)

      console.log('mesjhid', getIdFromMesh(object));

      emitToBackend(IDEApiDest.IDEDo, {
        action: IDEApiActions.JumpToLocation,
        data: vizDataOrderTuple,
        meshId: getIdFromMesh(object),
        fqn: '',
        occurrenceID: -1,
        foundationCommunicationLinks: foundationCommunicationLinksGlobal
      });
      // emitToBackend(IDEApiDest.IDEDo, { action: IDEApiActions.JumpToLocation, data: [], meshId: "fde04de43a0b4da545d3df022ce824591fe61705835ca96b80f5dfa39f7b1be6", fqn: "", occurrenceID: -1 })
    });

    this.on('applicationData', (appl: ApplicationObject3D[]) => {
      console.log(appl);
    });

    this.on('test2', () => {
      const vizDataRaw = getVizData(foundationCommunicationLinksGlobal);
      const vizDataOrderTuple: OrderTuple[] = VizDataToOrderTuple(vizDataRaw);
      // vizData.applicationObject3D.forEach((element) => {
      //   const temp = VizDataToOrderTuple(element);
      //   vizDataOrderTuple.push(temp);
      //   console.log(temp);
      // });

      emitToBackend(IDEApiDest.IDEDo, {
        action: IDEApiActions.GetVizData,
        data: vizDataOrderTuple,
        meshId: '',
        fqn: '',
        occurrenceID: -1,
        foundationCommunicationLinks: foundationCommunicationLinksGlobal
      });
      console.log(vizDataOrderTuple);
      // OpenObject(handleDoubleClickOnMesh, "samples")

      // console.log(Open3dObjectsHelper(getApplicationObject3D()[0]))
      console.log('_____TEST2______');
    });
  }
}

function getOrderedParents(dataModel: Application): ParentOrder {
  const result: ParentOrder = {
    fqn: dataModel.name,
    childs: [],
    meshid: dataModel.id,
    methods: []
  };
  const temp: ParentOrder[] = [];
  dataModel.packages.forEach((element) => {
    const fqn = dataModel.name + '.' + element.name;
    temp.push({
      fqn: fqn,
      childs: parentPackage(fqn, element.subPackages, element.classes),
      meshid: element.id,
      methods: []
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
      methods: []
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
      methods: []
      // methods: parentMethod(newFqn, element.methods)
    })
    // temp.push({ fqn: newFqn, childs: [], meshid: element.id });
  });

  return temp;
}

function parentMethod(fqn: string, methods: Method[]): ParentOrder[] {
  const temp: ParentOrder[] = []

  if (methods.length === 0) {
    return temp
  }
  methods.forEach(element => {
    const newFqn = fqn + "." + element.name

    let newPO: ParentOrder = {
      childs: [],
      methods: [],
      fqn: newFqn,
      meshid: element.hashCode + " hashCode",
    };


    temp.push(newPO)
  });
  // console.log("methods: ", methods)
  return temp
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

  }
  else {
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
  vizData.applicationObject3D.forEach(element => {
    // const temp = VizDataToOrderTuple(element)
    // vizDataOrderTuple.push(temp);
    const orderedParents = getOrderedParents(element.dataModel);
    const meshes = getFqnForMeshes(orderedParents);
    vizDataOrderTuple.push({hierarchyModel: orderedParents, meshes: meshes})
  })
  // console.log(orderedParents)
  // console.log(meshNames)
  console.log(vizDataOrderTuple, vizData.communicationLinks)

  return vizDataOrderTuple;
}

function OpenObject(
  doSomethingOnMesh: (mesh: THREE.Object3D) => void,
  fullQualifiedName: string,
  occurrenceID: number,
  lookAtMesh: (mesh: THREE.Object3D) => void,
  vizData: VizDataRaw
) {
  // console.log(fullQualifiedName)
  
  const orderTuple: OrderTuple[] = VizDataToOrderTuple(vizData);

  resetFoundation(doSomethingOnMesh, vizData.applicationObject3D, orderTuple);

  vizData.applicationObject3D.forEach((element) => {
    orderTuple.forEach(ot => {
      const occurrenceName = occurrenceID == -1 ? '.' : '.' + occurrenceID + '.';
      console.log(
        element.dataModel.name + occurrenceName + fullQualifiedName,
        ot,
        element
      );
      recursivelyOpenObjects(
        doSomethingOnMesh,
        lookAtMesh,
        element.dataModel.name + occurrenceName + fullQualifiedName,
        ot,
        element
      );
      
    });
  });
}
function resetFoundation(
  doSomethingOnMesh: (mesh: THREE.Object3D) => void,
  appli3DObj: ApplicationObject3D[],
  orderTuple: OrderTuple[]
) {

  appli3DObj.forEach(app3D => {
    orderTuple.forEach(ot => {
      const mesh =
      app3D.children[
        ot.meshes.meshNames.indexOf(ot.hierarchyModel.fqn)
        ];
      // console.log(appli3DObj);
      doSomethingOnMesh(mesh);
      
    });
  });
}

function recursivelyOpenObjects(
  doSomethingOnMesh: (mesh: THREE.Object3D) => void,
  lookAtMesh: (mesh: THREE.Object3D) => void,
  toOpen: string,
  orderTuple: OrderTuple,
  appli3DObj: ApplicationObject3D
) {

  if (orderTuple.meshes.meshNames.indexOf(toOpen) === -1) {
    // console.error(toOpen, ' mesh not Found', orderTuple.meshes.meshNames);
  }
  // else if (orderTuple.hierarchyModel.name === toOpen) {
  //   doSomethingOnMesh(appli3DObj.children[orderTuple.meshNames.indexOf(toOpen)])
  // }
  // else if(orderTuple.hierarchyModel.childs.length === 0) {

  // }
  else {
    orderTuple.hierarchyModel.childs.forEach((element) => {
      const tempOrder: ParentOrder = {
        fqn: element.fqn,
        childs: element.childs,
        meshid: element.meshid,
        methods: []
      };
      console.log('DoSome:', element, isInParentOrder(element, toOpen));
      if (element.methods.length != 0) {
        console.log("Methods elem: ", element)
      }
      else if (isInParentOrder(element, toOpen)) {
        doSomethingOnMesh(
          appli3DObj.children[orderTuple.meshes.meshNames.indexOf(element.fqn)]
        );
        lookAtMesh(
          appli3DObj.children[orderTuple.meshes.meshNames.indexOf(element.fqn)]
        );
        recursivelyOpenObjects(
          doSomethingOnMesh,
          lookAtMesh,
          toOpen,
          {
            hierarchyModel: tempOrder,
            meshes: orderTuple.meshes,
          },
          appli3DObj
        );
      }
    });
  }
}

function isInParentOrder(po: ParentOrder, name: string): boolean {
  console.log("parentOrder:", po, name)
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
        { fqn: element.fqn, childs: element.childs, meshid: element.meshid, methods: [] },
        name
      );
  });

  return tempBool;
}
export function emitToBackend(dest: IDEApiDest, apiCall: IDEApiCall) {
  // console.log(dest, apiCall, socket)
  socket.emit(dest, apiCall);
}

export function refreshVizData(action: IDEApiActions, cl: CommunicationLink[]) {
  
  socket.emit(action, cl);
}

export function sendMonitoringData(monitoringData: MonitoringData[]) {
  // emitToBackend(IDEApiDest.VizDo, { action: IDEApiActions.DoubleClickOnMesh, fqn: "org.springframework.samples.petclinic.model.Person", data: vizDataGlobal, meshId: "fde04de43a0b4da545d3df022ce824591fe61705835ca96b80f5dfa39f7b1be6", occurrenceID: 0 })
  console.log("monitroingData: ", monitoringData)
  socket.emit(IDEApiDest.IDEDo, { action: IDEApiActions.JumpToMonitoringClass, monitoringData: monitoringData })
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
    console.log(mesh.dataModel)
    return mesh.dataModel.id
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
