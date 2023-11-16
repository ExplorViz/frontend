import { action } from '@ember/object';
import Service, { inject as service } from '@ember/service';
import CollaborationSession from 'collaborative-mode/services/collaboration-session';
import LocalUser from 'collaborative-mode/services/local-user';
import debugLogger from 'ember-debug-logger';
import ApplicationRenderer from 'explorviz-frontend/services/application-renderer';
import Configuration from 'explorviz-frontend/services/configuration';
import UserSettings from 'explorviz-frontend/services/user-settings';
import * as Highlighting from 'explorviz-frontend/utils/application-rendering/highlighting';
import { Trace } from 'explorviz-frontend/utils/landscape-schemes/dynamic/dynamic-data';
import { StructureLandscapeData } from 'explorviz-frontend/utils/landscape-schemes/structure-data';
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

  get highlightingColor() {
    if (this.collaborationSession.isOnline) {
      return this.localUser.color;
    } else {
      return this.configuration.applicationColors.highlightedEntityColor;
    }
  }

  get highlightingColorStyle() {
    return `color:#${this.highlightingColor.getHexString()}`;
  }

  @action
  removeHighlightingForAllApplications(sendMessage: boolean) {
    const { communicationMeshes, applications } = this.getParams();

    // Remove highlighting from applications
    applications.forEach((applicationObject3D) => {
      Highlighting.removeAllHighlightingFor(applicationObject3D);
      applicationObject3D.classCommunicationSet.clear(); // very important to put it here and not in removeHighlightingLocally (otherwise asymmetric remove possible since removeeHighlightingLocally can get called in another way)
    });

    // Remove highlighting from communication between applications
    communicationMeshes.forEach((link) => {
      link.unhighlight();
    });

    if (sendMessage) {
      this.sender.sendAllHighlightsReset();
    }
  }

  @action
  updateHighlighting(value: number = this.opacity) {
    const { communicationMeshes, applications } = this.getParams();
    Highlighting.updateHighlighting(applications, communicationMeshes, value);
  }

  getParams(): {
    communicationMeshes: ClazzCommunicationMesh[];
    applications: ApplicationObject3D[];
  } {
    const communicationMeshes = this.linkRenderer.getLinks();

    const applications = this.applicationRenderer.getOpenApplications();
    applications.forEach((applicationObject3D: ApplicationObject3D) => {
      communicationMeshes.push(...applicationObject3D.getCommMeshes());
    });

    return {
      communicationMeshes: communicationMeshes,
      applications: applications,
    };
  }

  @action
  highlightById(modelId: string, color?: THREE.Color, sendMessage = false) {
    const mesh = this.applicationRenderer.getMeshById(modelId);
    if (isEntityMesh(mesh)) {
      this.highlight(mesh, sendMessage, color);
    }
  }

  @action
  markAsAddedById(modelId: string){
    const mesh = this.applicationRenderer.getMeshById(modelId);
    if (isEntityMesh(mesh)) {
      this.markAsAdded(mesh);
    }
  }

  @action
  markAsDeletedById(modelId: string){
    const mesh = this.applicationRenderer.getMeshById(modelId);
    if (isEntityMesh(mesh)) {
      this.markAsDeleted(mesh);
    }
  }

  @action
  markAsModifiedById(modelId: string){
    const mesh = this.applicationRenderer.getMeshById(modelId);
    if (isEntityMesh(mesh)) {
      this.markAsModified(mesh);
    }
  }

  @action
  markAsMissingdById(modelId: string){
    const mesh = this.applicationRenderer.getMeshById(modelId);
    if (isEntityMesh(mesh)) {
      this.markAsMissing(mesh);
    }
  }

  @action
  markAsAdded(mesh: EntityMesh){
    mesh.changeTexture("../images/plus.png");
  }

  @action
  markAsDeleted(mesh: EntityMesh){
    mesh.changeTexture("../images/minus.png");
  }

  @action
  markAsModified(mesh: EntityMesh){
    mesh.changeTexture("../images/hashtag.png");
  }

  @action
  markAsMissing(mesh: EntityMesh){
    mesh.changeTexture("../images/x.png");
  }


  @action
  highlight(mesh: EntityMesh, sendMessage: boolean, remoteColor?: THREE.Color) {
    const color = remoteColor || this.highlightingColor;
    const { parent } = mesh;
    if (parent instanceof ApplicationObject3D) {
      this.highlightComponent(parent, mesh, sendMessage, color); // Includes app-internal communication
    } else if (mesh instanceof ClazzCommunicationMesh) {
      this.highlightLink(mesh, sendMessage, color); // Communication between applications
    }
  }

  @action
  highlightLink(
    mesh: ClazzCommunicationMesh,
    sendMessage: boolean,
    color?: THREE.Color
  ) {
    mesh.highlightingColor =
      color || this.configuration.applicationColors.highlightedEntityColor;
    if (mesh.highlighted) {
      mesh.unhighlight();
      if (
        !this.userSettings.applicationSettings.enableMultipleHighlighting.value
      ) {
        this.removeHighlightingForAllApplications(false);
      }
    } else {
      mesh.highlight();
    }

    this.updateHighlighting();

    if (sendMessage) {
      this.sender.sendHighlightingUpdate(
        '',
        this.getEntityType(mesh),
        mesh.getModelId(),
        mesh.highlighted,
        this.configuration.userSettings.applicationSettings
          .enableMultipleHighlighting.value
      );
    }
  }

  @action
  highlightTrace(
    trace: Trace,
    traceStep: string,
    applicationObject3D: ApplicationObject3D,
    structureData: StructureLandscapeData
  ) {
    const classCommunications =
      this.applicationRenderer.getClassCommunications(applicationObject3D);

    this.applicationRenderer.openAllComponents(applicationObject3D);
    Highlighting.highlightTrace(
      trace,
      traceStep,
      applicationObject3D,
      classCommunications,
      structureData,
      this.opacity
    );
  }

  highlightComponent(
    application: ApplicationObject3D,
    object: THREE.Object3D,
    sendMessage: boolean,
    color?: THREE.Color
  ) {
    if (Highlighting.isHighlightableMesh(object)) {
      this.hightlightMesh(application, object, color);

      const appId = application.getModelId();
      const entityType = this.getEntityType(object);
      const entityId = object.getModelId();

      if (sendMessage) {
        this.sender.sendHighlightingUpdate(
          appId,
          entityType,
          entityId,
          object.highlighted,
          this.configuration.userSettings.applicationSettings
            .enableMultipleHighlighting.value
        );
      }
    }
  }

  private hightlightMesh(
    application: ApplicationObject3D,
    mesh: FoundationMesh | ComponentMesh | ClazzMesh | ClazzCommunicationMesh,
    color?: THREE.Color
  ) {
    application.setHighlightingColor(
      color || this.configuration.applicationColors.highlightedEntityColor
    );

    if (
      !this.userSettings.applicationSettings.enableMultipleHighlighting.value &&
      !mesh.highlighted
    ) {
      this.removeHighlightingForAllApplications(false);
    }

    Highlighting.highlight(mesh.getModelId(), application);
  }

  private getEntityType(mesh: Highlighting.HighlightableMesh): string {
    return mesh.constructor.name;
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    'highlighting-service': HighlightingService;
  }
}
