import ApplicationRepository from '../../services/repos/application-repository';
import AlertifyHandler from '../../utils/alertify-handler';
import ApplicationObject3D from '../../view-objects/3d/application/application-object-3d';
import revertKey from '../utils/heatmap-generator';
import { getDefaultGradient as getSimpleDefaultGradient } from '../utils/simple-heatmap';

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

export type HeatmapMode =
  | 'snapshotHeatmap'
  | 'aggregatedHeatmap'
  | 'windowedHeatmap';

export default class HeatmapConfiguration {
  applicationRepo!: ApplicationRepository;

  heatmapActive = false;

  heatmapShared = false;

  currentApplication: ApplicationObject3D | undefined | null;

  // Switch for the legend
  legendActive = true;

  // TODO this is never assigned another value, but used in calculation. What is it supposed to do?
  largestValue = 0;

  windowSize: number = 9;

  // Switches and models used by config
  selectedMode: HeatmapMode = 'snapshotHeatmap';

  selectedMetricName: string = 'Instance Count';

  useHelperLines = true;

  opacityValue = 0.03;

  heatmapRadius = 2;

  blurRadius = 0;

  showLegendValues = true;

  simpleHeatGradient = getSimpleDefaultGradient();

  toggleShared() {
    this.heatmapShared = !this.heatmapShared;
  }

  toggleHeatmap() {
    this.heatmapActive = !this.heatmapActive;
  }

  deactivate() {
    this.heatmapActive = false;
    this.currentApplication = null;
  }

  activate() {
    this.heatmapActive = true;
  }

  get latestClazzMetricScores() {
    return this.currentApplicationHeatmapData?.latestClazzMetricScores || [];
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
      this.currentApplication = applicationObject3D;
    }
  }

  get currentApplicationHeatmapData() {
    if (!this.currentApplication) {
      return undefined;
    }
    const applicationData = this.applicationRepo.getById(
      this.currentApplication.dataModel.id
    );
    return applicationData?.heatmapData;
  }

  get selectedMetric() {
    if (!this.heatmapActive || !this.currentApplication) {
      return undefined;
    }
    let chosenMetric = null;
    const applicationHeatmapData = this.currentApplicationHeatmapData;
    const latestClazzMetricScores =
      this.currentApplicationHeatmapData?.latestClazzMetricScores;
    if (!applicationHeatmapData || !latestClazzMetricScores) {
      AlertifyHandler.showAlertifyError('No heatmap found');
      return undefined;
    }

    switch (this.selectedMode) {
      case 'snapshotHeatmap':
        if (applicationHeatmapData.latestClazzMetricScores) {
          chosenMetric = applicationHeatmapData.latestClazzMetricScores.find(
            (metric: any) => metric.name === this.selectedMetricName
          );
          if (chosenMetric) {
            return chosenMetric;
          }
        }
        break;
      case 'aggregatedHeatmap':
        if (applicationHeatmapData.aggregatedMetricScores) {
          chosenMetric = applicationHeatmapData.aggregatedMetricScores.get(
            this.selectedMetricName
          );
          if (chosenMetric) {
            return chosenMetric;
          }
        }
        break;
      case 'windowedHeatmap':
        if (applicationHeatmapData.differenceMetricScores) {
          chosenMetric = applicationHeatmapData.differenceMetricScores.get(
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
    return latestClazzMetricScores.at(0);
  }

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
        (metric: any) => metric.name === this.selectedMetricName
      );
      this.selectedMetricName =
        this.latestClazzMetricScores[(index + 1) % numOfMetrics].name;
    }
  }

  toggleLegend() {
    this.legendActive = !this.legendActive;
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
    this.simpleHeatGradient = getSimpleDefaultGradient();
  }

  /**
   * Reset all class attribute values to null;
   */
  cleanup() {
    this.currentApplication = null;
    this.heatmapActive = false;
    this.largestValue = 0;
  }
}
