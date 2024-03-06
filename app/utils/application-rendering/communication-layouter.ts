import * as THREE from 'three';
import ApplicationObject3D from 'explorviz-frontend/view-objects/3d/application/application-object-3d';
import ComponentMesh from '../../view-objects/3d/application/component-mesh';
import FoundationMesh from '../../view-objects/3d/application/foundation-mesh';
import CommunicationLayout from '../../view-objects/layout-models/communication-layout';
import {
  Application,
  Class,
  Package,
} from '../landscape-schemes/structure-data';
import ClassCommunication from '../landscape-schemes/dynamic/class-communication';
import ComponentCommunication from '../landscape-schemes/dynamic/component-communication';
import { ApplicationSettings } from '../settings/settings-schemas';

export function calculateLineThickness(
  communication: ClassCommunication | ComponentCommunication,
  settings: ApplicationSettings
) {
  let normalizedRequestCount = 1;
  // Normalized request count might be above 1 for component communication
  if (communication instanceof ComponentCommunication) {
    normalizedRequestCount = clamp(
      communication.metrics.normalizedRequestCount,
      0.5,
      1.5
    );
  } else if (communication instanceof ClassCommunication) {
    let meanNormalizedRequestCount = 0;
    if (communication.methodCalls[0].length > 0) {
      meanNormalizedRequestCount +=
        communication.metrics[0].normalizedRequestCount;
    }

    if (communication.methodCalls[1].length > 0) {
      meanNormalizedRequestCount +=
        communication.metrics[1].normalizedRequestCount;
    }

    normalizedRequestCount = clamp(meanNormalizedRequestCount / 2, 0.5, 1.5);
  }

  // Apply line thickness depending on request count
  return normalizedRequestCount * settings.commThickness.value;
}

/**
 * Limits a value to a given range
 */
export function clamp(value: number, min: number, max: number) {
  return value > max ? max : value < min ? min : value;
}

// Communication Layouting //
export default function applyCommunicationLayout(
  applicationObject3D: ApplicationObject3D,
  settings: ApplicationSettings
) {
  const { application, classCommunications } = applicationObject3D.data;
  const boxLayoutMap = applicationObject3D.boxLayoutMap;

  const layoutMap: Map<string, CommunicationLayout> = new Map();
  /**
   * Returns the first parent component which is open
   * or - if it does not exist - the deepest closed component
   *
   * @param component Component for which an open parent shall be returned
   */
  function findFirstOpenOrLastClosedAncestorComponent(
    component: Package
  ): Package {
    const parentComponent = component.parent;

    if (!parentComponent) return component;

    // Check open status in corresponding component mesh
    const parentMesh = applicationObject3D.getBoxMeshbyModelId(
      parentComponent.id
    );
    if (parentMesh instanceof ComponentMesh && parentMesh.opened) {
      return component;
    }

    // Recursive call
    return findFirstOpenOrLastClosedAncestorComponent(parentComponent);
  }

  function getParentComponentOfClassCommunication(
    communication: ClassCommunication
  ) {
    // Contains all parent components of source clazz incl. foundation in hierarchical order
    const sourceClassComponents: Package[] = [];
    const { sourceClass } = communication;
    if (sourceClass !== null) {
      let parentComponent: Package | undefined = sourceClass.parent;
      while (parentComponent !== undefined) {
        sourceClassComponents.unshift(parentComponent);
        parentComponent = parentComponent.parent;
      }
    }

    // Contains all parent components of target class incl. foundation in hierarchical order
    const targetClassComponents: Package[] = [];
    const { targetClass } = communication;
    if (targetClass !== null) {
      let parentComponent: Package | undefined = targetClass.parent;
      while (parentComponent !== undefined) {
        targetClassComponents.unshift(parentComponent);
        parentComponent = parentComponent.parent;
      }
    }

    // Find the most inner common component
    let commonComponent: Package | null = null;
    for (
      let i = 0;
      i < sourceClassComponents.length && i < targetClassComponents.length;
      i++
    ) {
      if (sourceClassComponents[i] === targetClassComponents[i]) {
        commonComponent = sourceClassComponents[i];
      } else {
        break;
      }
    }

    return commonComponent;
  }

  /**
   * Calculates start and end positions for all class communications
   */
  function layoutEdges(settings: ApplicationSettings) {
    if (classCommunications.length === 0) {
      return;
    }
    for (let i = 0; i < classCommunications.length; i++) {
      const classCommunication: ClassCommunication = classCommunications[i];

      const parentComponent =
        getParentComponentOfClassCommunication(classCommunication);

      let parentMesh;

      if (parentComponent === null) {
        // common ancestor must be the foundation
        parentMesh = applicationObject3D.getBoxMeshbyModelId(application.id);
      } else {
        parentMesh = applicationObject3D.getBoxMeshbyModelId(
          parentComponent.id
        );
      }

      if (
        (parentMesh instanceof ComponentMesh && parentMesh.opened) ||
        parentMesh instanceof FoundationMesh
      ) {
        let sourceEntity: Class | Package | null = null;
        let targetEntity: Class | Package | null = null;

        const sourceClazz = classCommunication.sourceClass;
        const targetClazz = classCommunication.targetClass;

        const sourceParent = sourceClazz.parent;
        const sourceParentMesh = applicationObject3D.getBoxMeshbyModelId(
          sourceParent.id
        );

        // Determine where the communication should begin
        // (clazz or component - based upon their visiblity)
        if (
          sourceParentMesh instanceof ComponentMesh &&
          sourceParentMesh.opened
        ) {
          sourceEntity = classCommunication.sourceClass;
        } else {
          sourceEntity =
            findFirstOpenOrLastClosedAncestorComponent(sourceParent);
        }

        const targetParent = targetClazz.parent;
        const targetParentMesh = applicationObject3D.getBoxMeshbyModelId(
          targetParent.id
        );

        // Determine where the communication should end
        // (clazz or component - based upon their visiblity)
        if (
          targetParentMesh instanceof ComponentMesh &&
          targetParentMesh.opened
        ) {
          targetEntity = classCommunication.targetClass;
        } else {
          targetEntity =
            findFirstOpenOrLastClosedAncestorComponent(targetParent);
        }

        const commLayout = new CommunicationLayout(classCommunication);
        layoutMap.set(classCommunication.id, commLayout);

        const sourceLayout = boxLayoutMap.get(sourceEntity.id);
        if (sourceLayout) {
          commLayout.startX = sourceLayout.positionX + sourceLayout.width / 2.0;
          commLayout.startY = sourceLayout.positionY;
          commLayout.startZ = sourceLayout.positionZ + sourceLayout.depth / 2.0;
        }

        const targetLayout = boxLayoutMap.get(targetEntity.id);
        if (targetLayout) {
          commLayout.endX = targetLayout.positionX + targetLayout.width / 2.0;
          // commLayout.endY = targetLayout.positionY + 0.05;
          commLayout.endY = targetLayout.positionY;
          commLayout.endZ = targetLayout.positionZ + targetLayout.depth / 2.0;
        }

        // Place recursive communication slightly above class
        if (sourceEntity.id === targetEntity.id) {
          commLayout.startY += 2.0;
          commLayout.endY += 2.0;
        }

        commLayout.lineThickness = calculateLineThickness(
          classCommunication,
          settings
        );
      }
    }
  }

  function layoutInAndOutCommunication(
    commu: ClassCommunication,
    internalClazz: Class,
    centerCommuIcon: THREE.Vector3
  ) {
    const communicationData = layoutMap.get(commu.id);
    if (!communicationData) {
      return;
    }

    communicationData.pointsFor3D = [];
    communicationData.pointsFor3D.push(centerCommuIcon);

    if (internalClazz !== null) {
      const end = new THREE.Vector3();

      const clazzBoxLayout = boxLayoutMap.get(internalClazz.id);
      if (clazzBoxLayout === undefined) {
        return;
      }

      const centerPoint = new THREE.Vector3(
        clazzBoxLayout.positionX + clazzBoxLayout.width / 2.0,
        clazzBoxLayout.positionY + clazzBoxLayout.height / 2.0,
        clazzBoxLayout.positionZ + clazzBoxLayout.depth / 2.0
      );

      end.x = clazzBoxLayout.positionX + clazzBoxLayout.width / 2.0;
      end.y = centerPoint.y;
      end.z = clazzBoxLayout.positionZ + clazzBoxLayout.depth / 2.0;
      communicationData.pointsFor3D.push(end);
    }
  }

  function layoutAggregatedCommunication(
    commu: ClassCommunication,
    app: Application
  ) {
    const externalPortsExtension = new THREE.Vector3(3.0, 3.5, 3.0);

    const foundationLayout = boxLayoutMap.get(app.id);

    if (!foundationLayout) {
      return;
    }

    const centerCommuIcon = new THREE.Vector3(
      foundationLayout.positionX +
        foundationLayout.width * 2.0 +
        externalPortsExtension.x * 4.0,
      foundationLayout.positionY -
        foundationLayout.height +
        externalPortsExtension.y,
      foundationLayout.positionZ +
        foundationLayout.depth * 2.0 -
        externalPortsExtension.z -
        12.0
    );

    layoutInAndOutCommunication(commu, commu.sourceClass, centerCommuIcon);
  }

  layoutEdges(settings);

  classCommunications.forEach((clazzcommunication) => {
    if (layoutMap.has(clazzcommunication.id)) {
      layoutAggregatedCommunication(clazzcommunication, application);
    }
  });

  return layoutMap;
}
