import AggregatedClassCommunication from 'explorviz-frontend/utils/landscape-schemes/dynamic/aggregated-class-communication';
import ComponentCommunication from 'explorviz-frontend/utils/landscape-schemes/dynamic/component-communication';
import { Application } from 'explorviz-frontend/utils/landscape-schemes/structure-data';

export default class ClazzCommuMeshDataModel {
  communication: AggregatedClassCommunication | ComponentCommunication;

  id: string;

  application: Application;

  targetApplication?: Application;

  constructor(
    application: Application,
    communication: AggregatedClassCommunication | ComponentCommunication,
    id: string
  ) {
    this.application = application;
    this.communication = communication;

    this.id = id;
  }
}
