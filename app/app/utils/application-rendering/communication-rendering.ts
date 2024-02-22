import ClazzCommunicationMesh from 'explorviz-frontend/view-objects/3d/application/clazz-communication-mesh';
import applyCommunicationLayout, {
  calculateLineThickness,
} from 'explorviz-frontend/utils/application-rendering/communication-layouter';
import Configuration from 'explorviz-frontend/services/configuration';
import ApplicationObject3D from 'explorviz-frontend/view-objects/3d/application/application-object-3d';
import CommunicationLayout from 'explorviz-frontend/view-objects/layout-models/communication-layout';
import UserSettings from 'explorviz-frontend/services/user-settings';
import { Vector3 } from 'three';
import ClazzCommuMeshDataModel from 'explorviz-frontend/view-objects/3d/application/utils/clazz-communication-mesh-data-model';
import LocalUser from 'collaborative-mode/services/local-user';
import { MeshLineMaterial } from 'meshline';
import * as THREE from 'three';
import { findFirstOpen } from '../link-helper';
import ComponentCommunication from 'some-react-lib/src/utils/landscape-schemes/dynamic/component-communication';
import { ApplicationSettings } from '../settings/settings-schemas';

export default class CommunicationRendering {
  // Service to access preferences
  configuration: Configuration;

  userSettings: UserSettings;

  localUser: LocalUser;

  constructor(
    configuration: Configuration,
    userSettings: UserSettings,
    localUser: LocalUser
  ) {
    this.configuration = configuration;
    this.userSettings = userSettings;
    this.localUser = localUser;
  }

  get appSettings() {
    return this.userSettings.applicationSettings;
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

  // Add arrow indicators for class communication
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
  }

  // Update arrow indicators for class communication
  addBidirectionalArrow = (pipe: ClazzCommunicationMesh) => {
    pipe.addBidirectionalArrow();
  };

  /**
   * Computes communication and communication arrows and adds them to the
   * applicationObject3D
   *
   * @param applicationObject3D Contains all application meshes.
   *                            Computed communication is added to to object.
   */
  addCommunication(
    applicationObject3D: ApplicationObject3D,
    settings: ApplicationSettings
  ) {
    if (!this.configuration.isCommRendered) return;

    const application = applicationObject3D.data.application;
    const applicationLayout = applicationObject3D.boxLayoutMap.get(
      application.id
    );

    if (!applicationLayout) {
      return;
    }

    // Store colors of highlighting
    const oldHighlightedColors = new Map<string, THREE.Color>();
    applicationObject3D.getCommMeshes().forEach((mesh) => {
      if (mesh.highlighted) {
        oldHighlightedColors.set(
          mesh.getModelId(),
          (
            (mesh.material as THREE.MeshLambertMaterial) ||
            THREE.MeshBasicMaterial ||
            MeshLineMaterial
          ).color
        );
      }
    });

    // Remove old communication
    applicationObject3D.removeAllCommunication();

    // Compute communication Layout
    const commLayoutMap = applyCommunicationLayout(
      applicationObject3D,
      settings
    );

    // Retrieve color preferences
    const { communicationColor, highlightedEntityColor } =
      this.userSettings.applicationColors;

    const componentCommunicationMap = new Map<string, ComponentCommunication>();

    // Render all class communications
    applicationObject3D.data.classCommunications.forEach(
      (classCommunication) => {
        const commLayout = commLayoutMap.get(classCommunication.id);

        // No layouting information available due to hidden communication
        if (!commLayout) {
          return;
        }

        const viewCenterPoint = applicationLayout.center;

        const start = new Vector3();
        start.subVectors(commLayout.startPoint, viewCenterPoint);

        const end = new Vector3();
        end.subVectors(commLayout.endPoint, viewCenterPoint);

        const visibleSource = findFirstOpen(
          applicationObject3D,
          classCommunication.sourceClass
        );

        const visibleTarget = findFirstOpen(
          applicationObject3D,
          classCommunication.targetClass
        );

        let clazzCommuMeshData!: ClazzCommuMeshDataModel;

        if (
          visibleSource.id !== classCommunication.sourceClass.id ||
          visibleTarget.id !== classCommunication.targetClass.id
        ) {
          const ids = [visibleSource.id, visibleTarget.id].sort();
          const componentCommunicationId = ids[0] + '_' + ids[1];

          let componentCommunication: ComponentCommunication;
          // Add communication to existing component communication
          if (componentCommunicationMap.has(componentCommunicationId)) {
            componentCommunication = componentCommunicationMap.get(
              componentCommunicationId
            )!;
            componentCommunication.addClassCommunication(classCommunication);
            const mesh = applicationObject3D.getCommMeshByModelId(
              componentCommunicationId
            )!;
            clazzCommuMeshData = mesh.dataModel;
            mesh.geometry.dispose();
            applicationObject3D.remove(mesh);

            commLayout.lineThickness = calculateLineThickness(
              componentCommunication,
              this.userSettings.applicationSettings
            );
            // Create new component communication
          } else {
            componentCommunication = new ComponentCommunication(
              componentCommunicationId,
              visibleSource,
              visibleTarget,
              classCommunication
            );
            clazzCommuMeshData = new ClazzCommuMeshDataModel(
              application,
              componentCommunication,
              componentCommunication.id
            );

            componentCommunicationMap.set(
              componentCommunicationId,
              componentCommunication
            );
          }
          // Create new communication between classes
        } else {
          clazzCommuMeshData = new ClazzCommuMeshDataModel(
            application,
            classCommunication,
            classCommunication.id
          );
        }

        const oldColor = oldHighlightedColors.get(clazzCommuMeshData.id);

        const pipe = new ClazzCommunicationMesh(
          commLayout,
          clazzCommuMeshData,
          communicationColor,
          oldColor ? oldColor : highlightedEntityColor
        );

        const curveHeight = this.computeCurveHeight(commLayout);

        pipe.render(viewCenterPoint, curveHeight);

        applicationObject3D.add(pipe);

        this.addArrows(pipe, curveHeight, viewCenterPoint);

        if (classCommunication.isBidirectional) {
          this.addBidirectionalArrow(pipe);
        }
      }
    );

    // Apply highlighting properties to newly added communication
    applicationObject3D.updateCommunicationMeshHighlighting();
  }
}
