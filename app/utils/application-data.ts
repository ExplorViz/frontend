import type { LayoutData } from 'explorviz-frontend/services/application-renderer';
import type { DrawableClassCommunication } from 'explorviz-frontend/utils/application-rendering/class-communication-computer';
import type { Application } from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import type { ApplicationHeatmapData } from 'heatmap/services/heatmap-configuration';
import type { WorkerApplicationData } from 'workers/landscape-data-worker/LandscapeDataContext';

export default class ApplicationData {
  application: Application;

  layoutData: Map<string, LayoutData>;

  flatData: Map<string, any>;

  heatmapData: ApplicationHeatmapData;

  drawableClassCommunications: DrawableClassCommunication[] = [];

  constructor(application: Application, data: WorkerApplicationData) {
    this.application = application;
    this.layoutData = data.layout;
    this.flatData = data.flatData;
    this.heatmapData = data.heatmap;
  }

  updateApplication(newApplication: Application, data: WorkerApplicationData) {
    this.application = newApplication;
    this.layoutData = data.layout;
    this.flatData = data.flatData;
    this.heatmapData = data.heatmap;
  }
}
