/* eslint-disable no-underscore-dangle */
import { action } from '@ember/object';
import Service, { inject as service } from '@ember/service';
import { GraphLink } from 'explorviz-frontend/rendering/application/force-graph';
import { findFirstOpen } from 'explorviz-frontend/utils/link-helper';
import ClazzCommunicationMesh from 'explorviz-frontend/view-objects/3d/application/clazz-communication-mesh';
import ClazzCommuMeshDataModel from 'explorviz-frontend/view-objects/3d/application/utils/clazz-communication-mesh-data-model';
import CommunicationLayout from 'explorviz-frontend/view-objects/layout-models/communication-layout';
import { Vector3 } from 'three';
import ApplicationRenderer from './application-renderer';
import Configuration from './configuration';
import ApplicationRepository from './repos/application-repository';
import UserSettings from './user-settings';
import CommunicationArrowMesh from 'explorviz-frontend/view-objects/3d/application/communication-arrow-mesh';
import { calculateLineThickness } from 'explorviz-frontend/utils/application-rendering/communication-layouter';
import AggregatedClassCommunication from 'explorviz-frontend/utils/landscape-schemes/dynamic/aggregated-class-communication';

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

  getAllLinks() {
    return Array.from(this.linkIdToMesh.values());
  }

  get appSettings() {
    return this.userSettings.applicationSettings;
  }

  get flag() {
    return this._flag;
  }

  set flag(b: boolean) {
    this._flag = b;
  }

  @action
  linkPositionUpdate(
    line: ClazzCommunicationMesh,
    _coords: any,
    link: GraphLink
  ) {
    line.visible = this.isLinkVisible(link);
    if (!link.communicationData) {
      return true;
    }

    const aggregatedClassCommunication: AggregatedClassCommunication =
      link.communicationData;

    // source
    const sourceApp = link.source.__threeObj;
    const forceGraph = sourceApp.parent!;
    const sourceClass = findFirstOpen(
      sourceApp,
      aggregatedClassCommunication.sourceClass
    );
    const sourceMesh = sourceApp.getBoxMeshbyModelId(sourceClass.id)!;
    const start = sourceMesh.getWorldPosition(new Vector3());
    forceGraph.worldToLocal(start);

    // target
    const targetApp = link.target.__threeObj;
    const targetClass = findFirstOpen(
      targetApp,
      aggregatedClassCommunication.targetClass
    );
    const targetMesh = targetApp.getBoxMeshbyModelId(targetClass.id)!;
    const end = targetMesh.getWorldPosition(new Vector3());
    forceGraph.worldToLocal(end);

    // add arrow
    const commLayout = new CommunicationLayout(aggregatedClassCommunication);
    commLayout.startPoint = start;
    commLayout.endPoint = end;
    commLayout.lineThickness = calculateLineThickness(
      aggregatedClassCommunication
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
    const aggregatedClassComm = link.communicationData;
    const applicationObject3D = link.source.__threeObj;
    const { id } = aggregatedClassComm;

    const clazzCommuMeshData = new ClazzCommuMeshDataModel(
      applicationObject3D.data.application,
      aggregatedClassComm,
      id
    );
    const { communicationColor, highlightedEntityColor } =
      this.configuration.applicationColors;

    const existingMesh = this.linkIdToMesh.get(aggregatedClassComm.id);
    if (existingMesh) {
      existingMesh.dataModel = clazzCommuMeshData;
      return existingMesh;
    }
    const newMesh = new ClazzCommunicationMesh(
      // Note: Parameter layout is not used here
      new CommunicationLayout(clazzCommuMeshData.aggregatedClassCommunication),
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
      this.configuration.applicationColors.communicationArrowColor.getHex();

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
