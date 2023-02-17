import Service from '@ember/service';
import Evented from '@ember/object/evented';

import { io } from 'socket.io-client';

import ApplicationObject3D from 'explorviz-frontend/view-objects/3d/application/application-object-3d';

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

let httpSocket = 'http://localhost:3000';
// let httpSocket = ""
let socket = io(httpSocket);
let vizDataGlobal: OrderTuple[] = [];

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

type IDEApiCall = {
  action: IDEApiActions;
  data: OrderTuple[];
  meshId: string;
  occurrenceID: number;
  fqn: string;
};

type ParentOrder = {
  fqn: string;
  meshid: string;
  childs: ParentOrder[];
};

type OrderTuple = {
  hierarchyModel: ParentOrder;
  meshes: { meshNames: string[]; meshIds: string[] };
};

export default class IDEApi extends Service.extend(Evented) {
  constructor(
    handleSingleClickOnMesh: (mesh: THREE.Object3D) => void,
    handleDoubleClickOnMesh: (mesh: THREE.Object3D) => void,
    lookAtMesh: (mesh: THREE.Object3D) => void,
    getVizData: () => ApplicationObject3D[]
  ) {
    super();

    socket.on('vizDo', (data: IDEApiCall) => {
      let vizData: OrderTuple[] = [];
      // console.log("vizdo")
      getVizData().forEach((element) => {
        let temp = Open3dObjectsHelper(element);
        vizData.push(temp);
        // console.log(temp)
      });
      vizDataGlobal = vizData;
      socket.on('connect_error', (err) => {
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
            getVizData()
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
            data: vizData,
            meshId: '',
            fqn: '',
            occurrenceID: -1,
          });
          break;
        default:
          break;
      }
    });

    this.on('jumpToLocation', (object: THREE.Object3D<THREE.Event>) => {
      let vizData: OrderTuple[] = [];
      getVizData().forEach((element) => {
        let temp = Open3dObjectsHelper(element);
        vizData.push(temp);
      });
      // console.log(getApplicationObject3D())

      console.log('mesjhid', getIdFromMesh(object));

      emitToBackend(IDEApiDest.IDEDo, {
        action: IDEApiActions.JumpToLocation,
        data: vizData,
        meshId: getIdFromMesh(object),
        fqn: '',
        occurrenceID: -1,
      });
      // emitToBackend(IDEApiDest.IDEDo, { action: IDEApiActions.JumpToLocation, data: [], meshId: "fde04de43a0b4da545d3df022ce824591fe61705835ca96b80f5dfa39f7b1be6", fqn: "", occurrenceID: -1 })
    });

    this.on('applicationData', (appl: ApplicationObject3D[]) => {
      console.log(appl);
    });

    this.on('test2', () => {
      let vizData: OrderTuple[] = [];
      getVizData().forEach((element) => {
        let temp = Open3dObjectsHelper(element);
        vizData.push(temp);
        console.log(temp);
      });

      emitToBackend(IDEApiDest.IDEDo, {
        action: IDEApiActions.GetVizData,
        data: vizData,
        meshId: '',
        fqn: '',
        occurrenceID: -1,
      });
      console.log(vizData);
      // OpenObject(handleDoubleClickOnMesh, "samples")

      // console.log(Open3dObjectsHelper(getApplicationObject3D()[0]))
      console.log('_____TEST2______');
    });
  }
}

function getOrderedParents(dataModel: Application): ParentOrder {
  let result: ParentOrder = {
    fqn: dataModel.name,
    childs: [],
    meshid: dataModel.id,
  };
  let temp: ParentOrder[] = [];
  dataModel.packages.forEach((element) => {
    let fqn = dataModel.name + '.' + element.name;
    temp.push({
      fqn: fqn,
      childs: parentPackage(fqn, element.subPackages, element.classes),
      meshid: element.id,
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
  let temp: ParentOrder[] = [];

  if (subpackages.length === 0) {
    return parentClass(fqn, classes);
  }
  subpackages.forEach((element) => {
    let newFqn = fqn + '.' + element.name;
    temp.push({
      fqn: newFqn,
      childs: parentPackage(newFqn, element.subPackages, element.classes),
      meshid: element.id,
    });
  });

  return temp;
}

function parentClass(fqn: string, classes: Class[]): ParentOrder[] {
  let temp: ParentOrder[] = [];
  // console.log(classes)
  if (classes.length === 0) {
    return temp;
  }
  classes.forEach((element) => {
    let newFqn = fqn + '.' + element.name;
    // temp.push({ name: element.name, childs: element.methods })
    temp.push({ fqn: newFqn, childs: [], meshid: element.id });
  });

  return temp;
}

function getFqnForMeshes(orderedParents: ParentOrder): {
  meshNames: string[];
  meshIds: string[];
} {
  let meshName: string = orderedParents.fqn;
  let meshId: string = orderedParents.meshid;

  let meshTemp = { meshNames: [meshName], meshIds: [meshId] };

  orderedParents.childs.forEach((element) => {
    meshTemp.meshNames = meshTemp.meshNames.concat(
      getFqnForMeshes(element).meshNames
    );
    meshTemp.meshIds = meshTemp.meshIds.concat(
      getFqnForMeshes(element).meshIds
    );
  });

  return meshTemp;
}
function Open3dObjectsHelper(applObj3D: ApplicationObject3D): OrderTuple {
  let childs = applObj3D.children;

  let orderedParents = getOrderedParents(applObj3D.dataModel);
  let meshNames = getFqnForMeshes(orderedParents);

  return { hierarchyModel: orderedParents, meshes: meshNames };
}

function OpenObject(
  doSomethingOnMesh: (mesh: THREE.Object3D) => void,
  fullQualifiedName: string,
  occurrenceID: number,
  lookAtMesh: (mesh: THREE.Object3D) => void,
  appli3DObj: ApplicationObject3D[]
) {
  appli3DObj.forEach((element) => {
    let orderTuple = Open3dObjectsHelper(element);
    resetFoundation(doSomethingOnMesh, element, orderTuple);
    let occurrenceName = occurrenceID == -1 ? '.' : '.' + occurrenceID + '.';
    console.log(
      element.dataModel.name + occurrenceName + fullQualifiedName,
      orderTuple,
      element
    );
    recursivelyOpenObjects(
      doSomethingOnMesh,
      lookAtMesh,
      element.dataModel.name + occurrenceName + fullQualifiedName,
      orderTuple,
      element
    );
  });
}
function resetFoundation(
  doSomethingOnMesh: (mesh: THREE.Object3D) => void,
  appli3DObj: ApplicationObject3D,
  orderTuple: OrderTuple
) {
  let mesh =
    appli3DObj.children[
      orderTuple.meshes.meshNames.indexOf(orderTuple.hierarchyModel.fqn)
    ];
  console.log(appli3DObj);
  doSomethingOnMesh(mesh);
}

function recursivelyOpenObjects(
  doSomethingOnMesh: (mesh: THREE.Object3D) => void,
  lookAtMesh: (mesh: THREE.Object3D) => void,
  toOpen: string,
  orderTuple: OrderTuple,
  appli3DObj: ApplicationObject3D
) {
  if (orderTuple.meshes.meshNames.indexOf(toOpen) === -1) {
    console.error(toOpen, ' mesh not Found');
  }
  // else if (orderTuple.hierarchyModel.name === toOpen) {
  //   doSomethingOnMesh(appli3DObj.children[orderTuple.meshNames.indexOf(toOpen)])
  // }
  // else if(orderTuple.hierarchyModel.childs.length === 0) {

  // }
  else {
    orderTuple.hierarchyModel.childs.forEach((element) => {
      let tempOrder: ParentOrder = {
        fqn: element.fqn,
        childs: element.childs,
        meshid: element.meshid,
      };
      if (isInParentOrder(element, toOpen)) {
        console.log('DoSome:', element);
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

function isInParentOrder(po: ParentOrder, name: string) {
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
        { fqn: element.fqn, childs: element.childs, meshid: element.meshid },
        name
      );
  });

  return tempBool;
}
export function emitToBackend(dest: IDEApiDest, apiCall: IDEApiCall) {
  // console.log(dest, apiCall, socket)
  socket.emit(dest, apiCall);
}

export function refreshVizData(action: IDEApiActions) {
  socket.emit(action);
}

export function monitoringMockup() {
  // emitToBackend(IDEApiDest.VizDo, { action: IDEApiActions.DoubleClickOnMesh, fqn: "org.springframework.samples.petclinic.model.Person", data: vizDataGlobal, meshId: "fde04de43a0b4da545d3df022ce824591fe61705835ca96b80f5dfa39f7b1be6", occurrenceID: 0 })
  emitToBackend(IDEApiDest.IDEDo, {
    action: IDEApiActions.JumpToLocation,
    data: vizDataGlobal,
    meshId: 'fde04de43a0b4da545d3df022ce824591fe61705835ca96b80f5dfa39f7b1be6',
    fqn: '',
    occurrenceID: -1,
  });
}

function getIdFromMesh(mesh: Object3D<Event>): string {
  if (mesh instanceof FoundationMesh) {
    return mesh.dataModel.id;
  } else if (mesh instanceof ComponentMesh) {
    return mesh.dataModel.id;
  } else if (mesh instanceof ClazzMesh) {
    return mesh.dataModel.id;
  } else if (mesh instanceof ClazzCommunicationMesh) {
    console.error(typeof mesh, ' --- Mesh Type not Supported!');
    return 'Not implemented';
  } else if (mesh instanceof CommunicationArrowMesh) {
    console.error(typeof mesh, ' --- Mesh Type not Supported!');
    return 'Not implemented';
  } else {
    //ClazzCommunicationMesh
    console.error(typeof mesh, ' --- Mesh Type not Supported!');
    return 'Not implemented';
  }
}
