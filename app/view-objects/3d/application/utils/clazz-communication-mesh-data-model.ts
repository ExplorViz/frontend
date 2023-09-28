import AggregatedClassCommunication from 'explorviz-frontend/utils/landscape-schemes/dynamic/aggregated-class-communication';
import { Application } from 'explorviz-frontend/utils/landscape-schemes/structure-data';

// TODO might need to refactor as simple type

export default class ClazzCommuMeshDataModel {
  aggregatedClassCommunication: AggregatedClassCommunication;

  bidirectional: boolean;

  id: string;

  application: Application;

  targetApplication?: Application;

  constructor(
    application: Application,
    aggregatedClassCommunication: AggregatedClassCommunication,
    bidirectional: boolean,
    id: string
  ) {
    this.application = application;
    this.aggregatedClassCommunication = aggregatedClassCommunication;
    this.bidirectional = bidirectional;

    this.id = id;
  }
}
