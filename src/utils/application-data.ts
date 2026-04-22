// import { tracked } from '@glimmer/tracking';
import ClassCommunication from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/class-communication';
import {
  Application,
  Class,
  Package,
} from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import BoxLayout from 'explorviz-frontend/src/utils/layout/box-layout';
import {
  ApplicationMetrics,
  Metric,
} from 'explorviz-frontend/src/utils/metric-schemes/metric-data';

export default class ApplicationData {
  application: Application;

  boxLayoutMap: Map<string, BoxLayout>;

  // flatData: FlatData;

  // @tracked
  applicationMetrics: ApplicationMetrics;

  classCommunications: ClassCommunication[] = [];

  constructor(
    application: Application,
    boxLayoutMap: Map<string, BoxLayout>,
    // flatData: FlatData
  ) {
    this.application = application;
    this.boxLayoutMap = boxLayoutMap;
    // this.flatData = flatData;
    this.applicationMetrics = {
      metrics: [],
      latestClazzMetricScores: [],
      metricsArray: [[]],
      differenceMetricScores: new Map<string, Metric[]>(),
      aggregatedMetricScores: new Map<string, Metric>(),
    };
  }

  updateApplication(
    newApplication: Application,
    boxLayoutMap: Map<string, BoxLayout>,
    // flatData: FlatData
  ) {
    this.application = newApplication;
    this.boxLayoutMap = boxLayoutMap;
    // this.flatData = flatData;
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

  getClasses(): Class[] {
    let classes: Class[] = [];

    // Add classes that are directly attached to the application (flat structure)
    if (this.application.classes) {
      classes = classes.concat(this.application.classes);
    }

    const collectClasses = (packages: Package[]) => {
      packages.forEach((appPackage) => {
        classes = classes.concat(appPackage.classes);
        collectClasses(appPackage.subPackages);
      });
    };

    collectClasses(this.application.packages);

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
