import Service, { inject as service } from '@ember/service';
import ApplicationRenderer from 'explorviz-frontend/services/application-renderer';
import { useARSettingsStore } from 'react-lib/src/stores/extended-reality/ar-settings';
import { useHeatmapConfigurationStore } from 'react-lib/src/stores/heatmap/heatmap-configuration';

export default class ArSettings extends Service.extend({
  // anything which *must* be merged to prototype here
}) {

  @service('application-renderer')
  private applicationRenderer!: ApplicationRenderer;

  // @tracked
  // landscapeOpacity: number;
  get landscapeOpacity(): number {
    return useARSettingsStore.getState().landscapeOpacity;
  }

  set landscapeOpacity(value: number) {
    useARSettingsStore.setState({ landscapeOpacity: value });
  }

  // @tracked
  // applicationOpacity: number;
  get applicationOpacity(): number {
    return useARSettingsStore.getState().applicationOpacity;
  }

  set applicationOpacity(value: number) {
    useARSettingsStore.setState({ applicationOpacity: value });
  }

  // sidebarWidthInPercent: number | undefined;
  get sidebarWidthInPercent(): number | undefined {
    return useARSettingsStore.getState().sidebarWidthInPercent;
  }

  set sidebarWidthInPercent(value: number | undefined) {
    useARSettingsStore.setState({ sidebarWidthInPercent: value });
  }

  // @tracked
  // renderCommunication = true;
  get renderCommunication(): boolean {
    return useARSettingsStore.getState().renderCommunication;
  }

  set renderCommunication(value: boolean) {
    useARSettingsStore.setState({ renderCommunication: value });
  }

  // @tracked
  // zoomLevel = 3;
  get zoomLevel(): number {
    return useARSettingsStore.getState().zoomLevel;
  }

  set zoomLevel(value: number) {
    useARSettingsStore.setState({ zoomLevel: value });
  }

  // @tracked
  // stackPopups = true;
  get stackPopups(): boolean {
    return useARSettingsStore.getState().stackPopups;
  }

  set stackPopups(value: boolean) {
    useARSettingsStore.setState({ stackPopups: value });
  }

  constructor() {
    super(...arguments);

    this.landscapeOpacity = 0.9;
    this.applicationOpacity = 0.9;
  }

  setApplicationOpacity(opacity: number) {
    this.applicationOpacity = opacity;
    if (!useHeatmapConfigurationStore.getState().heatmapActive) {
      this.updateApplicationOpacity();
    }
  }

  updateApplicationOpacity() {
    this.applicationRenderer
      .getOpenApplications()
      .forEach((applicationObject3D) => {
        applicationObject3D.setOpacity(this.applicationOpacity);
      });
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    'extended-reality/ar-settings': ArSettings;
  }
}
