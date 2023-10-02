import AggregatedClassCommunication from 'explorviz-frontend/utils/landscape-schemes/dynamic/aggregated-class-communication';
import PackageCommunication from 'explorviz-frontend/utils/landscape-schemes/dynamic/package-communication';
import { Application } from 'explorviz-frontend/utils/landscape-schemes/structure-data';

export default class ClazzCommuMeshDataModel {
  communication: AggregatedClassCommunication | PackageCommunication;

  id: string;

  application: Application;

  targetApplication?: Application;

  constructor(
    application: Application,
    communication: AggregatedClassCommunication | PackageCommunication,
    id: string
  ) {
    this.application = application;
    this.communication = communication;

    this.id = id;
  }
}
