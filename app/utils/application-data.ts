import { tracked } from '@glimmer/tracking';
import { Application } from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import ClassCommunication from './landscape-schemes/dynamic/class-communication';
import { ApplicationMetrics, Metric } from './metric-schemes/metric-data';
import { FlatData } from './flat-data-schemes/flat-data';
import BoxLayout from 'explorviz-frontend/view-objects/layout-models/box-layout';

export default class ApplicationData {
  application: Application;
  k8sData: K8sData | null;

  boxLayoutMap: Map<string, BoxLayout>;

  flatData: FlatData;

  @tracked
  applicationMetrics: ApplicationMetrics;

  classCommunications: ClassCommunication[] = [];

  constructor(
    application: Application,
    boxLayoutMap: Map<string, BoxLayout>,
    flatData: FlatData,
    k8sData: K8sData | null
  ) {
    this.application = application;
    this.boxLayoutMap = boxLayoutMap;
    this.flatData = flatData;
    this.applicationMetrics = {
      metrics: [],
      latestClazzMetricScores: [],
      metricsArray: [[]],
      differenceMetricScores: new Map<string, Metric[]>(),
      aggregatedMetricScores: new Map<string, Metric>(),
    };
    this.k8sData = k8sData;
  }

  updateApplication(
    newApplication: Application,
    boxLayoutMap: Map<string, BoxLayout>,
    flatData: FlatData
  ) {
    this.application = newApplication;
    this.boxLayoutMap = boxLayoutMap;
    this.flatData = flatData;
  }

  getId() {
    return this.application.id;
  }
}
export interface K8sData {
  k8sNode: string;
  k8sNamespace: string;
  k8sDeployment: string;
  k8sPod: string;
}
