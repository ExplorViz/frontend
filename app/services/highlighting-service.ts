import { action } from '@ember/object';
import Service, { inject as service } from '@ember/service';
import CollaborationSession from 'collaboration/services/collaboration-session';
import LocalUser from 'collaboration/services/local-user';
import debugLogger from 'ember-debug-logger';
import ApplicationRenderer from 'explorviz-frontend/services/application-renderer';
import UserSettings from 'explorviz-frontend/services/user-settings';
import * as Highlighting from 'explorviz-frontend/utils/application-rendering/highlighting';
import { Trace } from 'explorviz-frontend/utils/landscape-schemes/dynamic/dynamic-data';
import { StructureLandscapeData } from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import ApplicationObject3D from 'explorviz-frontend/view-objects/3d/application/application-object-3d';
import ClazzCommunicationMesh from 'explorviz-frontend/view-objects/3d/application/clazz-communication-mesh';
import ClazzMesh from 'explorviz-frontend/view-objects/3d/application/clazz-mesh';
import ComponentMesh from 'explorviz-frontend/view-objects/3d/application/component-mesh';
import FoundationMesh from 'explorviz-frontend/view-objects/3d/application/foundation-mesh';
import {
  EntityMesh,
  isEntityMesh,
} from 'extended-reality/utils/vr-helpers/detail-info-composer';
import LinkRenderer from './link-renderer';
import MessageSender from 'collaboration/services/message-sender';

type HighlightOptions = { sendMessage?: boolean; remoteColor?: THREE.Color };

export default class HighlightingService extends Service.extend({
  // anything which *must* be merged to prototype here
}) {
  @service('user-settings')
  private userSettings!: UserSettings;

  @service('local-user')
  private localUser!: LocalUser;

  @service('application-renderer')
  private applicationRenderer!: ApplicationRenderer;

  @service('message-sender')
  private sender!: MessageSender;

  @service('collaboration-session')
  collaborationSession!: CollaborationSession;

  @service('link-renderer')
  linkRenderer!: LinkRenderer;

  debug = debugLogger('HighlightingService');

  hoveredOnHighlightedMesh = false;

  get applyHighlightingOnHover() {
    return this.userSettings.applicationSettings.applyHighlightingOnHover.value;
  }

  get opacity() {
    return this.userSettings.applicationSettings.transparencyIntensity.value;
  }

  get highlightingColor() {
    if (this.collaborationSession.isOnline) {
      return this.localUser.color;
    } else {
      return this.userSettings.applicationColors.highlightedEntityColor;
    }
  }

  get highlightingColorStyle() {
    return `color:#${this.highlightingColor.getHexString()}`;
  }

  // BEGIN action functions (called from different template files and functions)

  @action
  updateHighlighting() {
    if (this.applyHighlightingOnHover && !this.hoveredOnHighlightedMesh) {
      this.turnLandscapeOpaque();
    } else {
      const { communicationMeshes, applications } = this.getParams();
      Highlighting.updateHighlighting(
        applications,
        communicationMeshes,
        this.opacity
      );
    }
  }

  @action
  highlightById(modelId: string, color?: THREE.Color, sendMessage = false) {
    const mesh = this.applicationRenderer.getMeshById(modelId);
    if (isEntityMesh(mesh)) {
      this.toggleHighlight(mesh, { sendMessage, remoteColor: color });
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

  // END action functions

  // BEGIN public functions

  toggleHighlight(mesh: EntityMesh, options?: HighlightOptions) {
    if (mesh.highlighted) {
      this.unhighlight(mesh, options);
    } else {
      this.highlight(mesh, options);
    }
  }

  highlight(mesh: EntityMesh, options?: HighlightOptions) {
    const { parent } = mesh;
    if (parent instanceof ApplicationObject3D) {
      // Includes app-internal communication
      this.handleHighlightForComponent(parent, mesh, true, options);
    } else if (mesh instanceof ClazzCommunicationMesh) {
      // Communication between applications
      this.handleHighlightForLink(mesh, true, options);
    }
    this.updateHighlighting();
  }

  unhighlight(mesh: EntityMesh, options?: HighlightOptions) {
    const { parent } = mesh;
    if (parent instanceof ApplicationObject3D) {
      this.handleHighlightForComponent(parent, mesh, false, options); // Includes app-internal communication
    } else if (mesh instanceof ClazzCommunicationMesh) {
      // Communication between applications
      this.handleHighlightForLink(mesh, false, options);
    }

    this.updateHighlighting();

    if (options?.sendMessage) {
      this.sender.sendHighlightingUpdate(
        '',
        this.getEntityType(mesh),
        mesh.getModelId(),
        mesh.highlighted,
        this.userSettings.applicationSettings.enableMultipleHighlighting.value
      );
    }
  }

  updateHighlightingOnHover(hoveredOnHighlightedMesh: boolean) {
    const hasStateChanged =
      this.hoveredOnHighlightedMesh !== hoveredOnHighlightedMesh;
    if (!this.applyHighlightingOnHover || !hasStateChanged) {
      return;
    }

    this.hoveredOnHighlightedMesh = hoveredOnHighlightedMesh;

    if (hoveredOnHighlightedMesh) {
      this.updateHighlighting();
    } else {
      this.turnLandscapeOpaque();
    }
  }

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

  resetColorsOfHighlightedEntities() {
    const { applications } = this.getParams();

    for (const applicationObject3D of applications) {
      const allMeshes = applicationObject3D.getAllMeshes();

      for (const baseMesh of allMeshes) {
        if (baseMesh.highlighted) {
          baseMesh.highlightingColor = this.highlightingColor;
          baseMesh.highlight();
        }
      }
    }

    this.linkRenderer.getAllLinks().forEach((externLink) => {
      if (externLink.highlighted) {
        externLink.highlightingColor = this.highlightingColor;
        externLink.highlight();
      }
    });
  }

  // END public functions

  private getParams(): {
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

  private handleHighlightForLink(
    mesh: ClazzCommunicationMesh,
    highlighted: boolean,
    options?: HighlightOptions
  ) {
    mesh.highlightingColor =
      options?.remoteColor ||
      this.userSettings.applicationColors.highlightedEntityColor;
    if (highlighted) {
      mesh.highlight();
    } else {
      mesh.unhighlight();
      if (
        !this.userSettings.applicationSettings.enableMultipleHighlighting.value
      ) {
        this.removeHighlightingForAllApplications(false);
      }
    }

    this.updateHighlighting();

    if (options?.sendMessage) {
      this.sender.sendHighlightingUpdate(
        '',
        this.getEntityType(mesh),
        mesh.getModelId(),
        mesh.highlighted,
        this.userSettings.applicationSettings.enableMultipleHighlighting.value
      );
    }
  }

  private handleHighlightForComponent(
    application: ApplicationObject3D,
    object: THREE.Object3D,
    highlighted: boolean,
    options?: HighlightOptions
  ) {
    if (Highlighting.isHighlightableMesh(object)) {
      this.setHightlightStatusForMesh(
        application,
        object,
        highlighted,
        options?.remoteColor
      );

      if (options?.sendMessage) {
        const appId = application.getModelId();
        const entityType = this.getEntityType(object);
        const entityId = object.getModelId();
        this.sender.sendHighlightingUpdate(
          appId,
          entityType,
          entityId,
          object.highlighted,
          this.userSettings.applicationSettings.enableMultipleHighlighting.value
        );
      }
    }
  }

  private turnLandscapeOpaque() {
    const { communicationMeshes, applications } = this.getParams();
    applications.forEach((applicationObject3D) => {
      applicationObject3D.turnOpaque();
    });
    communicationMeshes.forEach((link) => {
      link.turnOpaque();
    });
  }

  private setHightlightStatusForMesh(
    application: ApplicationObject3D,
    mesh: FoundationMesh | ComponentMesh | ClazzMesh | ClazzCommunicationMesh,
    highlighted: boolean,
    color?: THREE.Color
  ) {
    mesh.highlightingColor = color || this.highlightingColor;

    if (
      !this.userSettings.applicationSettings.enableMultipleHighlighting.value &&
      !highlighted
    ) {
      this.removeHighlightingForAllApplications(false);
    }

    Highlighting.setHightlightStatusForMesh(
      mesh.getModelId(),
      application,
      highlighted
    );
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
