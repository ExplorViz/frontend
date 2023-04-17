import ApplicationData from '../../utils/application-data';
import { ApplicationCommunication } from '../../utils/landscape-rendering/application-communication-computer';

export default class ApplicationRepository {
  applications: Map<string, ApplicationData> = new Map<
    string,
    ApplicationData
  >();

  communications: ApplicationCommunication[] = [];

  getById(applicationId: string) {
    return this.applications.get(applicationId);
  }

  getAll() {
    return this.applications.values();
  }

  add(applicationData: ApplicationData) {
    this.applications.set(applicationData.application.id, applicationData);
    // this.notifyPropertyChange('applications');
  }

  delete(applicationId: string) {
    this.applications.delete(applicationId);
    //this.notifyPropertyChange('applications');
  }

  clear() {
    this.applications.clear();
    // this.notifyPropertyChange('applications');
  }
}
