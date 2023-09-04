import { inject as service } from '@ember/service';
import ENV from 'explorviz-frontend/config/environment';
import { Socket, io } from 'socket.io-client';
import Auth from 'explorviz-frontend/services/auth';
import { setOwner } from '@ember/application';
import debugLogger from 'ember-debug-logger';
import IdeWebsocketFacade from 'explorviz-frontend/services/ide-websocket-facade';
import ApplicationRenderer from 'explorviz-frontend/services/application-renderer';
import ApplicationRepository from 'explorviz-frontend/services/repos/application-repository';
import { DefaultEventsMap } from '@socket.io/component-emitter';
import AlertifyHandler from 'explorviz-frontend/utils/alertify-handler';
import {
  IDEApiActions,
  IDEApiDest,
  OpenObject,
  VizDataToOrderTuple,
  getIdFromMesh,
  getVizData,
} from './shared';
import type {
  CommunicationLink,
  OrderTuple,
  VizDataRaw,
  IDEApiCall,
  MonitoringData,
} from './shared';

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

    socket!.on('vizDo', (data: IDEApiCall) => {
      const vizDataRaw: VizDataRaw = getVizData(
        this.applicationRenderer,
        this.applicationRepo,
        foundationCommunicationLinksGlobal
      );
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

        default:
          break;
      }
    });
  }

  jumpToLocation(object: THREE.Object3D<THREE.Event>) {
    if (!socket || (socket && socket.disconnected)) {
      return;
    }

    const vizDataRaw: VizDataRaw = getVizData(
      this.applicationRenderer,
      this.applicationRepo,
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
    performance.mark('ws:refreshVizData-start');
    if (!socket || (socket && socket.disconnected)) {
      performance.mark('ws:refreshVizData-end');
      return;
    }

    foundationCommunicationLinksGlobal = cl;

    const vizDataRaw: VizDataRaw = getVizData(
      this.applicationRenderer,
      this.applicationRepo,
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
    performance.mark('ws:refreshVizData-end');
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
