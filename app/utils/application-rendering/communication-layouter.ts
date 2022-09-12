import * as THREE from 'three';
import BoxLayout from 'explorviz-frontend/view-objects/layout-models/box-layout';
import ApplicationObject3D from 'explorviz-frontend/view-objects/3d/application/application-object-3d';
import ComponentMesh from '../../view-objects/3d/application/component-mesh';
import FoundationMesh from '../../view-objects/3d/application/foundation-mesh';
import CommunicationLayout from '../../view-objects/layout-models/communication-layout';
import { DrawableClassCommunication } from './class-communication-computer';
import { Application, Class, Package } from '../landscape-schemes/structure-data';

let minRequests = 0;
let maximumRequests = 0;

export function calculatePipeSize(drawableClassCommunications: DrawableClassCommunication[]) {
  /**
   * Retrieves all requests and pushes them to a list for further processing
   */
  function gatherRequestsIntoList() {
    const requestsList: number[] = [];

    // Generate a list with all requests
    drawableClassCommunications.forEach((clazzCommunication) => {
      if ((clazzCommunication.sourceClass !== clazzCommunication.targetClass)) {
        requestsList.push(clazzCommunication.totalRequests);
      }
    });

    return requestsList;
  }

  // Constant factors for rendering communication lines (pipes)
  const LINE_THICKNESS_FACTOR = 0.5;

  const requestsList = gatherRequestsIntoList();

  minRequests = Math.min(...requestsList);
  maximumRequests = Math.max(...requestsList);

  const pipeSizeMap = new Map<string, number>();
  drawableClassCommunications.forEach((clazzCommunication) => {
    // normalize request count to [0, 1] interval
    let range = maximumRequests - minRequests;
    let normalizedRequests = 1;
    if (range !== 0) {
      normalizedRequests = (clazzCommunication.totalRequests - minRequests) / range;
      // normalize request count to [0.2, 1] interval
      range = 1 - 0.3;
      normalizedRequests = normalizedRequests * range + 0.5;
    }

    // Apply line thickness depending on calculated request category
    pipeSizeMap.set(clazzCommunication.id, normalizedRequests * LINE_THICKNESS_FACTOR);
  });
  return pipeSizeMap;
}

// Communication Layouting //
export default function applyCommunicationLayout(applicationObject3D: ApplicationObject3D,
  boxLayoutMap: Map<string, BoxLayout>, drawableClassCommunications: DrawableClassCommunication[]) {
  const application = applicationObject3D.dataModel;

  const layoutMap: Map<string, CommunicationLayout> = new Map();
  // HELPER FUNCTIONS

  /**
   * Calculates the size of the pipes regarding the number of requests
   */
  function calculatePipeSizeFromQuantiles() {
    // Constant factors for rendering communication lines (pipes)
    const LINE_THICKNESS_FACTOR = 0.5;

    // const minRequests = Math.min(...requestsList);
    // const maximumRequests = Math.max(...requestsList);

    drawableClassCommunications.forEach((clazzCommunication) => {
      const maybeCommunicationLayout = layoutMap.get(clazzCommunication.id);

      if (maybeCommunicationLayout) {
        // normalize request count to [0, 1] interval
        let range = maximumRequests - minRequests;
        let normalizedRequests = 1;
        if (range !== 0) {
          normalizedRequests = (clazzCommunication.totalRequests - minRequests) / range;
          // normalize request count to [0.2, 1] interval
          range = 1 - 0.3;
          normalizedRequests = normalizedRequests * range + 0.5;
        }

        // Apply line thickness depending on calculated request category
        maybeCommunicationLayout.lineThickness = (normalizedRequests * LINE_THICKNESS_FACTOR);
      }
    });
  } // END calculatePipeSizeFromQuantiles

  /**
   * Returns the first parent component which is open
   * or - if it does not exist - the deepest closed component
   *
   * @param component Component for which an open parent shall be returned
   */
  function findFirstOpenOrLastClosedAncestorComponent(component: Package): Package {
    const parentComponent = component.parent;

    if (!parentComponent) return component;

    // Check open status in corresponding component mesh
    const parentMesh = applicationObject3D.getBoxMeshbyModelId(parentComponent.id);
    if (parentMesh instanceof ComponentMesh && parentMesh.opened) {
      return component;
    }

    // Recursive call
    return findFirstOpenOrLastClosedAncestorComponent(parentComponent);
  }

  function getParentComponentOfDrawableCommunication(communication: DrawableClassCommunication) {
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
    for (let i = 0; i < sourceClassComponents.length && i < targetClassComponents.length; i++) {
      if (sourceClassComponents[i] === targetClassComponents[i]) {
        commonComponent = sourceClassComponents[i];
      } else {
        break;
      }
    }

    return commonComponent;
  }

  /**
  * Calculates start and end positions for all drawable communications
  */
  function layoutEdges() {
    if (drawableClassCommunications.length === 0) {
      return;
    }
    for (let i = 0; i < drawableClassCommunications.length; i++) {
      const classCommunication: DrawableClassCommunication = drawableClassCommunications[i];

      const parentComponent = getParentComponentOfDrawableCommunication(classCommunication);

      let parentMesh;

      if (parentComponent === null) {
        // common ancestor must be the foundation
        parentMesh = applicationObject3D.getBoxMeshbyModelId(application.id);
      } else {
        parentMesh = applicationObject3D.getBoxMeshbyModelId(parentComponent.id);
      }

      if ((parentMesh instanceof ComponentMesh && parentMesh.opened)
        || parentMesh instanceof FoundationMesh) {
        let sourceEntity: Class | Package | null = null;
        let targetEntity: Class | Package | null = null;

        const sourceClazz = classCommunication.sourceClass;
        const targetClazz = classCommunication.targetClass;

        const sourceParent = sourceClazz.parent;
        const sourceParentMesh = applicationObject3D.getBoxMeshbyModelId(sourceParent.id);

        // Determine where the communication should begin
        // (clazz or component - based upon their visiblity)
        if (sourceParentMesh instanceof ComponentMesh && sourceParentMesh.opened) {
          sourceEntity = classCommunication.sourceClass;
        } else {
          sourceEntity = findFirstOpenOrLastClosedAncestorComponent(sourceParent);
        }

        const targetParent = targetClazz.parent;
        const targetParentMesh = applicationObject3D.getBoxMeshbyModelId(targetParent.id);

        // Determine where the communication should end
        // (clazz or component - based upon their visiblity)
        if (targetParentMesh instanceof ComponentMesh && targetParentMesh.opened) {
          targetEntity = classCommunication.targetClass;
        } else {
          targetEntity = findFirstOpenOrLastClosedAncestorComponent(targetParent);
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
      }
    }
    calculatePipeSizeFromQuantiles();
  }

  function layoutInAndOutCommunication(commu: DrawableClassCommunication,
    internalClazz: Class, centerCommuIcon: THREE.Vector3) {
    const communicationData = layoutMap.get(commu.id);
    if (!communicationData) {
      return;
    }

    communicationData.pointsFor3D = [];
    communicationData.pointsFor3D.push(centerCommuIcon);

    if (internalClazz !== null) {
      const end = new THREE.Vector3();

      const clazzBoxLayout = boxLayoutMap.get(internalClazz.id);
      if (clazzBoxLayout === undefined) { return; }

      const centerPoint = new THREE.Vector3(clazzBoxLayout.positionX
        + clazzBoxLayout.width / 2.0,
      clazzBoxLayout.positionY + clazzBoxLayout.height / 2.0,
      clazzBoxLayout.positionZ + clazzBoxLayout.depth / 2.0);

      end.x = clazzBoxLayout.positionX + clazzBoxLayout.width / 2.0;
      end.y = centerPoint.y;
      end.z = clazzBoxLayout.positionZ + clazzBoxLayout.depth / 2.0;
      communicationData.pointsFor3D.push(end);
    }
  }

  function layoutDrawableCommunication(commu: DrawableClassCommunication, app: Application) {
    const externalPortsExtension = new THREE.Vector3(3.0, 3.5, 3.0);

    const foundationLayout = boxLayoutMap.get(app.id);

    if (!foundationLayout) { return; }

    const centerCommuIcon = new THREE.Vector3(
      foundationLayout.positionX + foundationLayout.width * 2.0 + externalPortsExtension.x * 4.0,
      foundationLayout.positionY - foundationLayout.height + externalPortsExtension.y,
      foundationLayout.positionZ + foundationLayout.depth * 2.0 - externalPortsExtension.z - 12.0,
    );

    layoutInAndOutCommunication(commu, commu.sourceClass, centerCommuIcon);
  }

  layoutEdges();

  drawableClassCommunications.forEach((clazzcommunication) => {
    if (layoutMap.has(clazzcommunication.id)) {
      layoutDrawableCommunication(clazzcommunication, application);
    }
  });

  return layoutMap;
}
