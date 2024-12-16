import ClassCommunication from 'react-lib/src/utils/landscape-schemes/dynamic/class-communication';
import ComponentCommunication from 'react-lib/src/utils/landscape-schemes/dynamic/component-communication';
import { Application } from 'react-lib/src/utils/landscape-schemes/structure-data';

export default class ClazzCommuMeshDataModel {
  communication: ClassCommunication | ComponentCommunication;

  id: string;

  application: Application;

  originOfData: string = 'dynamic';

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
