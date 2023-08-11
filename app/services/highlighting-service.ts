import { action } from '@ember/object';
import Service, { inject as service } from '@ember/service';
import CollaborationSession from 'collaborative-mode/services/collaboration-session';
import LocalUser from 'collaborative-mode/services/local-user';
import debugLogger from 'ember-debug-logger';
import ApplicationRenderer from 'explorviz-frontend/services/application-renderer';
import Configuration from 'explorviz-frontend/services/configuration';
import UserSettings from 'explorviz-frontend/services/user-settings';
import * as Highlighting from 'explorviz-frontend/utils/application-rendering/highlighting';
import { Trace, isTrace } from 'explorviz-frontend/utils/landscape-schemes/dynamic-data';
import {
  Class,
  Package,
  StructureLandscapeData,
} from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import ApplicationObject3D from 'explorviz-frontend/view-objects/3d/application/application-object-3d';
import ClazzCommunicationMesh from 'explorviz-frontend/view-objects/3d/application/clazz-communication-mesh';
import ClazzMesh from 'explorviz-frontend/view-objects/3d/application/clazz-mesh';
import ComponentMesh from 'explorviz-frontend/view-objects/3d/application/component-mesh';
import FoundationMesh from 'explorviz-frontend/view-objects/3d/application/foundation-mesh';
import VrMessageSender from 'virtual-reality/services/vr-message-sender';
import {
  EntityMesh,
  isEntityMesh,
} from 'virtual-reality/utils/vr-helpers/detail-info-composer';
import LinkRenderer from './link-renderer';
import { DrawableClassCommunication } from 'explorviz-frontend/utils/application-rendering/class-communication-computer';
import { send } from 'process';

export type HightlightComponentArgs = {
  entityType: string;
  entityId: string;
  color?: THREE.Color;
};

type HighlightableMesh = ComponentMesh | ClazzMesh | ClazzCommunicationMesh;

export function isHighlightableMesh(
  object: THREE.Object3D
): object is HighlightableMesh {
  return (
    object instanceof ComponentMesh ||
    object instanceof ClazzMesh ||
    object instanceof ClazzCommunicationMesh ||
    object instanceof FoundationMesh
  );
}

export function serializeHighlightedComponent(
  applicationObject3D: ApplicationObject3D,
  object: any
) {
  if (isHighlightableMesh(object)) {
    return {
      appId: applicationObject3D.getModelId(),
      entityType: object.constructor.name,
      entityId: object.getModelId(),
    };
  }
  return null;
}

export default class HighlightingService extends Service.extend({
  // anything which *must* be merged to prototype here
}) {
  @service('configuration')
  private configuration!: Configuration;

  @service('user-settings')
  private userSettings!: UserSettings;

  @service('local-user')
  private localUser!: LocalUser;

  @service('application-renderer')
  private applicationRenderer!: ApplicationRenderer;

  @service('vr-message-sender')
  private sender!: VrMessageSender;

  @service('collaboration-session')
  collaborationSession!: CollaborationSession;

  @service('link-renderer')
  linkRenderer!: LinkRenderer;

  debug = debugLogger('HighlightingService');

  get opacity() {
    return this.userSettings.applicationSettings.transparencyIntensity.value;
  }

  get highlightingColorStyle() {
    let hexColor = '';
    if (this.collaborationSession.isOnline && this.localUser.color) {
      hexColor = this.localUser.color.getHexString();
    } else {
      hexColor =
        this.configuration.applicationColors.highlightedEntityColor.getHexString();
    }

    return `color:#${hexColor}`;
  }


  @action
  updateHighlightingForAllApplications() {
    this.updateHighlighting(true, this.opacity); // one call is all we need (see implementation)
  }

  @action
  removeHighlightingForAllApplications() {
    this.applicationRenderer
      .getOpenApplications()
      .forEach((applicationObject3D) => {
        this.removeHighlightingLocally(applicationObject3D);
        applicationObject3D.drawableClassCommSet.clear(); // very important to put it here and not in removeHighlightingLocally (otherwise asymmetric remove possible since removeeHighlightingLocally can get called in another way)

      });
  }

  // removeHighlightingsOfUser(userId : string){

  //   const apps = this.applicationRenderer.getOpenApplications();
  //   apps.forEach(app => {
  //     const meshes = app.getAllMeshes();
  //     Array.from(meshes).forEach(mesh => {
  //       mesh
  //     });
  //   });
  // }

  updateHighlighting(
    sendMessage: boolean,
    value: number = this.opacity
  ) {

    console.log("updateHIghlighting");
    const {allLinks, drawableComm, applications} = this.getParams();

    
    const transparencyMap = Highlighting.updateHighlighting(
        applications,
        drawableComm,
        allLinks,
        value,
    );

    if(sendMessage){ // we don't send messages when updateHighlighting is called due to a receiving landscape update message (highlighting or opening/closing components)
      Array.from(transparencyMap.keys()).forEach(appId => {
        const transparencyList = transparencyMap.get(appId);
        if(transparencyList)
          this.sender.sendTransparencyUpdate(appId,transparencyList);
      });
    }


    
  }


  getParams(): {allLinks: ClazzCommunicationMesh[], drawableComm: DrawableClassCommunication[], applications: ApplicationObject3D[]}{
    const allLinks = this.linkRenderer.getAllLinks();
    const applications = this.applicationRenderer.getOpenApplications();
    applications.forEach((applicationObject3D : ApplicationObject3D) => {
      const drawableComm2 = this.applicationRenderer.getDrawableClassCommunications(applicationObject3D);
      if(drawableComm2){
        drawableComm2.forEach((drawableClassCommunication : DrawableClassCommunication) => {
          const link = this.applicationRenderer.getMeshById(drawableClassCommunication.id);
          if(link){ // communication link between to clazzes from the same application. The link only exist if the clazzes are "opened"/visible at call time
            allLinks.push(link as ClazzCommunicationMesh);
          }
        });
      }
    });

    let drawableComm : DrawableClassCommunication[] = [];
    allLinks.forEach((link) => {
      const linkCommunications = link.dataModel.drawableClassCommus;
      drawableComm = [...drawableComm, ...linkCommunications];
    });

    return {allLinks: allLinks, drawableComm: drawableComm, applications: applications};
  }




  @action
  highlightModel(
    entity: Package | Class | DrawableClassCommunication,
    applicationObject3D: ApplicationObject3D
  ) {
    Highlighting.highlightModel(
      entity,
      applicationObject3D,
    );
  }

  @action
  highlightById(meshId: string, color?: THREE.Color) {
    const mesh = this.applicationRenderer.getMeshById(meshId);
    if (isEntityMesh(mesh)) {
      this.highlight(mesh, true, color);
    }
  }

  @action
  highlight(mesh: EntityMesh, sendMessage: boolean, color?: THREE.Color) {
    const { parent } = mesh;
    if (parent instanceof ApplicationObject3D) {
      this.highlightComponent(parent, mesh, sendMessage, color); // notice that intern communication lines get highlighted here
    } else if (mesh instanceof ClazzCommunicationMesh) {
      this.highlightLink(mesh, color); // extern communication lines get highlighted here
      this.updateHighlighting(sendMessage);
      
      if(sendMessage){
        this.sender.sendHighlightingUpdate(
          '',
          this.getEntityType(mesh),
          mesh.getModelId(),
          mesh.highlighted
        );
      }
    }
  }

  @action
  highlightLink(mesh: ClazzCommunicationMesh, color?: THREE.Color) {
    mesh.highlightingColor =
    color || this.configuration.applicationColors.highlightedEntityColor

      mesh.dataModel.drawableClassCommus.forEach(drawableClassComm => {

        const sourceApp =  drawableClassComm.sourceApp;
        const targetApp = drawableClassComm.targetApp;

        if(sourceApp && targetApp){
          const sourceApplicationObject = this.applicationRenderer.getApplicationById(sourceApp.id);
          const targetApplicationObject = this.applicationRenderer.getApplicationById(targetApp.id);

          if(sourceApplicationObject && targetApplicationObject){
            Highlighting.highlightExternCommunicationLine(drawableClassComm, sourceApplicationObject, targetApplicationObject);
          }

        }
      });
  }

  @action
  highlightTrace(
    trace: Trace,
    traceStep: string,
    applicationObject3D: ApplicationObject3D,
    structureData: StructureLandscapeData
  ) {
    const drawableClassCommunications =
      this.applicationRenderer.getDrawableClassCommunications(applicationObject3D);

    this.applicationRenderer.openAllComponents(applicationObject3D);
    if (drawableClassCommunications) {
      Highlighting.highlightTrace(
        trace,
        traceStep,
        applicationObject3D,
        drawableClassCommunications!,
        structureData,
        this.opacity
      );
    }
  }

  highlightComponent(application: ApplicationObject3D, object: THREE.Object3D, sendMessage: boolean,color?: THREE.Color) {
    if (isHighlightableMesh(object)) {
      this.hightlightMesh(application, object, color);

      const appId = application.getModelId();
      const entityType = this.getEntityType(object);
      const entityId = object.getModelId();

      if(sendMessage){
        this.sender.sendHighlightingUpdate(
          appId,
          entityType,
          entityId,
          object.highlighted
        );
      }
    }
  }

  removeHighlightingLocally(application: ApplicationObject3D) {
    Highlighting.removeAllHighlighting(application);
  }

  hightlightComponentLocallyByTypeAndId(
    application: ApplicationObject3D,
    { entityId, color }: HightlightComponentArgs
  ) { 
    const mesh = application.getMeshById(entityId);
    if (mesh && isHighlightableMesh(mesh)) {
      this.hightlightMesh(application, mesh, color);
    }
  }

  private hightlightMesh(
    application: ApplicationObject3D,
    mesh: ComponentMesh | ClazzMesh | ClazzCommunicationMesh,
    color?: THREE.Color,
  ) {
    application.setHighlightingColor(
      color || this.configuration.applicationColors.highlightedEntityColor
    );

    if(this.userSettings.applicationSettings.allowMultipleSelection.value && mesh.highlighted){
      this.removeHighlightingLocally(application);
      return;
    }

    if(!this.userSettings.applicationSettings.allowMultipleSelection.value && !mesh.highlighted){
      this.removeHighlightingLocally(application);
      Highlighting.highlight(mesh.getModelId(), application);
      return;
    }

    Highlighting.highlight(mesh.getModelId(), application);

  }

  private getEntityType(mesh: HighlightableMesh): string {
    return mesh.constructor.name;
  }
}


// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    'highlighting-service': HighlightingService;
  }
}
