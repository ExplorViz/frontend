import ClassCommunication from 'explorviz-frontend/utils/landscape-schemes/dynamic/class-communication';
import ComponentCommunication from 'explorviz-frontend/utils/landscape-schemes/dynamic/component-communication';
import { Application } from 'explorviz-frontend/utils/landscape-schemes/structure-data';

export default class ClazzCommuMeshDataModel {
  communication: ClassCommunication | ComponentCommunication;

  id: string;

  application: Application;

  targetApplication?: Application;

  constructor(
    application: Application,
    communication: ClassCommunication | ComponentCommunication,
    id: string
  ) {
    this.application = application;
    this.communication = communication;

    this.id = id;
  }
}
