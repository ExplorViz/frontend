import { action } from '@ember/object';
import Service, { inject as service } from '@ember/service';
import { GraphLink } from "explorviz-frontend/rendering/application/force-graph";
import { findFirstOpen } from 'explorviz-frontend/utils/link-helper';
import ClazzCommunicationMesh from "explorviz-frontend/view-objects/3d/application/clazz-communication-mesh";
import ClazzCommuMeshDataModel from 'explorviz-frontend/view-objects/3d/application/utils/clazz-communication-mesh-data-model';
import CommunicationLayout from "explorviz-frontend/view-objects/layout-models/communication-layout";
import { Vector3 } from 'three';
import ApplicationRenderer from './application-renderer';
import { DrawableClassCommunication } from "./application-rendering/class-communication-computer";
import Configuration from './configuration';
import ApplicationRepository from './repos/application-repository';
import UserSettings from './user-settings';


export default class LinkRenderer extends Service.extend({
}) {

  @service('configuration')
  private configuration!: Configuration;

  @service('user-settings')
  private userSettings!: UserSettings;

  @service('application-renderer')
  applicationRenderer!: ApplicationRenderer;

  @service('repos/application-repository')
  applicationRepo!: ApplicationRepository;


  get appSettings() {
    return this.userSettings.applicationSettings;
  }

  @action
  linkPositionUpdate(line: ClazzCommunicationMesh, _coords: { start: Coords, end: Coords }, link: GraphLink) {
    if (!link.communicationData) {
      return true;
    }
    const drawableClassCommunication: DrawableClassCommunication = link.communicationData;

    // source
    const sourceApp = link.source.__threeObj;
    const forceGraph = sourceApp.parent!;
    const sourceClass = findFirstOpen(sourceApp, drawableClassCommunication.sourceClass);
    const sourceMesh = sourceApp.getBoxMeshbyModelId(sourceClass.id)!;
    const start = sourceMesh.getWorldPosition(new Vector3());
    forceGraph.worldToLocal(start);

    // target
    const targetApp = link.target.__threeObj
    const targetClass = findFirstOpen(targetApp, drawableClassCommunication.targetClass);
    const targetMesh = targetApp.getBoxMeshbyModelId(targetClass.id)!;
    const end = targetMesh.getWorldPosition(new Vector3());
    forceGraph.worldToLocal(end);

    // add arrow
    const commLayout = new CommunicationLayout(drawableClassCommunication);
    commLayout.startPoint = start
    commLayout.endPoint = end
    commLayout.lineThickness = 0.2;
    line.layout = commLayout;
    line.geometry.dispose();

    const curveHeight = this.computeCurveHeight(commLayout);
    line.render(new Vector3(), curveHeight);

    // to move particles and arrow
    const curve = line.geometry.parameters.path;
    link.__curve = curve;
    line.children.clear();
    this.addArrows(line, curveHeight, new Vector3());

    return true;
  }

  @action
  createLink(link: GraphLink) {
    const drawableClazzComm = link.communicationData;
    const applicationObject3D = link.source.__threeObj;
    const clazzCommuMeshData = new ClazzCommuMeshDataModel(
      applicationObject3D.dataModel,
      [drawableClazzComm],
      false,
      drawableClazzComm.id,
    );

    const { communicationColor, highlightedEntityColor } = this.configuration.applicationColors;
    return new ClazzCommunicationMesh(undefined, clazzCommuMeshData,
      communicationColor, highlightedEntityColor);
  }

  private computeCurveHeight(commLayout: CommunicationLayout) {
    let baseCurveHeight = 20;

    if (this.configuration.commCurveHeightDependsOnDistance) {
      const classDistance = Math.hypot(
        commLayout.endX - commLayout.startX, commLayout.endZ - commLayout.startZ,
      );
      baseCurveHeight = classDistance * 0.5;
    }

    return baseCurveHeight * this.appSettings.curvyCommHeight.value;
  }

  private addArrows(pipe: ClazzCommunicationMesh, curveHeight: number, viewCenterPoint: Vector3) {
    const arrowOffset = 0.8;
    const arrowHeight = curveHeight / 2 + arrowOffset;
    const arrowThickness = this.appSettings.commArrowSize.value;
    const arrowColorHex = this.configuration.applicationColors.communicationArrowColor.getHex();

    if (arrowThickness > 0.0) {
      pipe.addArrows(viewCenterPoint, arrowThickness, arrowHeight, arrowColorHex);
    }
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    'link-renderer': LinkRenderer;
  }
}
