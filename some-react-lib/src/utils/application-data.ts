/* import { LayoutData } from 'explorviz-frontend/services/application-renderer'; */
import { Application } from './landscape-schemes/structure-data';
/* import {
  ApplicationHeatmapData,
  Metric,
} from 'heatmap/services/heatmap-configuration'; */
import ClassCommunication from './landscape-schemes/dynamic/class-communication';

/* Interface duplicated from application-renderer service. Delete once it is migrated */
export type LayoutData = {
  height: number;
  width: number;
  depth: number;
  positionX: number;
  positionY: number;
  positionZ: number;
};

/* Interfaces duplicated from heatmap-configuration service. Delete once it is migrated */
export type Metric = {
  name: string;
  description: string;
  min: number;
  max: number;
  values: Map<string, number>;
};
export interface ApplicationHeatmapData {
  metrics: Metric[];
  latestClazzMetricScores: Metric[];
  metricsArray: [Metric[]];
  differenceMetricScores: Map<string, Metric[]>;
  aggregatedMetricScores: Map<string, Metric>;
}

export default class ApplicationData {
  application: Application;

  layoutData: Map<string, LayoutData>;

  flatData: Map<string, any>;

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
