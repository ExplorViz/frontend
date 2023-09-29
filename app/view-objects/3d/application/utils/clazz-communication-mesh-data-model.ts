import AggregatedClassCommunication from 'explorviz-frontend/utils/landscape-schemes/dynamic/aggregated-class-communication';
import { Application } from 'explorviz-frontend/utils/landscape-schemes/structure-data';

export default class ClazzCommuMeshDataModel {
  aggregatedClassCommunication: AggregatedClassCommunication;

  id: string;

  application: Application;

  targetApplication?: Application;

  constructor(
    application: Application,
    aggregatedClassCommunication: AggregatedClassCommunication,
    id: string
  ) {
    this.application = application;
    this.aggregatedClassCommunication = aggregatedClassCommunication;

    this.id = id;
  }
}
