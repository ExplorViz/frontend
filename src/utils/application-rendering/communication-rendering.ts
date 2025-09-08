import { useConfigurationStore } from 'explorviz-frontend/src/stores/configuration';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import applyCommunicationLayout, {
  calculateLineThickness,
} from 'explorviz-frontend/src/utils/application-rendering/communication-layouter';
import ComponentCommunication from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/component-communication';
import { findFirstOpen } from 'explorviz-frontend/src/utils/link-helper';
import ApplicationObject3D from 'explorviz-frontend/src/view-objects/3d/application/application-object-3d';
import ClazzCommunicationMesh from 'explorviz-frontend/src/view-objects/3d/application/clazz-communication-mesh';
import ClazzCommuMeshDataModel from 'explorviz-frontend/src/view-objects/3d/application/utils/clazz-communication-mesh-data-model';
import CommunicationLayout from 'explorviz-frontend/src/view-objects/layout-models/communication-layout.ts';
import { MeshLineMaterial } from 'meshline';
import * as THREE from 'three';
import { VisualizationSettings } from '../settings/settings-schemas';

export default class CommunicationRendering {
  get vizSettings() {
    return useUserSettingsStore.getState().visualizationSettings;
  }

  private computeCurveHeight(commLayout: CommunicationLayout) {
    let baseCurveHeight = 20;

    if (useConfigurationStore.getState().commCurveHeightDependsOnDistance) {
      const classDistance = Math.hypot(
        commLayout.endX - commLayout.startX,
        commLayout.endZ - commLayout.startZ
      );
      baseCurveHeight = classDistance * 0.5;
    }

    return baseCurveHeight * this.vizSettings.curvyCommHeight.value;
  }

  // Add arrow indicators for class communication
  private addArrows(pipe: ClazzCommunicationMesh, curveHeight: number) {
    const arrowThickness =
      useUserSettingsStore.getState().visualizationSettings.commArrowSize.value;

    if (arrowThickness > 0.0) {
      pipe.addArrows();
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
    settings: VisualizationSettings
  ) {
    // TODO
    return;
    if (!useConfigurationStore.getState().isCommRendered) return;

    const application = applicationObject3D.dataModel.application;
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
      useUserSettingsStore.getState().colors!;

    const componentCommunicationMap = new Map<string, ComponentCommunication>();

    // Render all class communications
    applicationObject3D.dataModel.classCommunications.forEach(
      (classCommunication) => {
        const commLayout = commLayoutMap.get(classCommunication.id);

        // No layouting information available due to hidden communication
        if (!commLayout) {
          return;
        }

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
              useUserSettingsStore.getState().visualizationSettings
                .commThickness.value
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

        pipe.render(curveHeight);

        applicationObject3D.add(pipe);

        this.addArrows(pipe, curveHeight);

        if (classCommunication.isBidirectional) {
          this.addBidirectionalArrow(pipe);
        }
        pipe.saveOriginalAppearence();
      }
    );

    // Apply highlighting properties to newly added communication
    applicationObject3D.updateCommunicationMeshHighlighting();
  }
}
