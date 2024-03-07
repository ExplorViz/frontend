import { createStore } from 'zustand/vanilla';
import ApplicationData from 'some-react-lib/src/utils/application-data';

interface ApplicationRepositoryState {
  applications: Map<string, ApplicationData>;
  addApplication: (applicationData: ApplicationData) => void;
  removeApplication: (applicationId: string) => void;
  clearApplications: () => void;
}

export const useApplicationRepositoryStore = createStore<ApplicationRepositoryState>((set) => ({
  applications: new Map(),
  addApplication,
  removeApplication,
  clearApplications
}));

function addApplication(applicationData: ApplicationData) {
  useApplicationRepositoryStore.setState((prev) => ({
    applications: new Map(prev.applications).set(applicationData.application.id, applicationData)
  }));
}

function removeApplication(applicationId: string) {
  useApplicationRepositoryStore.setState((prev) => {
    const updatedMap = new Map(prev.applications);
    updatedMap.delete(applicationId);
    return {
      applications: updatedMap
    }
  });
}

function clearApplications() {
  useApplicationRepositoryStore.setState((prev) => ({
    applications: new Map()
  }));
}
