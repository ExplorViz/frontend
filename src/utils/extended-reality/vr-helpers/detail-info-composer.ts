import { useApplicationRepositoryStore } from 'explorviz-frontend/src/stores/repos/application-repository';
import {
  getAllClassesInApplication,
  getAllPackagesInApplication,
} from 'explorviz-frontend/src/utils/application-helpers';
import {
  CLASS_COMMUNICATION_ENTITY_TYPE,
  CLASS_ENTITY_TYPE,
  COMPONENT_ENTITY_TYPE,
  EntityType,
} from 'explorviz-frontend/src/utils/collaboration/web-socket-messages/types/entity-type';
import AggregatedCommunication from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/aggregated-communication';
import { Package } from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import {
  getClassesInPackage,
  getSubPackagesOfPackage,
} from 'explorviz-frontend/src/utils/package-helpers';
import ClazzCommunicationMesh from 'explorviz-frontend/src/view-objects/3d/city/clazz-communication-mesh';
import { MethodMesh } from 'explorviz-frontend/src/view-objects/3d/city/method-mesh';
import * as THREE from 'three';

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

function composeClazzContent(clazzMesh: ClazzMesh) {
  const clazz = clazzMesh.dataModel;

  const application = clazzMesh.parent;
  if (!(application instanceof ApplicationObject3D)) {
    return null;
  }
  // TODO refactor, duplicated from clazz-popup
  const applicationMetricsForCurrentApplication = useApplicationRepositoryStore
    .getState()
    .getByAppId(application.getModelId())?.applicationMetrics;
  // const applicationMetricsForCurrentApplication = applicationRepo.getById(
  //   application.getModelId()
  // )?.applicationMetrics;

  const content: DetailedInfo = {
    title: trimString(clazz.name, 40),
    entries: [],
  };

  if (applicationMetricsForCurrentApplication) {
    const metrics =
      applicationMetricsForCurrentApplication.latestClazzMetricScores;
    metrics.forEach((metric) => {
      content.entries.push({
        key: metric.name,
        value: String(metric.values.get(clazzMesh.getModelId())),
      });
    });
  }
  return content;
}

function composeAggregatedAggregatedCommunicationContent(
  communicationMesh: ClazzCommunicationMesh
) {
  const communicationData = communicationMesh.dataModel;
  const communication = communicationData.communication;

  const title = 'Communication Information';
  const content: DetailedInfo = { title, entries: [] };

  if (communication instanceof AggregatedCommunication) {
    content.entries.push({
      key: 'Source:',
      value: communication.sourceEntity.name,
    });
    content.entries.push({
      key: 'Target:',
      value: communication.targetEntity.name,
    });
    content.entries.push({
      key: 'Requests:',
      value: communication.metrics.requestCount?.toString() || '0',
    });
  }

  return content;
}

// #endregion APPLICATION CONTENT COMPOSER

export default function composeContent(object: THREE.Object3D) {
  let content: DetailedInfo | null = null;

  // Meshes of Applications
  if (object instanceof ComponentMesh) {
    content = composeComponentContent(object);
  } else if (object instanceof ClazzMesh) {
    content = composeClazzContent(object);
  } else if (object instanceof ClazzCommunicationMesh) {
    content = composeAggregatedAggregatedCommunicationContent(object);
  } else if (object instanceof FoundationMesh) {
    content = composeFoundationContent(object);
  }

  return content;
}

export type EntityMesh =
  | ComponentMesh
  | MethodMesh
  | ClazzMesh
  | ClazzCommunicationMesh
  | FoundationMesh;

export function isEntityMesh(object: any): object is EntityMesh {
  return (
    object instanceof ComponentMesh ||
    object instanceof MethodMesh ||
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
  const communicationData = communicationMesh.dataModel;
  if (communicationData.communication instanceof AggregatedCommunication) {
    return communicationData.communication.sourceEntity.name;
  } else {
    return communicationData.communication.sourceEntity.name;
  }
}

export function getCommunicationTargetClass(
  communicationMesh: ClazzCommunicationMesh
) {
  const communicationData = communicationMesh.dataModel;
  if (communicationData.communication instanceof AggregatedCommunication) {
    return communicationData.communication.targetEntity.name;
  } else {
    return communicationData.communication.targetEntity.name;
  }
}

export function getCommunicationSourceAppId(
  communicationMesh: ClazzCommunicationMesh
) {
  const communicationData = communicationMesh.dataModel;
  if (communicationData.communication instanceof AggregatedCommunication) {
    return communicationData.communication.sourceEntity.parentCityId;
  } else {
    return communicationData.communication.sourceApp.id;
  }
}

export function getCommunicationTargetAppId(
  communicationMesh: ClazzCommunicationMesh
) {
  const communicationData = communicationMesh.dataModel;
  if (communicationData.communication instanceof AggregatedCommunication) {
    return communicationData.communication.targetEntity.parentCityId;
  } else {
    return communicationData.communication.targetApp.id;
  }
}

export function getCommunicationSourceClassId(
  communicationMesh: ClazzCommunicationMesh
) {
  const communicationData = communicationMesh.dataModel;
  return communicationData.communication.sourceEntity.id;
}

export function getCommunicationTargetClassId(
  communicationMesh: ClazzCommunicationMesh
) {
  const communicationData = communicationMesh.dataModel;
  return communicationData.communication.targetEntity.id;
}
