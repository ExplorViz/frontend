import Service, { inject as service } from '@ember/service';
import debugLogger from 'ember-debug-logger/utils/debug-logger';
import { calculateLineThickness } from 'react-lib/src/utils/application-rendering/communication-layouter';
import ClassCommunication from 'react-lib/src/utils/landscape-schemes/dynamic/class-communication';
import { findFirstOpen } from 'react-lib/src/utils/link-helper';
import ApplicationObject3D from 'react-lib/src/view-objects/3d/application/application-object-3d';
import ClazzCommunicationMesh from 'react-lib/src/view-objects/3d/application/clazz-communication-mesh';
import CommunicationArrowMesh from 'react-lib/src/view-objects/3d/application/communication-arrow-mesh';
import ClazzCommuMeshDataModel from 'react-lib/src/view-objects/3d/application/utils/clazz-communication-mesh-data-model';
import CommunicationLayout from 'react-lib/src/view-objects/layout-models/communication-layout.ts';
import * as THREE from 'three';
import ApplicationRenderer from './application-renderer';
import Configuration from './configuration';
import UserSettings from './user-settings';
// import { useLinkRendererStore } from 'react-lib/src/stores/link-renderer';

export default class LinkRenderer extends Service.extend({}) {
  @service('configuration')
  private configuration!: Configuration;

  @service('user-settings')
  private userSettings!: UserSettings;

  @service('application-renderer')
  applicationRenderer!: ApplicationRenderer;

  // TODO: Migrate after migration of ClazzCommunicationMesh
  // All changes are ready to get uncommented

  private linkIdToMesh: Map<string, ClazzCommunicationMesh> = new Map();

  // get linkIdToMesh(): Map<string, ClazzCommunicationMesh> {
  //   return useLinkRendererStore.getState().linkIdToMesh;
  // }

  // set linkIdToMesh(value: Map<string, ClazzCommunicationMesh>) {
  //   // useLinkRendererStore.setState({ linkIdToMesh: value });
  // }

  private _flag = false;

  // get _flag(): boolean {
  //   return useLinkRendererStore.getState()._flag;
  // }

  // set _flag(value: boolean) {
  // useLinkRendererStore.setState({ _flag: value });
  // }

  readonly debug = debugLogger();

  get appSettings() {
    return this.userSettings.visualizationSettings;
  }

  get flag() {
    return this._flag;
  }

  set flag(b: boolean) {
    this._flag = b;
  }

  getAllLinks() {
    return Array.from(this.linkIdToMesh.values());
  }

  updateLinkPosition(line: ClazzCommunicationMesh) {
    const sourceApp = this.applicationRenderer.getApplicationById(
      line.dataModel.communication.sourceApp.id
    );
    const targetApp = this.applicationRenderer.getApplicationById(
      line.dataModel.communication.targetApp.id
    );

    if (
      !(sourceApp instanceof ApplicationObject3D) ||
      !(targetApp instanceof ApplicationObject3D)
    ) {
      this.debug('Link data incomplete');
      return;
    }

    const classCommunication = line.dataModel.communication;

    line.visible = this.configuration.isCommRendered;
    const landscapeGroup = sourceApp.parent!;

    let sourceClass, targetClass;

    if (classCommunication instanceof ClassCommunication) {
      sourceClass = findFirstOpen(sourceApp, classCommunication.sourceClass);
      targetClass = findFirstOpen(sourceApp, classCommunication.targetClass);
    } else {
      sourceClass = findFirstOpen(sourceApp, classCommunication.sourceEntity);
      targetClass = findFirstOpen(sourceApp, classCommunication.targetEntity);
    }

    const sourceMesh = sourceApp.getBoxMeshByModelId(sourceClass.id);
    let start = new THREE.Vector3();
    if (sourceMesh) {
      start = sourceMesh.getWorldPosition(new THREE.Vector3());
      landscapeGroup.worldToLocal(start);
    } else {
      this.debug('Source mesh not found');
    }

    const targetMesh = targetApp.getBoxMeshByModelId(targetClass.id);
    let end = new THREE.Vector3();
    if (targetMesh) {
      end = targetMesh.getWorldPosition(new THREE.Vector3());
      landscapeGroup.worldToLocal(end);
    } else {
      this.debug('Target mesh not found');
    }

    // Add arrow
    const commLayout = new CommunicationLayout(classCommunication);
    commLayout.startPoint = start;
    commLayout.endPoint = end;
    commLayout.lineThickness = calculateLineThickness(
      classCommunication,
      this.userSettings.visualizationSettings
    );
    line.layout = commLayout;
    line.geometry.dispose();

    const curveHeight = this.computeCurveHeight(commLayout);
    line.render(new THREE.Vector3(), curveHeight);

    this.addArrows(line, curveHeight, new THREE.Vector3());
    // SemanticZoomManager: save the original appearence
    line.saveOriginalAppearence();
    line.saveCurrentlyActiveLayout();
    return true;
  }

  updateLinkPositions() {
    this.linkIdToMesh.forEach((link) => {
      this.updateLinkPosition(link);
    });
  }

  createMeshFromCommunication(
    classCommunication: ClassCommunication
  ): ClazzCommunicationMesh | undefined {
    const applicationObject3D = this.applicationRenderer.getApplicationById(
      classCommunication.sourceApp.id
    );
    if (!applicationObject3D) return;
    const { id } = classCommunication;

    const clazzCommuMeshData = new ClazzCommuMeshDataModel(
      applicationObject3D.dataModel.application,
      classCommunication,
      id
    );
    const { communicationColor, highlightedEntityColor } =
      this.userSettings.colors!;

    const existingMesh = this.linkIdToMesh.get(classCommunication.id);
    if (existingMesh) {
      existingMesh.dataModel = clazzCommuMeshData;
      return existingMesh;
    }
    const newMesh = new ClazzCommunicationMesh(
      // Note: Parameter layout is not used here
      new CommunicationLayout(clazzCommuMeshData.communication),
      clazzCommuMeshData,
      communicationColor,
      highlightedEntityColor
    );
    this.linkIdToMesh.set(id, newMesh);
    // useLinkRendererStore.getState().addLinkIdToMesh(id, newMesh);

    this.linkIdToMesh.set(id, newMesh);
    return newMesh;
  }

  getLinkById(linkId: string) {
    return this.linkIdToMesh.get(linkId);
  }

  private computeCurveHeight(commLayout: CommunicationLayout) {
    let baseCurveHeight = 20;

    if (this.configuration.commCurveHeightDependsOnDistance) {
      const classDistance = Math.hypot(
        commLayout.endX - commLayout.startX,
        commLayout.endZ - commLayout.startZ
      );
      baseCurveHeight = classDistance * 0.5;
    }

    return baseCurveHeight * this.appSettings.curvyCommHeight.value;
  }

  private addArrows(
    pipe: ClazzCommunicationMesh,
    curveHeight: number,
    viewCenterPoint: THREE.Vector3
  ) {
    pipe.children.forEach((child) => {
      if (child instanceof CommunicationArrowMesh) child.dispose();
      pipe.remove(child);
    });

    const arrowOffset = 1;
    const arrowHeight = curveHeight / 2 + arrowOffset;
    const arrowThickness = this.appSettings.commArrowSize.value;
    const arrowColorHex =
      this.userSettings.colors!.communicationArrowColor.getHex();

    if (arrowThickness > 0.0) {
      pipe.addArrows(
        viewCenterPoint,
        arrowThickness,
        arrowHeight,
        arrowColorHex
      );
    }

    if (pipe.material.opacity !== 1) {
      // This fixes the problem that every arrow gets opaque (even for transparent pipes) after receiving onTimestampUpdate messages
      pipe.children.forEach((child) => {
        if (child instanceof CommunicationArrowMesh)
          child.turnTransparent(pipe.material.opacity);
      });
    }
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    'link-renderer': LinkRenderer;
  }
}
