import { tracked } from '@glimmer/tracking';
import { LayoutData } from 'explorviz-frontend/services/application-renderer';
import { Application } from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import ClassCommunication from './landscape-schemes/dynamic/class-communication';
import { ApplicationMetrics, Metric } from './metric-schemes/metric-data';
import { FlatData } from './flat-data-schemes/flat-data';

export default class ApplicationData {
  application: Application;

  layoutData: Map<string, LayoutData>;

  flatData: FlatData;

  @tracked
  applicationMetrics: ApplicationMetrics;

  classCommunications: ClassCommunication[] = [];

  constructor(
    application: Application,
    layoutData: Map<string, LayoutData>,
    flatData: FlatData
  ) {
    this.application = application;
    this.layoutData = layoutData;
    this.flatData = flatData;
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
    layoutData: Map<string, LayoutData>,
    flatData: FlatData
  ) {
    this.application = newApplication;
    this.layoutData = layoutData;
    this.flatData = flatData;
  }

  getId() {
    return this.application.id;
  }
}
