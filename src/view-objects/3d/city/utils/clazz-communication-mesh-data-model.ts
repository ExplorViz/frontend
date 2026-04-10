import ClassCommunication from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/class-communication';
import ComponentCommunication from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/component-communication';
import {
  Application,
  TypeOfAnalysis,
} from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';

export default class ClazzCommuMeshDataModel {
  communication: ClassCommunication | ComponentCommunication;

  id: string;

  name: string;

  originOfData: TypeOfAnalysis = TypeOfAnalysis.Dynamic;

  targetApplication?: Application;

  constructor(
    communication: ClassCommunication | ComponentCommunication,
    id: string
  ) {
    this.communication = communication;

    this.id = id;
    this.name = id;
  }
}
