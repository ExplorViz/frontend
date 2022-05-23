import { action } from '@ember/object';
import Service, { inject as service } from '@ember/service';
import CollaborationSession from 'collaborative-mode/services/collaboration-session';
import LocalUser from 'collaborative-mode/services/local-user';
import ApplicationRenderer from 'explorviz-frontend/services/application-renderer';
import Configuration from 'explorviz-frontend/services/configuration';
import ApplicationRepository from 'explorviz-frontend/services/repos/application-repository';
import UserSettings from 'explorviz-frontend/services/user-settings';
import * as Highlighting from 'explorviz-frontend/utils/application-rendering/highlighting';
import { Trace } from 'explorviz-frontend/utils/landscape-schemes/dynamic-data';
import { Class, Package, StructureLandscapeData } from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import ApplicationObject3D from 'explorviz-frontend/view-objects/3d/application/application-object-3d';
import ClazzCommunicationMesh from 'explorviz-frontend/view-objects/3d/application/clazz-communication-mesh';
import ClazzMesh from 'explorviz-frontend/view-objects/3d/application/clazz-mesh';
import ComponentMesh from 'explorviz-frontend/view-objects/3d/application/component-mesh';
import VrMessageSender from 'virtual-reality/services/vr-message-sender';

export type HightlightComponentArgs = {
  entityType: string;
  entityId: string;
  color?: THREE.Color;
};

type HighlightableMesh = ComponentMesh | ClazzMesh | ClazzCommunicationMesh;

export function isHighlightableMesh(
  object: THREE.Object3D,
): object is HighlightableMesh {
  return (
    object instanceof ComponentMesh
    || object instanceof ClazzMesh
    || object instanceof ClazzCommunicationMesh
  );
}

export function serializeHighlightedComponent(
  applicationObject3D: ApplicationObject3D, object: any,
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

  get opacity() {
    return this.userSettings.applicationSettings.transparencyIntensity.value;
  }

  get highlightingColorStyle() {
    let hexColor = '';
    if (this.collaborationSession.isOnline && this.localUser.color) {
      hexColor = this.localUser.color.getHexString();
    } else {
      hexColor = this.configuration.applicationColors.highlightedEntityColor.getHexString();
    }

    return `color:#${hexColor}`;
  }

  private getDrawableClassCommunications(applicationObjetc3D: ApplicationObject3D) {
    const applicationData = this.applicationRepo.getById(applicationObjetc3D.dataModel.id);
    return applicationData?.drawableClassCommunications;
  }

  @action
  updateHighlightingForAllApplications() {
    this.applicationRenderer.getOpenApplications().forEach((applicationObject3D) => {
      this.updateHighlighting(applicationObject3D, this.opacity);
    });
  }

  updateHighlighting(applicationObject3D: ApplicationObject3D, value: number = this.opacity) {
    const drawableClassCommunications = this.getDrawableClassCommunications(applicationObject3D);
    if (drawableClassCommunications) {
      Highlighting.updateHighlighting(applicationObject3D, drawableClassCommunications, value);
    }
  }

  @action
  highlightModel(entity: Package | Class, applicationObject3D: ApplicationObject3D) {
    const drawableClassCommunications = this.getDrawableClassCommunications(applicationObject3D);
    if (drawableClassCommunications) {
      Highlighting.highlightModel(entity, applicationObject3D,
        drawableClassCommunications, this.opacity);
    }
  }

  @action
  highlight(mesh: ComponentMesh | ClazzMesh | ClazzCommunicationMesh) {
    const applicationObject3D = mesh.parent;
    if (applicationObject3D instanceof ApplicationObject3D) {
      this.highlightComponent(applicationObject3D, mesh);
    }
  }

  @action
  highlightTrace(trace: Trace, traceStep: string,
    applicationObject3D: ApplicationObject3D, structureData: StructureLandscapeData) {
    const drawableClassCommunications = this.getDrawableClassCommunications(applicationObject3D);

    this.applicationRenderer.openAllComponents(applicationObject3D);
    if (drawableClassCommunications) {
      Highlighting.highlightTrace(trace, traceStep, applicationObject3D,
        drawableClassCommunications!, structureData, this.opacity);
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
        object.highlighted,
      );
    }
  }

  removeHighlightingLocally(application: ApplicationObject3D) {
    Highlighting.removeHighlighting(application);
  }

  hightlightComponentLocallyByTypeAndId(
    application: ApplicationObject3D,
    { entityType, entityId, color }: HightlightComponentArgs,
  ) {
    const meshes = this.findMeshesByTypeAndId(
      application,
      entityType,
      entityId,
    );

    // eslint-disable-next-line no-restricted-syntax
    for (const mesh of meshes) this.hightlightMesh(application, mesh, color);
  }

  private hightlightMesh(
    application: ApplicationObject3D,
    mesh: ComponentMesh | ClazzMesh | ClazzCommunicationMesh,
    color?: THREE.Color,
  ) {
    const drawableComm = this.getDrawableClassCommunications(
      application,
    );
    if (drawableComm) {
      application.setHighlightingColor(
        color || this.configuration.applicationColors.highlightedEntityColor,
      );
      Highlighting.highlight(mesh, application, drawableComm, this.opacity);
    }
  }

  private getEntityType(mesh: HighlightableMesh): string {
    return mesh.constructor.name;
  }

  private * findMeshesByTypeAndId(
    application: ApplicationObject3D,
    entityType: string,
    entityId: string,
  ): Generator<HighlightableMesh> {
    if (entityType === 'ComponentMesh' || entityType === 'ClazzMesh') {
      const mesh = application.getBoxMeshbyModelId(entityId);
      if (mesh instanceof ComponentMesh || mesh instanceof ClazzMesh) {
        yield mesh;
      }
    }

    if (entityType === 'ClazzCommunicationMesh') {
      // eslint-disable-next-line no-restricted-syntax
      for (const mesh of application.getCommMeshes()) {
        if (mesh.dataModel.id === entityId) {
          yield mesh;
        }
      }
    }
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    'highlighting-service': HighlightingService;
  }
}
