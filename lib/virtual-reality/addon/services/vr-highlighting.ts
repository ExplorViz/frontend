/* eslint-disable no-restricted-syntax */
import Service, { inject as service } from '@ember/service';
import Configuration from 'explorviz-frontend/services/configuration';
import * as Highlighting from 'explorviz-frontend/utils/application-rendering/highlighting';
import ApplicationObject3D from 'explorviz-frontend/view-objects/3d/application/application-object-3d';
import ClazzCommunicationMesh from 'explorviz-frontend/view-objects/3d/application/clazz-communication-mesh';
import ClazzMesh from 'explorviz-frontend/view-objects/3d/application/clazz-mesh';
import ComponentMesh from 'explorviz-frontend/view-objects/3d/application/component-mesh';
import UserSettings from 'explorviz-frontend/services/user-settings';
import ArSettings from './ar-settings';
import LocalVrUser from './local-vr-user';
import VrMessageSender from './vr-message-sender';
import ApplicationRenderer from 'explorviz-frontend/services/application-renderer';

export type HightlightComponentArgs = {
  entityType: string;
  entityId: string;
  color?: THREE.Color;
};

type HighlightableMesh = ComponentMesh | ClazzMesh | ClazzCommunicationMesh;

function isHightlightableMesh(
  object: THREE.Object3D,
): object is HighlightableMesh {
  return (
    object instanceof ComponentMesh
    || object instanceof ClazzMesh
    || object instanceof ClazzCommunicationMesh
  );
}

export default class VrHighlightingService extends Service {
  @service('ar-settings')
  private arSettings!: ArSettings;

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

  get opacity() {
    return this.userSettings.applicationSettings.transparencyIntensity.value;
  }

  highlightComponent(application: ApplicationObject3D, object: THREE.Object3D) {
    if (isHightlightableMesh(object)) {
      this.hightlightMesh(application, object, this.localUser.color);

      const appId = application.dataModel.id;
      const entityType = this.getEntityType(object);
      const entityId = this.getEntityId(object);
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

  updateHighlightingLocally(application: ApplicationObject3D) {
    if (!this.arSettings.renderCommunication) return;

    const drawableComm = this.applicationRenderer.drawableClassCommunications.get(
      application.dataModel.id,
    );
    if (drawableComm) {
      this.applicationRenderer.appCommRendering.addCommunication(
        application,
        drawableComm,
      );
      Highlighting.updateHighlighting(application, drawableComm, this.opacity);
    }
  }

  private hightlightMesh(
    application: ApplicationObject3D,
    mesh: ComponentMesh | ClazzMesh | ClazzCommunicationMesh,
    color?: THREE.Color,
  ) {
    const drawableComm = this.applicationRenderer.drawableClassCommunications.get(
      application.dataModel.id,
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

  private getEntityId(mesh: HighlightableMesh): string {
    if (mesh instanceof ClazzCommunicationMesh) {
      // This is necessary, since drawable class communications are created on
      // client side, thus their ids do not match, since they are uuids.
      const classIds = [
        mesh.dataModel.sourceClass.id,
        mesh.dataModel.targetClass.id,
      ];
      return classIds.sort().join('###');
    }

    return mesh.dataModel.id;
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
      const classIds = new Set(entityId.split('###'));
      for (const mesh of application.getCommMeshes()) {
        if (
          classIds.has(mesh.dataModel.sourceClass.id)
          && classIds.has(mesh.dataModel.targetClass.id)
        ) {
          yield mesh;
        }
      }
    }
  }
}

declare module '@ember/service' {
  interface Registry {
    'vr-highlighting': VrHighlightingService;
  }
}
