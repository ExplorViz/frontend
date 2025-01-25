import { action } from '@ember/object';
import Evented from '@ember/object/evented';
import Service, { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import debugLogger from 'ember-debug-logger';
import ApplicationObject3D from 'react-lib/src/view-objects/3d/application/application-object-3d';
import revertKey from 'react-lib/src/utils/heatmap/heatmap-generator';
import { getDefaultGradient as getSimpleDefaultGradient } from 'react-lib/src/utils/heatmap/simple-heatmap';
import { Metric } from 'react-lib/src/utils/metric-schemes/metric-data';
import { useHeatmapConfigurationStore } from 'react-lib/src/stores/heatmap/heatmap-configuration';
import { useApplicationRepositoryStore } from 'react-lib/src/stores/repos/application-repository';
import { useToastHandlerStore } from 'react-lib/src/stores/toast-handler';

export type HeatmapMode =
  | 'snapshotHeatmap'
  | 'aggregatedHeatmap'
  | 'windowedHeatmap';

export default class HeatmapConfiguration extends Service.extend(Evented) {
  // @service('repos/application-repository')
  // applicationRepo!: ApplicationRepository;

  // @tracked
  // heatmapActive = false;
  get heatmapActive(): boolean {
    return useHeatmapConfigurationStore.getState().heatmapActive;
  }

  set heatmapActive(value: boolean) {
    useHeatmapConfigurationStore.setState({ heatmapActive: value });
  }

  // @tracked
  // heatmapShared = false;
  get heatmapShared(): boolean {
    return useHeatmapConfigurationStore.getState().heatmapShared;
  }

  set heatmapShared(value: boolean) {
    useHeatmapConfigurationStore.setState({ heatmapShared: value });
  }

  // TODO migrate ApplicationObject3D first

  // @tracked
  // currentApplication: ApplicationObject3D | undefined | null;

  get currentApplication(): ApplicationObject3D | undefined | null {
    return useHeatmapConfigurationStore.getState().currentApplication;
  }

  set currentApplication(value: ApplicationObject3D | undefined | null) {
    useHeatmapConfigurationStore.setState({ currentApplication: value });
  }

  // // Switch for the legend
  // legendActive = true;
  get legendActive(): boolean {
    return useHeatmapConfigurationStore.getState().legendActive;
  }

  set legendActive(value: boolean) {
    useHeatmapConfigurationStore.setState({ legendActive: value });
  }

  // TODO this is never assigned another value, but used in calculation. What is it supposed to do?
  // largestValue = 0;
  get largestValue(): number {
    return useHeatmapConfigurationStore.getState().largestValue;
  }

  set largestValue(value: number) {
    useHeatmapConfigurationStore.setState({ largestValue: value });
  }

  // windowSize: number = 9;
  get windowSize(): number {
    return useHeatmapConfigurationStore.getState().windowSize;
  }

  set windowSize(value: number) {
    useHeatmapConfigurationStore.setState({ windowSize: value });
  }

  // Switches and models used by config
  // @tracked
  // selectedMode: HeatmapMode = 'snapshotHeatmap';
  get selectedMode(): HeatmapMode {
    return useHeatmapConfigurationStore.getState().selectedMode;
  }

  set selectedMode(value: HeatmapMode) {
    useHeatmapConfigurationStore.setState({ selectedMode: value });
  }

  // @tracked
  // selectedMetricName: string = 'Instance Count';
  get selectedMetricName(): string {
    return useHeatmapConfigurationStore.getState().selectedMetricName;
  }

  set selectedMetricName(value: string) {
    useHeatmapConfigurationStore.setState({ selectedMetricName: value });
  }

  // useHelperLines = true;
  get useHelperLines(): boolean {
    return useHeatmapConfigurationStore.getState().useHelperLines;
  }

  set useHelperLines(value: boolean) {
    useHeatmapConfigurationStore.setState({ useHelperLines: value });
  }

  // opacityValue = 0.03;
  get opacityValue(): number {
    return useHeatmapConfigurationStore.getState().opacityValue;
  }

  set opacityValue(value: number) {
    useHeatmapConfigurationStore.setState({ opacityValue: value });
  }

  // heatmapRadius = 2;
  get heatmapRadius(): number {
    return useHeatmapConfigurationStore.getState().heatmapRadius;
  }

  set heatmapRadius(value: number) {
    useHeatmapConfigurationStore.setState({ heatmapRadius: value });
  }

  // blurRadius = 0;
  get blurRadius(): number {
    return useHeatmapConfigurationStore.getState().blurRadius;
  }

  set blurRadius(value: number) {
    useHeatmapConfigurationStore.setState({ blurRadius: value });
  }

  // showLegendValues = true;
  get showLegendValues(): boolean {
    return useHeatmapConfigurationStore.getState().showLegendValues;
  }

  set showLegendValues(values: boolean) {
    useHeatmapConfigurationStore.setState({ showLegendValues: values });
  }

  // simpleHeatGradient = getSimpleDefaultGradient();
  get simpleHeatGradient(): any {
    return useHeatmapConfigurationStore.getState().simpleHeatGradient;
  }

  set simpleHeatGradient(value: any) {
    useHeatmapConfigurationStore.setState({ simpleHeatGradient: value });
  }

  debug = debugLogger();

  @action
  toggleShared() {
    this.heatmapShared = !this.heatmapShared;
  }

  @action
  setActive(isActive: boolean) {
    this.heatmapActive = isActive;
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
    const applicationData = useApplicationRepositoryStore
      .getState()
      .getById(this.currentApplication.getModelId());
    // const applicationData = this.applicationRepo.getById(
    //   this.currentApplication.getModelId()
    // );
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
      useToastHandlerStore.getState().showErrorToastMessage('No heatmap found');
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
    'heatmap/heatmap-configuration': HeatmapConfiguration;
  }
}
