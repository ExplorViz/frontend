import { action } from '@ember/object';
import Service, { inject as service } from '@ember/service';
import CollaborationSession from 'explorviz-frontend/services/collaboration/collaboration-session';
import LocalUser from 'explorviz-frontend/services/collaboration/local-user';
import MessageSender from 'explorviz-frontend/services/collaboration/message-sender';
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
import ToastHandlerService from './toast-handler';
import ChatService from './chat';
import {
  EntityMesh,
  isEntityMesh,
} from 'extended-reality/utils/vr-helpers/detail-info-composer';
import LinkRenderer from './link-renderer';
import {
  getAllAncestorComponents,
  openComponentsByList,
} from 'explorviz-frontend/utils/application-rendering/entity-manipulation';

type HighlightOptions = { sendMessage?: boolean; remoteColor?: THREE.Color };

export default class HighlightingService extends Service.extend({
  // anything which *must* be merged to prototype here
}) {
  @service('application-renderer')
  private applicationRenderer!: ApplicationRenderer;

  @service('collaboration/collaboration-session')
  private collaborationSession!: CollaborationSession;

  @service('link-renderer')
  private linkRenderer!: LinkRenderer;

  @service('collaboration/local-user')
  private localUser!: LocalUser;

  @service('collaboration/message-sender')
  private sender!: MessageSender;

  @service('user-settings')
  private userSettings!: UserSettings;

  @service('toast-handler')
  toastHandler!: ToastHandlerService;

  @service('chat')
  chatService!: ChatService;

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

  // #region action functions (called from different template files and functions)

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

  highlightById(modelId: string, color?: THREE.Color, sendMessage = false) {
    const mesh = this.applicationRenderer.getMeshById(modelId);
    if (isEntityMesh(mesh)) {
      this.highlight(mesh, { sendMessage, remoteColor: color });
    }
  }

  @action
  toggleHighlightById(
    modelId: string,
    color?: THREE.Color,
    sendMessage = false
  ) {
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

  // #endregion  action functions

  // #region public functions

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

  highlightReplay(userId: string, appId: string, entityId: string) {
    const user = this.collaborationSession.lookupRemoteUserById(userId);
    const userColor = user ? user.color : this.localUser.color;

    const application = this.applicationRenderer.getApplicationById(appId);
    if (!application) {
      // extern communication link
      const mesh = this.applicationRenderer.getMeshById(entityId);
      if (mesh instanceof ClazzCommunicationMesh) {
        // multi selected extern links?
        this.toggleHighlight(mesh, {
          sendMessage: false,
          remoteColor: userColor,
        });
      }
      return;
    }

    const mesh: any = application.getMeshById(entityId);
    mesh.replayBlinkEffect();
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
  }

  unhighlightById(modelId: string, color?: THREE.Color, sendMessage = true) {
    const mesh = this.applicationRenderer.getMeshById(modelId);
    if (isEntityMesh(mesh)) {
      this.unhighlight(mesh, { sendMessage, remoteColor: color });
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

  // #endregion public functions

  // #region private functions

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
    if (
      !this.userSettings.applicationSettings.enableMultipleHighlighting.value
    ) {
      this.removeHighlightingForAllApplications(false);
    }

    mesh.highlightingColor = options?.remoteColor || this.highlightingColor;
    if (highlighted) {
      mesh.highlight();
    } else {
      mesh.unhighlight();
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
      if (highlighted) {
        this.chatService.sendChatMessage(
          this.localUser.userId,
          `${this.localUser.userName}(${this.localUser.userId}) highlighted a link`,
          true,
          'highlight',
          ['', mesh.getModelId()]
        );
      }
    }
  }

  private handleHighlightForComponent(
    application: ApplicationObject3D,
    object: THREE.Object3D,
    highlighted: boolean,
    options?: HighlightOptions
  ) {
    if (!Highlighting.isHighlightableMesh(object)) {
      return;
    }

    // Open parent components when nested entity is highlighted
    if (
      highlighted &&
      (object instanceof ComponentMesh || object instanceof ClazzMesh)
    ) {
      const didOpenComponent = openComponentsByList(
        getAllAncestorComponents(object.dataModel),
        application
      );
      // Only update application if component state did change
      if (didOpenComponent) {
        this.applicationRenderer.updateApplicationObject3DAfterUpdate(
          application
        );
      }
    }

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
      if (highlighted) {
        this.chatService.sendChatMessage(
          this.localUser.userId,
          `${this.localUser.userName}(${this.localUser.userId}) highlighted ${object.dataModel.name}`,
          true,
          'highlight',
          [appId, entityId]
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
      !this.userSettings.applicationSettings.enableMultipleHighlighting.value
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

  // #endregion private functions
}

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    'highlighting-service': HighlightingService;
  }
}
