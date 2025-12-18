// import { tracked } from '@glimmer/tracking';
import { FlatData } from 'explorviz-frontend/src/utils/flat-data-schemes/flat-data';
import ClassCommunication from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/class-communication';
import {
  Application,
  Class,
  Package,
} from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import {
  ApplicationMetrics,
  Metric,
} from 'explorviz-frontend/src/utils/metric-schemes/metric-data';
import BoxLayout from 'explorviz-frontend/src/view-objects/layout-models/box-layout';

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

  getPackages(packages = this.application.packages) {
    let newPackages: Package[] = [];
    packages.forEach((appPackage) => {
      newPackages.push(appPackage);
      newPackages = newPackages.concat(
        this.getPackages(appPackage.subPackages)
      );
    });

    return newPackages;
  }

  getClasses(
    packages = this.application.packages,
    classes: Class[] = []
  ): Class[] {
    packages.forEach((appPackage) => {
      classes = classes.concat(appPackage.classes);
      classes = this.getClasses(appPackage.subPackages, classes);
    });

    return classes;
  }

  containsModelId(modelId: string) {
    return (
      this.getId() === modelId ||
      this.getPackages().some((p) => p.id === modelId) ||
      this.getClasses().some((c) => c.id === modelId)
    );
  }
}
export interface K8sData {
  k8sNode: string;
  k8sNamespace: string;
  k8sDeployment: string;
  k8sPod: string;
}
