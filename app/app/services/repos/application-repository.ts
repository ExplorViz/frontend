import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';
import ApplicationData from 'some-react-lib/src/utils/application-data';
import { ApplicationCommunication } from 'some-react-lib/src/utils/landscape-rendering/application-communication-computer';

export default class ApplicationRepository extends Service.extend({
  // anything which *must* be merged to prototype here
}) {
  @tracked
  applications: Map<string, ApplicationData> = new Map<
    string,
    ApplicationData
  >();

  @tracked
  communications: ApplicationCommunication[] = [];

  getById(applicationId: string) {
    return this.applications.get(applicationId);
  }

  getAll() {
    return this.applications.values();
  }

  add(applicationData: ApplicationData) {
    this.applications.set(applicationData.application.id, applicationData);
    this.notifyPropertyChange('applications');
  }

  delete(applicationId: string) {
    this.applications.delete(applicationId);
    this.notifyPropertyChange('applications');
  }

  cleanup() {
    this.communications = [];
    this.applications.clear();
    this.notifyPropertyChange('communications');
    this.notifyPropertyChange('applications');
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    'repos/application-repository': ApplicationRepository;
  }
}
