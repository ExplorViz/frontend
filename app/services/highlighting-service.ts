import { action } from '@ember/object';
import Service, { inject as service } from '@ember/service';
import CollaborationSession from 'collaborative-mode/services/collaboration-session';
import LocalUser from 'collaborative-mode/services/local-user';
import debugLogger from 'ember-debug-logger';
import ApplicationRenderer from 'explorviz-frontend/services/application-renderer';
import Configuration from 'explorviz-frontend/services/configuration';
import ApplicationRepository from 'explorviz-frontend/services/repos/application-repository';
import UserSettings from 'explorviz-frontend/services/user-settings';
import * as Highlighting from 'explorviz-frontend/utils/application-rendering/highlighting';
import { Trace } from 'explorviz-frontend/utils/landscape-schemes/dynamic-data';
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
import BaseMesh from 'explorviz-frontend/view-objects/3d/base-mesh';
import VrMessageSender from 'virtual-reality/services/vr-message-sender';
import {
  EntityMesh,
  isEntityMesh,
} from 'virtual-reality/utils/vr-helpers/detail-info-composer';
import LinkRenderer from './link-renderer';

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
      appId: applicationObject3D.dataModel.id,
      entityType: object.constructor.name,
      entityId: object.dataModel.id,
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

  @service('repos/application-repository')
  private applicationRepo!: ApplicationRepository;

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

  private getDrawableClassCommunications(
    applicationObjetc3D: ApplicationObject3D
  ) {
    const applicationData = this.applicationRepo.getById(
      applicationObjetc3D.dataModel.id
    );
    return applicationData?.drawableClassCommunications;
  }

  @action
  updateHighlightingForAllApplications() {
    this.applicationRenderer
      .getOpenApplications()
      .forEach((applicationObject3D) => {
        this.updateHighlighting(applicationObject3D, this.opacity);
      });
  }

  @action
  removeHighlightingForAllApplications() {
    this.applicationRenderer
      .getOpenApplications()
      .forEach((applicationObject3D) => {
        const mesh = applicationObject3D.highlightedEntity;
        if (mesh instanceof BaseMesh) {
          this.highlightComponent(applicationObject3D, mesh);
        }
      });
    this.linkRenderer.getAllLinks().forEach((link) => link.unhighlight());
  }

  updateHighlighting(
    applicationObject3D: ApplicationObject3D,
    value: number = this.opacity
  ) {
    const drawableClassCommunications =
      this.getDrawableClassCommunications(applicationObject3D);
    if (drawableClassCommunications) {
      Highlighting.updateHighlighting(
        applicationObject3D,
        drawableClassCommunications,
        value
      );
    }
  }

  @action
  highlightModel(
    entity: Package | Class,
    applicationObject3D: ApplicationObject3D
  ) {
    const drawableClassCommunications =
      this.getDrawableClassCommunications(applicationObject3D);
    if (drawableClassCommunications) {
      Highlighting.highlightModel(
        entity,
        applicationObject3D,
        drawableClassCommunications,
        this.opacity
      );
    }
  }

  @action
  highlightById(meshId: string) {
    const mesh = this.applicationRenderer.getMeshById(meshId);
    if (isEntityMesh(mesh)) {
      this.highlight(mesh);
    }
  }

  @action
  highlight(mesh: EntityMesh) {
    const { parent } = mesh;
    if (parent instanceof ApplicationObject3D) {
      this.highlightComponent(parent, mesh);
    } else if (mesh instanceof ClazzCommunicationMesh) {
      this.highlightLink(mesh, this.localUser.color);
      this.sender.sendHighlightingUpdate(
        '',
        this.getEntityType(mesh),
        mesh.dataModel.id,
        mesh.highlighted
      );
    }
  }

  @action
  highlightLink(mesh: ClazzCommunicationMesh, color?: THREE.Color) {
    mesh.highlightingColor =
      color || this.configuration.applicationColors.highlightedEntityColor;
    if (mesh.highlighted) {
      mesh.unhighlight();
    } else {
      this.linkRenderer.getAllLinks().forEach((link) => link.unhighlight());
      mesh.highlight();
    }
  }

  @action
  highlightTrace(
    trace: Trace,
    traceStep: string,
    applicationObject3D: ApplicationObject3D,
    structureData: StructureLandscapeData
  ) {
    const drawableClassCommunications =
      this.getDrawableClassCommunications(applicationObject3D);

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

  highlightComponent(application: ApplicationObject3D, object: THREE.Object3D) {
    if (isHighlightableMesh(object)) {
      this.hightlightMesh(application, object, this.localUser.color);

      const appId = application.dataModel.id;
      const entityType = this.getEntityType(object);
      const entityId = object.dataModel.id;
      this.sender.sendHighlightingUpdate(
        appId,
        entityType,
        entityId,
        object.highlighted
      );
    }
  }

  removeHighlightingLocally(application: ApplicationObject3D) {
    Highlighting.removeHighlighting(application);
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
    color?: THREE.Color
  ) {
    const drawableComm = this.getDrawableClassCommunications(application);
    if (drawableComm) {
      application.setHighlightingColor(
        color || this.configuration.applicationColors.highlightedEntityColor
      );
      Highlighting.highlight(mesh, application, drawableComm, this.opacity);
      this.linkRenderer.getAllLinks().forEach((link) => {
        const linkCommunication = link.dataModel.drawableClassCommus[0];
        const targetAppId = linkCommunication?.targetApp?.id;
        const sourceAppId = linkCommunication?.sourceApp?.id;
        const sourceClassId = linkCommunication?.sourceClass.id;
        const targetClassId = linkCommunication?.targetClass.id;
        if (
          mesh.highlighted &&
          ((sourceAppId === application.dataModel.id &&
            sourceClassId !== mesh.dataModel.id) ||
            (targetAppId === application.dataModel.id &&
              targetClassId !== mesh.dataModel.id))
        ) {
          link.turnTransparent();
        } else if (
          sourceAppId === application.dataModel.id ||
          targetAppId === application.dataModel.id
        ) {
          link.turnOpaque();
        } else if (
          sourceClassId === mesh.dataModel.id ||
          targetClassId === mesh.dataModel.id
        ) {
          link.turnOpaque();
        }
      });
    }
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
