import { createStore } from "zustand/vanilla";
import ApplicationData from "react-lib/src/utils/application-data";

interface ApplicationRepositoryState {
  applications: Map<string, ApplicationData>;
  addApplication: (
    applicationId: string,
    applicationData: ApplicationData
  ) => void;
  removeApplication: (applicationId: string) => void;
  clearApplication: () => void;
  getById: (applicationId: string) => ApplicationData | undefined;
  getAll: () => MapIterator<ApplicationData>;
}

export const useApplicationRepositoryStore =
  createStore<ApplicationRepositoryState>((set, get) => ({
    applications: new Map<string, ApplicationData>(),
    addApplication,
    removeApplication,
    clearApplication,
    getById: (applicationId: string) => {
      return get().applications.get(applicationId);
    },
    getAll: () => {
      return get().applications.values();
    },
  }));

function addApplication(
  applicationId: string,
  applicationData: ApplicationData
) {
  useApplicationRepositoryStore.setState((prev) => ({
    applications: new Map(prev.applications).set(
      applicationId,
      applicationData
    ),
  }));
}

function removeApplication(applicationID: string) {
  useApplicationRepositoryStore.setState((prev) => {
    const updatedMap = new Map(prev.applications);
    updatedMap.delete(applicationID);
    return {
      applications: updatedMap,
    };
  });
}

function clearApplication() {
  useApplicationRepositoryStore.setState(() => ({
    applications: new Map(),
  }));
}
