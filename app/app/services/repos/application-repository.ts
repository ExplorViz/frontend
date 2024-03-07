import Service from '@ember/service';
import ApplicationData from 'some-react-lib/src/utils/application-data';
import { useApplicationRepositoryStore } from 'some-react-lib/src/stores/repos/application-repository';

export default class ApplicationRepository extends Service.extend({
  // anything which *must* be merged to prototype here
}) {
  get applications() {
    return useApplicationRepositoryStore.getState().applications;
  }

  getById(applicationId: string) {
    return this.applications.get(applicationId);
  }

  getAll() {
    return this.applications.values();
  }

  add(applicationData: ApplicationData) {
    useApplicationRepositoryStore.getState().addApplication(applicationData);
  }

  delete(applicationId: string) {
    useApplicationRepositoryStore.getState().removeApplication(applicationId);
  }

  cleanup() {
    useApplicationRepositoryStore.getState().clearApplications();
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    'repos/application-repository': ApplicationRepository;
  }
}
