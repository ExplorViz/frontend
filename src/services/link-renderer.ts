import { Vector3 } from 'three';
import ApplicationRenderer from './application-renderer';
import Configuration from './configuration';
import ApplicationRepository from './repos/application-repository';
import UserSettings from './user-settings';
import ClazzCommunicationMesh from '../view-objects/3d/application/clazz-communication-mesh';
import { GraphLink } from '../rendering/application/force-graph';
import { findFirstOpen } from '../utils/link-helper';
import CommunicationLayout from '../view-objects/layout-models/communication-layout';
import ClazzCommuMeshDataModel from '../view-objects/3d/application/utils/clazz-communication-mesh-data-model';
import { DrawableClassCommunication } from '../utils/application-rendering/class-communication-computer';

export default class LinkRenderer {
  private configuration!: Configuration;

  private userSettings!: UserSettings;

  applicationRenderer!: ApplicationRenderer;

  applicationRepo!: ApplicationRepository;

  private linkIdToMesh: Map<string, ClazzCommunicationMesh> = new Map();

  getAllLinks() {
    return Array.from(this.linkIdToMesh.values());
  }

  get appSettings() {
    return this.userSettings.applicationSettings;
  }

  linkPositionUpdate(
    line: ClazzCommunicationMesh,
    _coords: any,
    link: GraphLink
  ) {
    line.visible = this.linkVisible(link);
    if (!link.communicationData) {
      return true;
    }
    const drawableClassCommunication: DrawableClassCommunication =
      link.communicationData;

    // source
    const sourceApp = link.source.__threeObj;
    const forceGraph = sourceApp.parent!;
    const sourceClass = findFirstOpen(
      sourceApp,
      drawableClassCommunication.sourceClass
    );
    const sourceMesh = sourceApp.getBoxMeshbyModelId(sourceClass.id)!;
    const start = sourceMesh.getWorldPosition(new Vector3());
    forceGraph.worldToLocal(start);

    // target
    const targetApp = link.target.__threeObj;
    const targetClass = findFirstOpen(
      targetApp,
      drawableClassCommunication.targetClass
    );
    const targetMesh = targetApp.getBoxMeshbyModelId(targetClass.id)!;
    const end = targetMesh.getWorldPosition(new Vector3());
    forceGraph.worldToLocal(end);

    // add arrow
    const commLayout = new CommunicationLayout(drawableClassCommunication);
    commLayout.startPoint = start;
    commLayout.endPoint = end;
    commLayout.lineThickness = link.value;
    line.layout = commLayout;
    line.geometry.dispose();

    const curveHeight = this.computeCurveHeight(commLayout);
    line.render(new Vector3(), curveHeight);

    // to move particles and arrow
    const curve = (line.geometry as THREE.TubeGeometry).parameters.path;
    link.__curve = curve;
    // TODO
    //line.children.clear();
    this.addArrows(line, curveHeight, new Vector3());

    return true;
  }

  createLink(link: GraphLink) {
    const drawableClazzComm = link.communicationData;
    const applicationObject3D = link.source.__threeObj;
    const { id } = drawableClazzComm;

    const clazzCommuMeshData = new ClazzCommuMeshDataModel(
      applicationObject3D.dataModel,
      [drawableClazzComm],
      false,
      id
    );
    const { communicationColor, highlightedEntityColor } =
      this.configuration.applicationColors;

    const existingMesh = this.linkIdToMesh.get(drawableClazzComm.id);
    if (existingMesh) {
      existingMesh.dataModel = clazzCommuMeshData;
      return existingMesh;
    }
    const newMesh = new ClazzCommunicationMesh(
      // Note: Parameter layout is not used here
      new CommunicationLayout(clazzCommuMeshData.drawableClassCommus[0]),
      clazzCommuMeshData,
      communicationColor,
      highlightedEntityColor
    );
    this.linkIdToMesh.set(id, newMesh);

    return newMesh;
  }

  getLinkById(linkId: string) {
    return this.linkIdToMesh.get(linkId);
  }

  linkVisible(link: GraphLink) {
    // return false;
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
  }
}
