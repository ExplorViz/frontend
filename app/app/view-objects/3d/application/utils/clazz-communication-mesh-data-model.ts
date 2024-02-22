import ClassCommunication from 'some-react-lib/src/utils/landscape-schemes/dynamic/class-communication';
import ComponentCommunication from 'some-react-lib/src/utils/landscape-schemes/dynamic/component-communication';
import { Application } from 'some-react-lib/src/utils/landscape-schemes/structure-data';

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
