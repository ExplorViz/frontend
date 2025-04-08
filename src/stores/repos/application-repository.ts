import { create } from 'zustand';
import ApplicationData from 'explorviz-frontend/src/utils/application-data';

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
    },

    remove: (applicationID: string) => {
      set((prev) => {
        const updatedMap = new Map(prev.applications);
        updatedMap.delete(applicationID);
        return {
          applications: updatedMap,
        };
      });
    },

    cleanup: () => {
      set(() => ({
        applications: new Map(),
      }));
    },
  })
);
