import { action } from '@ember/object';
import Evented from '@ember/object/evented';
import Service, { inject as service } from '@ember/service';
import ApplicationObject3D from 'react-lib/src/view-objects/3d/application/application-object-3d';
import { Metric } from 'react-lib/src/utils/metric-schemes/metric-data';
import { useHeatmapConfigurationStore } from 'react-lib/src/stores/heatmap/heatmap-configuration';

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

  @action
  toggleShared() {
    useHeatmapConfigurationStore.getState().toggleShared();
  }

  @action
  setActive(isActive: boolean) {
    useHeatmapConfigurationStore.getState().setActive(isActive);
  }

  @action
  deactivate() {
    useHeatmapConfigurationStore.getState().deactivate();
  }

  @action
  activate() {
    useHeatmapConfigurationStore.getState().activate();
  }

  get latestClazzMetricScores() {
    return useHeatmapConfigurationStore.getState().getLatestClazzMetricScores();
  }

  setActiveApplication(applicationObject3D: ApplicationObject3D) {
    useHeatmapConfigurationStore
      .getState()
      .setActiveApplication(applicationObject3D);
  }

  updateActiveApplication(applicationObject3D: ApplicationObject3D) {
    useHeatmapConfigurationStore
      .getState()
      .updateActiveApplication(applicationObject3D);
  }

  get applicationMetricsForEncompassingApplication() {
    return useHeatmapConfigurationStore
      .getState()
      .getApplicationMetricsForEncompassingApplication();
  }

  get selectedMetric() {
    return useHeatmapConfigurationStore.getState().getSelectedMetric();
  }

  @action
  updateMetric(metric: Metric) {
    useHeatmapConfigurationStore.getState().updateMetric(metric);
  }

  switchMode() {
    useHeatmapConfigurationStore.getState().switchMode();
  }

  switchMetric() {
    useHeatmapConfigurationStore.getState().switchMetric();
  }

  toggleLegend() {
    useHeatmapConfigurationStore.getState().toggleLegend();
  }

  /**
   * Return a gradient where the '_' character in the keys is replaced with '.'.
   */
  getSimpleHeatGradient() {
    return useHeatmapConfigurationStore.getState().getSimpleHeatGradient();
  }

  /**
   * Reset the gradient to default values.
   */
  resetSimpleHeatGradient() {
    useHeatmapConfigurationStore.getState().resetSimpleHeatGradient();
  }

  /**
   * Reset all class attribute values to null;
   */
  cleanup() {
    useHeatmapConfigurationStore.getState().cleanup();
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    'heatmap/heatmap-configuration': HeatmapConfiguration;
  }
}
