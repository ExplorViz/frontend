import { inject as service } from '@ember/service';
import { setOwner } from '@ember/application';
import debugLogger from 'ember-debug-logger';
import IdeWebsocketFacade from 'explorviz-frontend/services/ide-websocket-facade';
import ApplicationRenderer from 'explorviz-frontend/services/application-renderer';
import ApplicationRepository from 'explorviz-frontend/services/repos/application-repository';
import IdeCrossCommunicationEvent from './ide-cross-communication-event';
import { IDEApiActions, OpenObject, getIdFromMesh, getVizData } from './shared';
import type {
  CommunicationLink,
  OrderTuple,
  VizDataRaw,
  IDEApiCall,
} from './shared';
import WorkerService from 'explorviz-frontend/services/worker-service';

// @ts-ignore value is set in listener function of websocket
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let vizDataOrderTupleGlobal: OrderTuple[] = [];
let foundationCommunicationLinksGlobal: CommunicationLink[] = [];

const log = debugLogger('ide-websocket');

export default class IdeCrossCommunication {
  @service('ide-websocket-facade')
  ideWebsocketFacade!: IdeWebsocketFacade;

  @service('application-renderer')
  applicationRenderer!: ApplicationRenderer;

  @service('repos/application-repository')
  applicationRepo!: ApplicationRepository;

  @service('worker-service')
  workerService!: WorkerService;

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
      this.refreshVizData.bind(this) // TODO: this might leak
    );

    this.setupCrossOriginListener();
  }

  private setupCrossOriginListener() {
    window.addEventListener(
      'message',
      async (event: IdeCrossCommunicationEvent) => {
        //if (event.origin !== "http://localhost:4200") return;

        const data = event.data;

        if (!data) {
          return;
        }

        // TODO: avoid work if window.parent === window

        const vizDataRaw: VizDataRaw = getVizData(
          this.applicationRenderer,
          this.applicationRepo,
          foundationCommunicationLinksGlobal
        );
        const remote = await this.workerService.getRemote();
        const vizDataOrderTuple = await remote.prepareVizDataForIDE(vizDataRaw);

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
              vizDataOrderTuple
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

  async jumpToLocation(object: THREE.Object3D<THREE.Event>): Promise<void> {
    const vizDataRaw: VizDataRaw = getVizData(
      this.applicationRenderer,
      this.applicationRepo,
      foundationCommunicationLinksGlobal
    );
    const remote = await this.workerService.getRemote();
    const vizDataOrderTuple = await remote.prepareVizDataForIDE(vizDataRaw);
    emitToBackend({
      action: IDEApiActions.JumpToLocation,
      data: vizDataOrderTuple,
      meshId: getIdFromMesh(object),
      fqn: '',
      occurrenceID: -1,
      foundationCommunicationLinks: foundationCommunicationLinksGlobal,
    });
  }

  async refreshVizData(cl: CommunicationLink[]): Promise<void> {
    performance.mark('cc:refreshVizData-start');
    foundationCommunicationLinksGlobal = cl;

    const vizDataRaw: VizDataRaw = getVizData(
      this.applicationRenderer,
      this.applicationRepo,
      foundationCommunicationLinksGlobal
    );
    const remote = await this.workerService.getRemote();
    const vizDataOrderTuple = await remote.prepareVizDataForIDE(vizDataRaw);

    log('Send new data to ide');
    emitToBackend({
      action: IDEApiActions.Refresh,
      data: vizDataOrderTuple,
      meshId: '',
      fqn: '',
      occurrenceID: -1,
      foundationCommunicationLinks: foundationCommunicationLinksGlobal,
    });
    performance.mark('cc:refreshVizData-end');
  }

  dispose() {
    log('Dispose Cross Communication');
  }
}

function emitToBackend(apiCall: IDEApiCall) {
  if (window.parent === window) {
    // TODO: ask akrause
    return;
  }
  window.parent.postMessage(apiCall, '*');
}
