import { create } from 'zustand';
import ApplicationData from 'react-lib/src/utils/application-data';

interface ApplicationRepositoryState {
  applications: Map<string, ApplicationData>; // tracked
  add: (applicationId: string, applicationData: ApplicationData) => void;
  remove: (applicationId: string) => void;
  cleanup: () => void;
  getById: (applicationId: string) => ApplicationData | undefined;
  getAll: () => MapIterator<ApplicationData>;
}

export const useApplicationRepositoryStore = create<ApplicationRepositoryState>(
  (set, get) => ({
    applications: new Map<string, ApplicationData>(), // tracked
    getById: (applicationId: string) => {
      return get().applications.get(applicationId);
    },
    getAll: () => {
      return get().applications.values();
    },

    add: (applicationId: string, applicationData: ApplicationData) => {
      set((prev) => ({
        applications: new Map(prev.applications).set(
          applicationId,
          applicationData
        ),
      }));
      // TODO: this.notifyPropertyChange('applications'); // Seems not to be necessary, since Zustand does it automatically
    },

    remove: (applicationID: string) => {
      set((prev) => {
        const updatedMap = new Map(prev.applications);
        updatedMap.delete(applicationID);
        return {
          applications: updatedMap,
        };
      });
      // TODO: this.notifyPropertyChange('applications'); // Seems not to be necessary, since Zustand does it automatically
    },

    cleanup: () => {
      set(() => ({
        applications: new Map(),
      }));
      // TODO: this.notifyPropertyChange('applications'); // Seems not to be necessary, since Zustand does it automatically
    },
  })
);
