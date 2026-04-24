import AggregatedCommunication from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/aggregated-communication';
import {
  Application,
  TypeOfAnalysis,
} from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';

export default class ClazzCommuMeshDataModel {
  communication: AggregatedCommunication;

  id: string;

  name: string;

  originOfData: TypeOfAnalysis = TypeOfAnalysis.Dynamic;

  targetApplication?: Application;

  constructor(
    communication: AggregatedCommunication,
    id: string
  ) {
    this.communication = communication;

    this.id = id;
    this.name = id;
  }
}
