import { tracked } from '@glimmer/tracking';
import { LayoutData } from 'explorviz-frontend/services/application-renderer';
import { Application } from 'some-react-lib/src/utils/landscape-schemes/structure-data';
import {
  ApplicationHeatmapData,
  Metric,
} from 'heatmap/services/heatmap-configuration';
import ClassCommunication from 'some-react-lib/src/utils/landscape-schemes/dynamic/class-communication';

export default class ApplicationData {
  application: Application;

  layoutData: Map<string, LayoutData>;

  flatData: Map<string, any>;

  @tracked
  heatmapData: ApplicationHeatmapData;

  classCommunications: ClassCommunication[] = [];

  constructor(
    application: Application,
    layoutData: Map<string, LayoutData>,
    flatData: Map<string, any>
  ) {
    this.application = application;
    this.layoutData = layoutData;
    this.flatData = flatData;
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
    flatData: Map<string, any>
  ) {
    this.application = newApplication;
    this.layoutData = layoutData;
    this.flatData = flatData;
  }
}
