import { Trace } from '../utils/landscape-schemes/dynamic-data';
import {
  Class,
  Package,
  StructureLandscapeData,
} from '../utils/landscape-schemes/structure-data';
import ApplicationObject3D from '../view-objects/3d/application/application-object-3d';
import ClazzCommunicationMesh from '../view-objects/3d/application/clazz-communication-mesh';
import ClazzMesh from '../view-objects/3d/application/clazz-mesh';
import ComponentMesh from '../view-objects/3d/application/component-mesh';
import FoundationMesh from '../view-objects/3d/application/foundation-mesh';
import BaseMesh from '../view-objects/3d/base-mesh';
import ApplicationRenderer from './application-renderer';
import Configuration from './configuration';
import LinkRenderer from './link-renderer';
import ApplicationRepository from './repos/application-repository';
import UserSettings from './user-settings';
import THREE from 'three';
import * as Highlighting from '../utils/application-rendering/highlighting';

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

export default class HighlightingService {
  private configuration!: Configuration;

  private userSettings!: UserSettings;

  // private localUser!: LocalUser;

  private applicationRenderer!: ApplicationRenderer;

  // private sender!: VrMessageSender;

  private applicationRepo!: ApplicationRepository;

  // collaborationSession!: CollaborationSession;

  linkRenderer!: LinkRenderer;

  get opacity() {
    return this.userSettings.applicationSettings.transparencyIntensity.value;
  }

  get highlightingColorStyle() {
    let hexColor = '';
    // if (this.collaborationSession.isOnline && this.localUser.color) {
    //   hexColor = this.localUser.color.getHexString();
    // } else {
    hexColor =
      this.configuration.applicationColors.highlightedEntityColor.getHexString();
    // }

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

  updateHighlightingForAllApplications() {
    this.applicationRenderer
      .getOpenApplications()
      .forEach((applicationObject3D) => {
        this.updateHighlighting(applicationObject3D, this.opacity);
      });
  }

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

  highlightById(meshId: string) {
    const mesh = this.applicationRenderer.getMeshById(meshId);
    // if (isEntityMesh(mesh)) {
    this.highlight(mesh);
    // }
  }

  highlight(mesh: any) {
    const { parent } = mesh;
    if (parent instanceof ApplicationObject3D) {
      this.highlightComponent(parent, mesh);
    }
    // } else if (mesh instanceof ClazzCommunicationMesh) {
    //   this.highlightLink(mesh, this.localUser.color);
    //   this.sender.sendHighlightingUpdate(
    //     '',
    //     this.getEntityType(mesh),
    //     mesh.dataModel.id,
    //     mesh.highlighted
    //   );
    // }
  }

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
      this.hightlightMesh(application, object, new THREE.Color('red')); //this.localUser.color);

      const appId = application.dataModel.id;
      const entityType = this.getEntityType(object);
      const entityId = object.dataModel.id;
      // this.sender.sendHighlightingUpdate(
      //   appId,
      //   entityType,
      //   entityId,
      //   object.highlighted
      // );
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
