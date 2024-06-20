/* eslint-disable no-underscore-dangle */
import { action } from '@ember/object';
import Service, { inject as service } from '@ember/service';
import debugLogger from 'ember-debug-logger/utils/debug-logger';
import { GraphLink } from 'explorviz-frontend/rendering/application/force-graph';
import { calculateLineThickness } from 'explorviz-frontend/utils/application-rendering/communication-layouter';
import ClassCommunication from 'explorviz-frontend/utils/landscape-schemes/dynamic/class-communication';
import { findFirstOpen } from 'explorviz-frontend/utils/link-helper';
import ApplicationObject3D from 'explorviz-frontend/view-objects/3d/application/application-object-3d';
import ClazzCommunicationMesh from 'explorviz-frontend/view-objects/3d/application/clazz-communication-mesh';
import CommunicationArrowMesh from 'explorviz-frontend/view-objects/3d/application/communication-arrow-mesh';
import ClazzCommuMeshDataModel from 'explorviz-frontend/view-objects/3d/application/utils/clazz-communication-mesh-data-model';
import CommunicationLayout from 'explorviz-frontend/view-objects/layout-models/communication-layout';
import { Vector3 } from 'three';
import ApplicationRenderer from './application-renderer';
import Configuration from './configuration';
import ApplicationRepository from './repos/application-repository';
import UserSettings from './user-settings';

export default class LinkRenderer extends Service.extend({}) {
  @service('configuration')
  private configuration!: Configuration;

  @service('user-settings')
  private userSettings!: UserSettings;

  @service('application-renderer')
  applicationRenderer!: ApplicationRenderer;

  @service('repos/application-repository')
  applicationRepo!: ApplicationRepository;

  private linkIdToMesh: Map<string, ClazzCommunicationMesh> = new Map();

  private _flag = false;

  readonly debug = debugLogger('LinkRenderer');

  get appSettings() {
    return this.userSettings.applicationSettings;
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

  @action
  linkPositionUpdate(
    line: ClazzCommunicationMesh,
    _coords: any,
    link: GraphLink
  ) {
    const sourceApp = link.source.__threeObj;
    const targetApp = link.target.__threeObj;

    if (
      !(sourceApp instanceof ApplicationObject3D) ||
      !(targetApp instanceof ApplicationObject3D) ||
      !link.communicationData
    ) {
      this.debug('Link data incomplete');
      return;
    }

    const classCommunication: ClassCommunication = link.communicationData;

    line.visible = this.isLinkVisible(link);

    const forceGraph = sourceApp.parent!;
    const sourceClass = findFirstOpen(
      sourceApp,
      classCommunication.sourceClass
    );
    const sourceMesh = sourceApp.getBoxMeshbyModelId(sourceClass.id);
    let start = new Vector3();
    if (sourceMesh) {
      start = sourceMesh.getWorldPosition(new Vector3());
      forceGraph.worldToLocal(start);
    } else {
      this.debug('Source mesh not found');
    }

    // target
    const targetClass = findFirstOpen(
      targetApp,
      classCommunication.targetClass
    );
    const targetMesh = targetApp.getBoxMeshbyModelId(targetClass.id);
    let end = new Vector3();
    if (targetMesh) {
      end = targetMesh.getWorldPosition(new Vector3());
      forceGraph.worldToLocal(end);
    } else {
      this.debug('Target mesh not found');
    }

    // add arrow
    const commLayout = new CommunicationLayout(classCommunication);
    commLayout.startPoint = start;
    commLayout.endPoint = end;
    commLayout.lineThickness = calculateLineThickness(
      classCommunication,
      this.userSettings.applicationSettings
    );
    line.layout = commLayout;
    line.geometry.dispose();

    const curveHeight = this.computeCurveHeight(commLayout);
    line.render(new Vector3(), curveHeight);

    // to move particles and arrow
    const curve = (line.geometry as THREE.TubeGeometry).parameters.path;
    link.__curve = curve;
    line.children.clear();
    this.addArrows(line, curveHeight, new Vector3());

    return true;
  }

  @action
  createMeshFromLink(link: GraphLink) {
    const classCommunication = link.communicationData;
    const applicationObject3D = link.source.__threeObj;
    const { id } = classCommunication;

    if (!applicationObject3D.data) {
      this.debug('Link renderer has no application data yet');
      return;
    }

    const clazzCommuMeshData = new ClazzCommuMeshDataModel(
      applicationObject3D.data.application,
      classCommunication,
      id
    );
    const { communicationColor, highlightedEntityColor } =
      this.userSettings.applicationColors;

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

    return newMesh;
  }

  getLinks() {
    return Array.from(this.linkIdToMesh.values());
  }

  getLinkById(linkId: string) {
    return this.linkIdToMesh.get(linkId);
  }

  @action
  isLinkVisible(link: GraphLink) {
    if (!link.communicationData) {
      return false;
    }
    return this.configuration.isCommRendered;
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
    viewCenterPoint: Vector3
  ) {
    const arrowOffset = 0.8;
    const arrowHeight = curveHeight / 2 + arrowOffset;
    const arrowThickness = this.appSettings.commArrowSize.value;
    const arrowColorHex =
      this.userSettings.applicationColors.communicationArrowColor.getHex();

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
