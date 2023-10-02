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
import AggregatedClassCommunication from 'explorviz-frontend/utils/landscape-schemes/dynamic/aggregated-class-communication';

export type HightlightComponentArgs = {
  entityType: string;
  entityId: string;
  color?: THREE.Color;
};

type HighlightableMesh =
  | FoundationMesh
  | ComponentMesh
  | ClazzMesh
  | ClazzCommunicationMesh;

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
    this.updateHighlighting(this.opacity); // one call is all we need (see implementation)
  }

  @action
  removeHighlightingForAllApplications(sendMessage: boolean) {
    const { communicationMeshes, applications } = this.getParams();

    // Remove highlighting from applications
    applications.forEach((applicationObject3D) => {
      this.removeHighlightingLocally(applicationObject3D);
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
  highlightModel(
    entity: Package | Class | AggregatedClassCommunication,
    applicationId: string
  ) {
    const application =
      this.applicationRenderer.getApplicationById(applicationId);
    if (application) {
      Highlighting.highlightModel(entity, application);
    }
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
  }

  @action
  highlightLink(mesh: ClazzCommunicationMesh, color?: THREE.Color) {
    mesh.highlightingColor =
      color || this.configuration.applicationColors.highlightedEntityColor;

    // Toggle highlighting
    if (mesh.highlighted) {
      this.removeHighlightingForAllApplications(false);
      return;
    }

    if (
      !this.userSettings.applicationSettings.enableMultipleHighlighting.value
    ) {
      this.removeHighlightingForAllApplications(false);
    }

    mesh.highlight();
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
    if (isHighlightableMesh(object)) {
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
    mesh: FoundationMesh | ComponentMesh | ClazzMesh | ClazzCommunicationMesh,
    color?: THREE.Color
  ) {
    application.setHighlightingColor(
      color || this.configuration.applicationColors.highlightedEntityColor
    );

    if (mesh.highlighted) {
      this.removeHighlightingForAllApplications(false);
      return;
    }

    if (
      !this.userSettings.applicationSettings.enableMultipleHighlighting.value
    ) {
      this.removeHighlightingForAllApplications(false);
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
