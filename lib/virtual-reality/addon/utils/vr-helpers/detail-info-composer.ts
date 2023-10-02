import ApplicationRepository from 'explorviz-frontend/services/repos/application-repository';
import {
  getAllClassesInApplication,
  getAllPackagesInApplication,
} from 'explorviz-frontend/utils/application-helpers';
import { Package } from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import {
  getSubPackagesOfPackage,
  getClassesInPackage,
} from 'explorviz-frontend/utils/package-helpers';
import ApplicationObject3D from 'explorviz-frontend/view-objects/3d/application/application-object-3d';
import ClazzCommunicationMesh from 'explorviz-frontend/view-objects/3d/application/clazz-communication-mesh';
import ClazzMesh from 'explorviz-frontend/view-objects/3d/application/clazz-mesh';
import ComponentMesh from 'explorviz-frontend/view-objects/3d/application/component-mesh';
import FoundationMesh from 'explorviz-frontend/view-objects/3d/application/foundation-mesh';
import * as THREE from 'three';
import {
  CLASS_COMMUNICATION_ENTITY_TYPE,
  CLASS_ENTITY_TYPE,
  COMPONENT_ENTITY_TYPE,
  EntityType,
} from '../vr-message/util/entity_type';
import AggregatedClassCommunication from 'explorviz-frontend/utils/landscape-schemes/dynamic/aggregated-class-communication';

export type DetailedInfo = {
  title: string;
  entries: { key: string; value: string }[];
};

// #region HELPER

function countComponentElements(component: Package) {
  const classCount = getClassesInPackage(component).length;
  const packageCount = getSubPackagesOfPackage(component).length;

  return { classCount, packageCount };
}

function trimString(
  passedString: string | undefined,
  charLimit: number
): string {
  if (!passedString) {
    return '';
  }

  if (passedString.length <= charLimit) {
    return passedString;
  }

  if (charLimit < 5) {
    return passedString.slice(1, charLimit);
  }

  const numberDots = 3;

  const dividerPrefix = Math.round((charLimit - numberDots) / 2);
  const dividerSuffix = Math.floor((charLimit - numberDots) / 2);

  const prefix = passedString.slice(0, dividerPrefix);
  const suffix = passedString.slice(-dividerSuffix);
  return `${prefix}...${suffix}`;
}

// #endregion HELPER

// #region APPLICATION CONTENT COMPOSER

function composeComponentContent(componentMesh: ComponentMesh) {
  const component = componentMesh.dataModel;
  const { packageCount, classCount } = countComponentElements(component);

  const content: DetailedInfo = {
    title: trimString(component.name, 40),
    entries: [],
  };

  content.entries.push({
    key: 'Contained Packages: ',
    value: packageCount.toString(),
  });
  content.entries.push({
    key: 'Contained Classes: ',
    value: classCount.toString(),
  });

  return content;
}

function composeFoundationContent(componentMesh: FoundationMesh) {
  const component = componentMesh.dataModel;
  const classCount = getAllClassesInApplication(componentMesh.dataModel).length;
  const packageCount = getAllPackagesInApplication(
    componentMesh.dataModel
  ).length;

  const content: DetailedInfo = {
    title: trimString(component.name, 40),
    entries: [],
  };

  content.entries.push({
    key: 'Instance ID: ',
    value: component.instanceId,
  });
  content.entries.push({
    key: 'Language: ',
    value: component.language,
  });
  content.entries.push({
    key: 'Contained Packages: ',
    value: packageCount.toString(),
  });
  content.entries.push({
    key: 'Contained Classes: ',
    value: classCount.toString(),
  });

  return content;
}

function composeClazzContent(
  clazzMesh: ClazzMesh,
  applicationRepo: ApplicationRepository
) {
  const clazz = clazzMesh.dataModel;

  const application = clazzMesh.parent;
  if (!(application instanceof ApplicationObject3D)) {
    return null;
  }
  // TODO refactor, duplicated from clazz-popup
  const currentApplicationHeatmapData = applicationRepo.getById(
    application.getModelId()
  )?.heatmapData;

  const content: DetailedInfo = {
    title: trimString(clazz.name, 40),
    entries: [],
  };

  if (currentApplicationHeatmapData) {
    const metrics = currentApplicationHeatmapData.latestClazzMetricScores;
    metrics.forEach((metric) => {
      content.entries.push({
        key: metric.name,
        value: String(metric.values.get(clazzMesh.getModelId())),
      });
    });
  }
  return content;
}

function composeAggregatedClassCommunicationContent(
  communicationMesh: ClazzCommunicationMesh
) {
  const communicationData = communicationMesh.dataModel;
  const applicationId = communicationData.application.id;

  const title = 'Communication Information';

  const content: DetailedInfo = { title, entries: [] };

  // # of aggregated requests
  const aggregatedReqCount = communicationData.communication.totalRequests;

  if (communicationData.communication.methodCalls.length > 1) {
    content.entries.push({
      key: 'Aggregated request count:',
      value: `${aggregatedReqCount} ( 100% )`,
    });

    // # of unique method calls
    content.entries.push({
      key: 'Number of unique methods:',
      value: `${communicationData.communication.methodCalls.length}`,
    });

    content.entries.push({
      key: '---',
      value: '',
    });
  }

  // add information for each unique method call
  communicationData.communication.methodCalls.forEach(
    (aggregatedMethodCall, index) => {
      const commuHasExternalApp =
        applicationId !== aggregatedMethodCall.sourceApp?.id ||
        applicationId !== aggregatedMethodCall.targetApp?.id;

      // Call hierarchy
      // content.entries.push({
      //   key: 'Src / Tgt Class:',
      //   value: `${aggregatedMethodCall.sourceClass.name} -> ${
      //     aggregatedMethodCall.targetClass.name
      //    }`,
      // });

      if (commuHasExternalApp) {
        // App hierarchy
        content.entries.push({
          key: 'Src / Tgt App:',
          value: `${aggregatedMethodCall.sourceApp?.name} -> ${aggregatedMethodCall.targetApp?.name}`,
        });
      }

      // Name of called operation
      content.entries.push({
        key: 'Called Op.:',
        value: `${aggregatedMethodCall.operationName}`,
      });

      // Request count
      content.entries.push({
        key: 'Request count:',
        value: `${aggregatedMethodCall.totalRequests} ( ${Math.round(
          (aggregatedMethodCall.totalRequests / aggregatedReqCount) * 100
        )}% )`,
      });

      // Spacer
      if (index < communicationData.communication.methodCalls.length) {
        content.entries.push({
          key: '---',
          value: '',
        });
      }
    }
  );

  return content;
}

// #endregion APPLICATION CONTENT COMPOSER

export default function composeContent(
  object: THREE.Object3D,
  applicationRepo: ApplicationRepository
) {
  let content: DetailedInfo | null = null;

  // Meshes of Applications
  if (object instanceof ComponentMesh) {
    content = composeComponentContent(object);
  } else if (object instanceof ClazzMesh) {
    content = composeClazzContent(object, applicationRepo);
  } else if (object instanceof ClazzCommunicationMesh) {
    content = composeAggregatedClassCommunicationContent(object);
  } else if (object instanceof FoundationMesh) {
    content = composeFoundationContent(object);
  }

  return content;
}

export type EntityMesh =
  | ComponentMesh
  | ClazzMesh
  | ClazzCommunicationMesh
  | FoundationMesh;

export function isEntityMesh(object: any): object is EntityMesh {
  return (
    object instanceof ComponentMesh ||
    object instanceof ClazzMesh ||
    object instanceof ClazzCommunicationMesh ||
    object instanceof FoundationMesh
  );
}

export function getIdOfEntity(entity: EntityMesh): string {
  const model = entity.dataModel;
  return model.id;
}

export function getTypeOfEntity(entity: EntityMesh): EntityType {
  if (entity instanceof ComponentMesh) {
    return COMPONENT_ENTITY_TYPE;
  }
  if (entity instanceof ClazzMesh) {
    return CLASS_ENTITY_TYPE;
  }
  return CLASS_COMMUNICATION_ENTITY_TYPE;
}

export function getCommunicationSourceClass(
  communicationMesh: ClazzCommunicationMesh
) {
  // TODO: Take component communication into account
  const communicationData = communicationMesh.dataModel;
  if (communicationData.communication instanceof AggregatedClassCommunication) {
    return communicationData.communication.sourceClass.name;
  } else {
    return 'Composed Communication';
  }
}

export function getCommunicationTargetClass(
  communicationMesh: ClazzCommunicationMesh
) {
  const communicationData = communicationMesh.dataModel;
  if (communicationData.communication instanceof AggregatedClassCommunication) {
    return communicationData.communication.targetClass.name;
  } else {
    return 'Composed Communication';
  }
}

export function getCommunicationSourceAppId(
  communicationMesh: ClazzCommunicationMesh
) {
  const communicationData = communicationMesh.dataModel;
  return communicationData.communication.sourceApp.id;
}

export function getCommunicationTargetAppId(
  communicationMesh: ClazzCommunicationMesh
) {
  const communicationData = communicationMesh.dataModel;
  return communicationData.communication.targetApp.id;
}

export function getCommunicationSourceClassId(
  communicationMesh: ClazzCommunicationMesh
) {
  const communicationData = communicationMesh.dataModel;
  if (communicationData.communication instanceof AggregatedClassCommunication) {
    return communicationData.communication.sourceClass.id;
  } else {
    return 'Composed Communication';
  }
}

export function getCommunicationTargetClassId(
  communicationMesh: ClazzCommunicationMesh
) {
  const communicationData = communicationMesh.dataModel;
  if (communicationData.communication instanceof AggregatedClassCommunication) {
    return communicationData.communication.targetClass.id;
  } else {
    return 'Composed Communication';
  }
}
