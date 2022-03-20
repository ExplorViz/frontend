import Service, { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import LandscapeRenderer from 'explorviz-frontend/services/landscape-renderer';
import VrApplicationRenderer from 'explorviz-frontend/services/vr-application-renderer';
import HeatmapConfiguration from 'heatmap/services/heatmap-configuration';

export default class ArSettings extends Service.extend({
  // anything which *must* be merged to prototype here
}) {
  @service('heatmap-configuration')
  heatmapConf!: HeatmapConfiguration;

  @service('vr-application-renderer')
  private vrApplicationRenderer!: VrApplicationRenderer;

  @service('landscape-renderer')
  private landscapeRenderer!: LandscapeRenderer;

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
  stackPopups = false;

  constructor() {
    super(...arguments);

    this.landscapeOpacity = 0.9;
    this.applicationOpacity = 0.9;
  }

  setLandscapeOpacity(opacity: number) {
    this.landscapeOpacity = opacity;
    this.updateLandscapeOpacity();
  }

  updateLandscapeOpacity() {
    this.landscapeRenderer.landscapeObject3D.setOpacity(this.landscapeOpacity);
  }

  setApplicationOpacity(opacity: number) {
    this.applicationOpacity = opacity;
    if (!this.heatmapConf.heatmapActive) {
      this.updateApplicationOpacity();
    }
  }

  updateApplicationOpacity() {
    this.vrApplicationRenderer.getOpenApplications().forEach((applicationObject3D) => {
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
