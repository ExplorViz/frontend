import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { DrawableClassCommunication } from 'explorviz-frontend/utils/application-rendering/class-communication-computer';
import { Application } from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import { ApplicationHeatmapData } from 'heatmap/services/heatmap-configuration';
import { AddApplicationArgs, LayoutData } from '../application-renderer';

export default class ApplicationRepository extends Service.extend({
  // anything which *must* be merged to prototype here
}) {
  @tracked
  applications: Map<string, ApplicationData> = new Map<string, ApplicationData>();

  getById(applicationId: string) {
    return this.applications.get(applicationId);
  }

  getAll() {
    return this.applications.values();
  }

  add(applicationData: ApplicationData) {
    this.applications.set(applicationData.application.id, applicationData);
    this.applications = this.applications;
  }

  delete(applicationId: string) {
    this.applications.delete(applicationId);
    this.applications = this.applications;
  }

  clear() {
    this.applications.clear();
    this.applications = this.applications;
  }
}

export class ApplicationData {
  application: Application;

  layoutData: Map<string, LayoutData>;

  addApplicationArgs: AddApplicationArgs;

  @tracked
  heatmapData: ApplicationHeatmapData;

  drawableClassCommunications: DrawableClassCommunication[];

  version: number;

  constructor(application: Application, layoutData: Map<string, LayoutData>) {
    this.application = application;
    this.addApplicationArgs = {};
    this.layoutData = layoutData;
    this.heatmapData = new ApplicationHeatmapData();
    this.drawableClassCommunications = [];
    this.version = 0;
  }

  updateApplication(newApplication: Application, layoutData: Map<string, LayoutData>) {
    this.application = newApplication;
    this.layoutData = layoutData;
    this.version++;
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    'repos/application-repository': ApplicationRepository;
  }
}
