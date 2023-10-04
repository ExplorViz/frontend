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
  removeHighlightingForAllApplications(sendMessage: boolean) {
    const { communicationMeshes, applications } = this.getParams();

    // Remove highlighting from applications
    applications.forEach((applicationObject3D) => {
      Highlighting.removeAllHighlightingFor(applicationObject3D);
      applicationObject3D.aggregatedClassCommSet.clear(); // very important to put it here and not in removeHighlightingLocally (otherwise asymmetric remove possible since removeeHighlightingLocally can get called in another way)
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
  highlightById(modelId: string, color?: THREE.Color) {
    const mesh = this.applicationRenderer.getMeshById(modelId);
    if (isEntityMesh(mesh)) {
      this.highlight(mesh, true, color);
    }
  }

  @action
  highlight(mesh: EntityMesh, sendMessage: boolean, color?: THREE.Color) {
    const { parent } = mesh;
    if (parent instanceof ApplicationObject3D) {
      this.highlightComponent(parent, mesh, sendMessage, color); // Includes app-internal communication
    } else if (mesh instanceof ClazzCommunicationMesh) {
      this.highlightLink(mesh, true, color); // Communication between applications
    }
  }

  @action
  highlightLink(
    mesh: ClazzCommunicationMesh,
    sendMessage: boolean,
    color?: THREE.Color
  ) {
    if (
      !this.userSettings.applicationSettings.enableMultipleHighlighting.value
    ) {
      this.removeHighlightingForAllApplications(false);
    }

    mesh.highlightingColor =
      color || this.configuration.applicationColors.highlightedEntityColor;
    if (mesh.highlighted) {
      mesh.unhighlight();
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
    const aggregatedClassCommunications =
      this.applicationRenderer.getAggregatedClassCommunications(
        applicationObject3D
      );

    this.applicationRenderer.openAllComponents(applicationObject3D);
    Highlighting.highlightTrace(
      trace,
      traceStep,
      applicationObject3D,
      aggregatedClassCommunications,
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

  hightlightComponentLocallyByTypeAndId(
    application: ApplicationObject3D,
    { entityId, color }: Highlighting.HightlightComponentArgs
  ) {
    const mesh = application.getMeshById(entityId);
    if (mesh && Highlighting.isHighlightableMesh(mesh)) {
      this.hightlightMesh(application, mesh, color);
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
      !this.userSettings.applicationSettings.enableMultipleHighlighting.value
    ) {
      this.removeHighlightingForAllApplications(false);
    } else if (
      application.highlightedEntity instanceof Set &&
      application.highlightedEntity.has(mesh.dataModel.id)
    ) {
      application.highlightedEntity.delete(mesh.dataModel.id);
      mesh.unhighlight();
      return;
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
