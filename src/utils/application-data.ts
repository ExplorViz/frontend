import {
  ApplicationHeatmapData,
  Metric,
} from '../heatmap/services/heatmap-configuration';
import { LayoutData } from '../services/application-renderer';
import { DrawableClassCommunication } from './application-rendering/class-communication-computer';
import { Application } from './landscape-schemes/structure-data';

export default class ApplicationData {
  application: Application;

  layoutData: Map<string, LayoutData>;

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

  updateApplication(
    newApplication: Application,
    layoutData: Map<string, LayoutData>
  ) {
    this.application = newApplication;
    this.layoutData = layoutData;
  }
}
