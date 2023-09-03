import { inject as service } from '@ember/service';
import { setOwner } from '@ember/application';
import debugLogger from 'ember-debug-logger';
import IdeWebsocketFacade from 'explorviz-frontend/services/ide-websocket-facade';
import ApplicationRenderer from 'explorviz-frontend/services/application-renderer';
import ApplicationRepository from 'explorviz-frontend/services/repos/application-repository';
import IdeCrossCommunicationEvent from './ide-cross-communication-event';
import {
  IDEApiActions,
  OpenObject,
  VizDataToOrderTuple,
  getIdFromMesh,
} from './shared';
import type {
  CommunicationLink,
  OrderTuple,
  VizDataRaw,
  IDEApiCall,
} from './shared';

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
      (event: IdeCrossCommunicationEvent) => {
        //if (event.origin !== "http://localhost:4200") return;

        const data = event.data;

        if (!data) {
          return;
        }

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
    const openApplications = this.applicationRenderer.getOpenApplications();
    const communicationLinks: CommunicationLink[] =
      foundationCommunicationLinks;
    openApplications.forEach((element) => {
      const application = element;

      const applicationData = this.applicationRepo.getById(
        application.getModelId()
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
    performance.mark('refreshVizData-start');
    foundationCommunicationLinksGlobal = cl;

    const vizDataRaw: VizDataRaw = this.getVizData(
      foundationCommunicationLinksGlobal
    );
    const vizDataOrderTuple: OrderTuple[] = VizDataToOrderTuple(vizDataRaw);

    log('Send new data to ide');
    emitToBackend({
      action: IDEApiActions.Refresh,
      data: vizDataOrderTuple,
      meshId: '',
      fqn: '',
      occurrenceID: -1,
      foundationCommunicationLinks: foundationCommunicationLinksGlobal,
    });
    performance.mark('refreshVizData-end');
  }

  dispose() {
    log('Dispose Cross Communication');
  }
}

export function emitToBackend(apiCall: IDEApiCall) {
  window.parent.postMessage(apiCall, '*');
}
