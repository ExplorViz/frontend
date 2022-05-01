import { action } from '@ember/object';
import Evented from '@ember/object/evented';
import Service, { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import debugLogger from 'ember-debug-logger';
import LandscapeListener from 'explorviz-frontend/services/landscape-listener';
import ApplicationRepository from 'explorviz-frontend/services/repos/application-repository';
import AlertifyHandler from 'explorviz-frontend/utils/alertify-handler';
import ApplicationObject3D from 'explorviz-frontend/view-objects/3d/application/application-object-3d';
import revertKey from '../utils/heatmap-generator';
import { getDefaultGradient as getSimpleDefaultGradient } from '../utils/simple-heatmap';

export type Metric = {
  name: string;
  description: string;
  min: number,
  max: number,
  values: Map<string, number>
};

export class ApplicationHeatmapData {
  // applicationId: string,
  metrics: Metric[] = [];

  // @tracked
  latestClazzMetricScores: Metric[] = [];

  metricsArray: [Metric[]] = [[]];
  differenceMetricScores: Map<string, Metric[]> = new Map<string, Metric[]>();
  aggregatedMetricScores: Map<string, Metric> = new Map<string, Metric>();
}

type HeatmapMode = 'snapshotHeatmap' | 'aggregatedHeatmap' | 'windowedHeatmap';

export default class HeatmapConfiguration extends Service.extend(Evented) {

  @service('repos/application-repository')
  applicationRepo!: ApplicationRepository;

  // TODO remove
  @service('landscape-listener')
  landscapeListener!: LandscapeListener;

  @tracked
  heatmapActive = false;

  @tracked
  currentApplication: ApplicationObject3D | undefined | null;

  // Switch for the legend
  legendActive = true;

  // TODO what to do with this?
  largestValue = 0;

  windowSize: number = 9;

  // Switches and models used by config
  @tracked
  selectedMode: HeatmapMode = 'aggregatedHeatmap';

  @tracked
  selectedMetricName: string = '';

  @tracked
  currentApplicationHeatmapData?: ApplicationHeatmapData;

  useHelperLines = true;

  opacityValue = 0.03;

  heatmapRadius = 2;

  blurRadius = 0;

  showLegendValues = true;

  simpleHeatGradient = getSimpleDefaultGradient();

  debug = debugLogger();

  @action
  toggleHeatmap() {
    this.heatmapActive = !this.heatmapActive;
  }

  get latestClazzMetricScores() {
    return this.currentApplicationHeatmapData?.latestClazzMetricScores || [];
  }

  setActiveApplication(applicationObject3D: ApplicationObject3D) {
    this.currentApplication = applicationObject3D;
    this.updateActiveApplication(applicationObject3D);
  }

  updateActiveApplication(applicationObject3D: ApplicationObject3D) {
    if (!this.currentApplication) {
      this.currentApplication = applicationObject3D;
    }
    const applicationData = this.applicationRepo.getById(applicationObject3D.dataModel.id);
    if (applicationData && this.currentApplication == applicationObject3D) {
      this.currentApplicationHeatmapData = applicationData.heatmapData;
    }
  }

  get selectedMetric() {
    let chosenMetric = null;
    const applicationHeatmapData = this.currentApplicationHeatmapData;
    const latestClazzMetricScores = this.currentApplicationHeatmapData?.latestClazzMetricScores;
    if (!applicationHeatmapData || !latestClazzMetricScores) {
      AlertifyHandler.showAlertifyError('No heatmap found');
      return undefined;
    }

    switch (this.selectedMode) {
      case 'snapshotHeatmap':
        if (applicationHeatmapData.latestClazzMetricScores) {
          chosenMetric = applicationHeatmapData.latestClazzMetricScores
            .find((metric) => metric.name === this.selectedMetricName);
          if (chosenMetric) {
            return chosenMetric;
          }
        }
        break;
      case 'aggregatedHeatmap':
        if (applicationHeatmapData.aggregatedMetricScores) {
          chosenMetric = applicationHeatmapData.aggregatedMetricScores.get(this.selectedMetricName);
          if (chosenMetric) {
            return chosenMetric;
          }
        }
        break;
      case 'windowedHeatmap':
        if (applicationHeatmapData.differenceMetricScores) {
          chosenMetric = applicationHeatmapData.differenceMetricScores.get(this.selectedMetricName);
          if (chosenMetric && chosenMetric[chosenMetric.length - 1]) {
            return chosenMetric[chosenMetric.length - 1];
          }
        }
        break;
      default:
        break;
    }
    return latestClazzMetricScores.firstObject;
  }

  @action
  updateMetric(metric: Metric) {
    const metricName = metric.name;
    this.selectedMetricName = metricName;
  }

  switchMode() {
    switch (this.selectedMode) {
      case 'snapshotHeatmap':
        this.selectedMode = 'aggregatedHeatmap';
        break;
      case 'aggregatedHeatmap':
        this.selectedMode = 'windowedHeatmap';
        break;
      case 'windowedHeatmap':
        this.selectedMode = 'snapshotHeatmap';
        break;
      default:
        this.selectedMode = 'snapshotHeatmap';
        break;
    }
    // this.updateCurrentlyViewedMetric();
  }

  toggleLegend() {
    this.set('legendActive', !this.legendActive);
  }

  /**
   * Return a gradient where the '_' character in the keys is replaced with '.'.
   */
  getSimpleHeatGradient() {
    return revertKey(this.simpleHeatGradient);
  }

  /**
   * Reset the gradient to default values.
   */
  resetSimpleHeatGradient() {
    this.set('simpleHeatGradient', getSimpleDefaultGradient());
  }

  /**
   * Reset all class attribute values to null;
   */
  cleanup() {
    this.set('currentApplication', null);
    this.set('heatmapActive', false);
    this.set('largestValue', 0);
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    'heatmap-configuration': HeatmapConfiguration;
  }
}
