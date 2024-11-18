import { action } from '@ember/object';
import Evented from '@ember/object/evented';
import Service, { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import debugLogger from 'ember-debug-logger';
import ApplicationRepository from 'explorviz-frontend/services/repos/application-repository';
import ToastHandlerService from 'explorviz-frontend/services/toast-handler';
import ApplicationObject3D from 'explorviz-frontend/view-objects/3d/application/application-object-3d';
import revertKey from '../utils/heatmap-generator';
import { getDefaultGradient as getSimpleDefaultGradient } from '../utils/simple-heatmap';

export type HeatmapMode =
  | 'snapshotHeatmap'
  | 'aggregatedHeatmap'
  | 'windowedHeatmap';

export default class HeatmapConfiguration extends Service.extend(Evented) {
  @service('repos/application-repository')
  applicationRepo!: ApplicationRepository;

  @service('toast-handler')
  toastHandlerService!: ToastHandlerService;

  @tracked
  heatmapActive = false;

  @tracked
  heatmapShared = false;

  @tracked
  currentApplication: ApplicationObject3D | undefined | null;

  // Switch for the legend
  legendActive = true;

  // TODO this is never assigned another value, but used in calculation. What is it supposed to do?
  largestValue = 0;

  windowSize: number = 9;

  // Switches and models used by config
  @tracked
  selectedMode: HeatmapMode = 'snapshotHeatmap';

  @tracked
  selectedMetricName: string = 'Instance Count';

  useHelperLines = true;

  opacityValue = 0.03;

  heatmapRadius = 2;

  blurRadius = 0;

  showLegendValues = true;

  simpleHeatGradient = getSimpleDefaultGradient();

  debug = debugLogger();

  @action
  toggleShared() {
    this.heatmapShared = !this.heatmapShared;
  }

  @action
  toggleHeatmap() {
    this.heatmapActive = !this.heatmapActive;
  }

  @action
  deactivate() {
    this.heatmapActive = false;
    this.currentApplication = null;
  }

  @action
  activate() {
    this.heatmapActive = true;
  }

  get latestClazzMetricScores() {
    return (
      this.applicationMetricsForEncompassingApplication
        ?.latestClazzMetricScores || []
    );
  }

  setActiveApplication(applicationObject3D: ApplicationObject3D) {
    this.currentApplication = applicationObject3D;
    this.updateActiveApplication(applicationObject3D);
  }

  updateActiveApplication(applicationObject3D: ApplicationObject3D) {
    if (
      !this.currentApplication ||
      this.currentApplication === applicationObject3D
    ) {
      this.debug('Ayy?');
      this.currentApplication = applicationObject3D;
    }
  }

  get applicationMetricsForEncompassingApplication() {
    if (!this.currentApplication) {
      return undefined;
    }
    const applicationData = this.applicationRepo.getById(
      this.currentApplication.getModelId()
    );
    return applicationData?.applicationMetrics;
  }

  get selectedMetric() {
    if (!this.heatmapActive || !this.currentApplication) {
      return undefined;
    }
    let chosenMetric = null;
    const applicationMetricsForCurrentApplication =
      this.applicationMetricsForEncompassingApplication;
    const latestClazzMetricScores =
      this.applicationMetricsForEncompassingApplication
        ?.latestClazzMetricScores;
    if (!applicationMetricsForCurrentApplication || !latestClazzMetricScores) {
      this.toastHandlerService.showErrorToastMessage('No heatmap found');
      return undefined;
    }

    switch (this.selectedMode) {
      case 'snapshotHeatmap':
        if (applicationMetricsForCurrentApplication.latestClazzMetricScores) {
          chosenMetric =
            applicationMetricsForCurrentApplication.latestClazzMetricScores.find(
              (metric) => metric.name === this.selectedMetricName
            );
          if (chosenMetric) {
            return chosenMetric;
          }
        }
        break;
      case 'aggregatedHeatmap':
        if (applicationMetricsForCurrentApplication.aggregatedMetricScores) {
          chosenMetric =
            applicationMetricsForCurrentApplication.aggregatedMetricScores.get(
              this.selectedMetricName
            );
          if (chosenMetric) {
            return chosenMetric;
          }
        }
        break;
      case 'windowedHeatmap':
        if (applicationMetricsForCurrentApplication.differenceMetricScores) {
          chosenMetric =
            applicationMetricsForCurrentApplication.differenceMetricScores.get(
              this.selectedMetricName
            );
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
  }

  switchMetric() {
    const numOfMetrics = this.latestClazzMetricScores.length;
    if (numOfMetrics > 0) {
      const index = this.latestClazzMetricScores.findIndex(
        (metric) => metric.name === this.selectedMetricName
      );
      this.selectedMetricName =
        this.latestClazzMetricScores[(index + 1) % numOfMetrics].name;
    }
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
