import Service, { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import ApplicationRenderer from 'explorviz-frontend/services/application-renderer';
import HeatmapConfiguration from 'heatmap/services/heatmap-configuration';

export default class ArSettings extends Service.extend({
  // anything which *must* be merged to prototype here
}) {
  @service('heatmap-configuration')
  heatmapConf!: HeatmapConfiguration;

  @service('application-renderer')
  private applicationRenderer!: ApplicationRenderer;

  @tracked
  landscapeOpacity: number;

  @tracked
  applicationOpacity: number;

  sidebarWidthInPercent: number | undefined;

  @tracked
  renderCommunication = true;

  @tracked
  zoomLevel = 3;

  @tracked
  stackPopups = true;

  constructor() {
    super(...arguments);

    this.landscapeOpacity = 0.9;
    this.applicationOpacity = 0.9;
  }

  setApplicationOpacity(opacity: number) {
    this.applicationOpacity = opacity;
    if (!this.heatmapConf.heatmapActive) {
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
    'ar-settings': ArSettings;
  }
}
