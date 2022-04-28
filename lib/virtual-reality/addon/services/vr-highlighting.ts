/* eslint-disable no-restricted-syntax */
import Service, { inject as service } from '@ember/service';
import { action } from '@ember/object';
import ApplicationRenderer from 'explorviz-frontend/services/application-renderer';
import Configuration from 'explorviz-frontend/services/configuration';
import UserSettings from 'explorviz-frontend/services/user-settings';
import * as Highlighting from 'explorviz-frontend/utils/application-rendering/highlighting';
import ApplicationObject3D from 'explorviz-frontend/view-objects/3d/application/application-object-3d';
import ClazzCommunicationMesh from 'explorviz-frontend/view-objects/3d/application/clazz-communication-mesh';
import ClazzMesh from 'explorviz-frontend/view-objects/3d/application/clazz-mesh';
import ComponentMesh from 'explorviz-frontend/view-objects/3d/application/component-mesh';
import { ForwardedMessage } from 'virtual-reality/utils/vr-message/receivable/forwarded';
import { HighlightingUpdateMessage } from 'virtual-reality/utils/vr-message/sendable/highlighting_update';
import LocalVrUser from './local-vr-user';
import VrMessageSender from './vr-message-sender';
import ApplicationRepository from 'explorviz-frontend/services/repos/application-repository';
import { Class, Package, StructureLandscapeData } from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import { Trace } from 'explorviz-frontend/utils/landscape-schemes/dynamic-data';
import AlertifyHandler from 'explorviz-frontend/utils/alertify-handler';

export type HightlightComponentArgs = {
  entityType: string;
  entityId: string;
  color?: THREE.Color;
};

type HighlightableMesh = ComponentMesh | ClazzMesh | ClazzCommunicationMesh;

export function isHightlightableMesh(
  object: THREE.Object3D,
): object is HighlightableMesh {
  return (
    object instanceof ComponentMesh
    || object instanceof ClazzMesh
    || object instanceof ClazzCommunicationMesh
  );
}

export function serializeHighlightedComponent(applicationObject3D: ApplicationObject3D, object: any) {
  if (isHightlightableMesh(object)) {
    return {
      appId: applicationObject3D.dataModel.id,
      entityType: object.constructor.name,
      entityId: object.dataModel.id,
    }
  }
  return null;
}

export default class VrHighlightingService extends Service {

  @service('configuration')
  private configuration!: Configuration;

  @service('user-settings')
  private userSettings!: UserSettings;

  @service('local-vr-user')
  private localUser!: LocalVrUser;

  @service('application-renderer')
  private applicationRenderer!: ApplicationRenderer;

  @service('vr-message-sender')
  private sender!: VrMessageSender;

  @service('repos/application-repository')
  private applicationRepo!: ApplicationRepository;

  get opacity() {
    return this.userSettings.applicationSettings.transparencyIntensity.value;
  }

  private getDrawableClassCommunications(applicationObjetc3D: ApplicationObject3D) {
    const applicationData = this.applicationRepo.getById(applicationObjetc3D.dataModel.id);
    return applicationData?.drawableClassCommunications;
  }

  @action
  updateHighlightingForAllApplications() {
    this.applicationRenderer.getOpenApplications().forEach((applicationObject3D) => {
      this.updateHighlighting(applicationObject3D, this.opacity);
    })
  }

  private updateHighlighting(applicationObject3D: ApplicationObject3D, value: number) {
    const drawableClassCommunications = this.getDrawableClassCommunications(applicationObject3D);
    if (drawableClassCommunications) {
      Highlighting.updateHighlighting(applicationObject3D, drawableClassCommunications, value);
    }
  }

  @action
  highlightModel(entity: Package | Class, applicationObject3D: ApplicationObject3D) {
    const drawableClassCommunications = this.getDrawableClassCommunications(applicationObject3D);
    if (drawableClassCommunications) {
      Highlighting.highlightModel(entity, applicationObject3D, drawableClassCommunications, this.opacity);
    }
  }

  @action
  highlight(mesh: ComponentMesh | ClazzMesh | ClazzCommunicationMesh, color?: THREE.Color) {
    const applicationObject3D = mesh.parent;
    if (applicationObject3D instanceof ApplicationObject3D) {
      const drawableClassCommunications = this.getDrawableClassCommunications(applicationObject3D);
      if (drawableClassCommunications) {
        applicationObject3D.setHighlightingColor(
          color || this.configuration.applicationColors.highlightedEntityColor,
        );
        Highlighting.highlight(mesh, applicationObject3D, drawableClassCommunications!, this.opacity);
      }
    }
  }

  @action
  highlightTrace(trace: Trace, traceStep: string, applicationObject3D: ApplicationObject3D, structureData: StructureLandscapeData) {
    const drawableClassCommunications = this.getDrawableClassCommunications(applicationObject3D);

    this.applicationRenderer.openAllComponents(applicationObject3D);
    if (drawableClassCommunications) {
      Highlighting.highlightTrace(trace, traceStep, applicationObject3D,
        drawableClassCommunications!, structureData, this.opacity);
    }
  }

  highlightComponent(application: ApplicationObject3D, object: THREE.Object3D) {
    if (isHightlightableMesh(object)) {
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
    for (const mesh of meshes) this.hightlightMesh(application, mesh, color);
  }

  private hightlightMesh(
    application: ApplicationObject3D,
    mesh: ComponentMesh | ClazzMesh | ClazzCommunicationMesh,
    color?: THREE.Color,
  ) {
    const drawableComm = this.applicationRenderer.getDrawableClassCommunications(
      application
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
      for (const mesh of application.getCommMeshes()) {
        if (mesh.dataModel.id === entityId) {
          yield mesh;
        }
      }
    }
  }

  // collaboration
  onHighlightingUpdate({
    userId,
    originalMessage: {
      isHighlighted, appId, entityType, entityId,
    },
  }: ForwardedMessage<HighlightingUpdateMessage>): void {
    const application = this.applicationRenderer.getApplicationById(appId);
    if (!application) return;

    const user = this.remoteUsers.lookupRemoteUserById(userId);
    if (!user) return;

    if (isHighlighted) {
      this.hightlightComponentLocallyByTypeAndId(
        application,
        {
          entityType,
          entityId,
          color: user.color,
        },
      );
    } else {
      this.removeHighlightingLocally(application);
    }
  }
}

declare module '@ember/service' {
  interface Registry {
    'vr-highlighting': VrHighlightingService;
  }
}
