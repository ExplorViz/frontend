import { tracked } from '@glimmer/tracking';
import { LayoutData } from 'explorviz-frontend/services/application-renderer';
import { DrawableClassCommunication } from 'explorviz-frontend/utils/application-rendering/class-communication-computer';
import { Application } from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import { ApplicationHeatmapData, Metric } from 'heatmap/services/heatmap-configuration';

export default class ApplicationData {
  application: Application;

  layoutData: Map<string, LayoutData>;

  @tracked
  heatmapData: ApplicationHeatmapData;

  drawableClassCommunications: DrawableClassCommunication[] = [];

  constructor(application: Application, layoutData: Map<string, LayoutData>) {
    this.application = application;
    this.layoutData = layoutData;
    this.heatmapData = {
      metrics: [],
      latestClazzMetricScores: [],
      metricsArray: [[]],
      differenceMetricScores: new Map<string, Metric[]>(),
      aggregatedMetricScores: new Map<string, Metric>(),
    };
  }

  updateApplication(newApplication: Application, layoutData: Map<string, LayoutData>) {
    this.application = newApplication;
    this.layoutData = layoutData;
  }
}
