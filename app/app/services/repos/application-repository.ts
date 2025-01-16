import Service from '@ember/service';
// import { tracked } from '@glimmer/tracking';
import ApplicationData from 'react-lib/src/utils/application-data';
import { useApplicationRepositoryStore } from 'react-lib/src/stores/repos/application-repository';

export default class ApplicationRepository extends Service.extend({
  // anything which *must* be merged to prototype here
}) {
  // @tracked
  // applications: Map<string, ApplicationData> = new Map<
  //   string,
  //   ApplicationData
  // >();
  get applications(): Map<string, ApplicationData> {
    return useApplicationRepositoryStore.getState().applications;
  }

  set applications(value: Map<string, ApplicationData>) {
    useApplicationRepositoryStore.setState({ applications: value });
  }

  // getById(applicationId: string) {
  //   this.applications.get(applicationId);
  // }
  getById(applicationId: string) {
    return useApplicationRepositoryStore.getState().getById(applicationId);
  }

  // getAll() {
  //   return this.applications.values();
  // }
  getAll() {
    return useApplicationRepositoryStore.getState().getAll();
  }

  //TODO: Look into notifyPropertyChange and how to migrate it

  // add(applicationData: ApplicationData) {
  //   this.applications.set(applicationData.application.id, applicationData);
  //   this.notifyPropertyChange('applications');
  // }
  add(applicationData: ApplicationData) {
    useApplicationRepositoryStore
      .getState()
      .addApplication(applicationData.application.id, applicationData);
    this.notifyPropertyChange('applications');
  }

  // delete(applicationId: string) {
  //   this.applications.delete(applicationId);
  //   this.notifyPropertyChange('applications');
  // }
  delete(applicationId: string) {
    useApplicationRepositoryStore.getState().removeApplication(applicationId);
    this.notifyPropertyChange('applications');
  }

  // cleanup() {
  //   this.applications.clear();
  //   this.notifyPropertyChange('applications');
  // }
  cleanup() {
    useApplicationRepositoryStore.getState().clearApplication();
    this.notifyPropertyChange('applications');
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    'repos/application-repository': ApplicationRepository;
  }
}
