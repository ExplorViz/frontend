// import { tracked } from '@glimmer/tracking';
import { Application } from 'react-lib/src/utils/landscape-schemes/structure-data';
import ClassCommunication from 'react-lib/src/utils/landscape-schemes/dynamic/class-communication';
import {
  ApplicationMetrics,
  Metric,
} from 'react-lib/src/utils/metric-schemes/metric-data';
import { FlatData } from 'react-lib/src/utils/flat-data-schemes/flat-data';
import BoxLayout from 'react-lib/src/view-objects/layout-models/box-layout';

export default class ApplicationData {
  application: Application;
  k8sData: K8sData | null;

  boxLayoutMap: Map<string, BoxLayout>;

  flatData: FlatData;

  // @tracked
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

  getClassCount(packages = this.application.packages, count = 0) {
    let newCount = count;
    packages.forEach((appPackage) => {
      newCount += appPackage.classes.length;
      newCount += this.getClassCount(appPackage.subPackages);
    });

    return newCount;
  }
}
export interface K8sData {
  k8sNode: string;
  k8sNamespace: string;
  k8sDeployment: string;
  k8sPod: string;
}
