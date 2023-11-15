import { tracked } from '@glimmer/tracking';
import { LayoutData } from 'explorviz-frontend/services/application-renderer';
import { Application } from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import {
  ApplicationHeatmapData,
  Metric,
} from 'heatmap/services/heatmap-configuration';
import ClassCommunication from './landscape-schemes/dynamic/class-communication';

export default class ApplicationData {
  application: Application;

  layoutData: Map<string, LayoutData>;

  flatData: Map<string, any>;

  //inheritanceData: Map<string, string>;

  @tracked
  heatmapData: ApplicationHeatmapData;

  classCommunications: ClassCommunication[] = [];

  constructor(
    application: Application,
    layoutData: Map<string, LayoutData>,
    flatData: Map<string, any>,
    //inheritanceData: Map<string,string>
  ) {
    this.application = application;
    this.layoutData = layoutData;
    this.flatData = flatData;
    //this.inheritanceData = inheritanceData;
    this.heatmapData = {
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
    flatData: Map<string, any>,
    //inheritanceData: Map<string,string>
  ) {
    this.application = newApplication;
    this.layoutData = layoutData;
    this.flatData = flatData;
    //this.inheritanceData = inheritanceData;
  }
}
