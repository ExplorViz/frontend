import { createStore } from 'zustand/vanilla';
// import ApplicationData from 'explorviz-frontend/utils/application-data';

interface ApplicationRepositoryState {
    // applications: Map<string, ApplicationData>;
    // getById: (applicationId: string) => ApplicationData;
    // getAll: () => ApplicationData[];
    // add: (applicationData: ApplicationData) => void;
    // delete: (applicationId: string) => void;
    // cleanup: () => void;
}

export const useApplicationRepositoryStore = createStore<ApplicationRepositoryState>(() => ({
    // applications: new Map(),
    // getById: (applicationId: string) => {
    //     return useApplicationRepository.getState().applications.get(applicationId);
    // },
    // getAll: () => {
    //     return Array.from(useApplicationRepository.getState().applications.values());
    // },
    // add: (applicationData: ApplicationData) => {
    //     useApplicationRepository.setState((state) => {
    //         state.applications.set(applicationData.application.id, applicationData);
    //     });
    // },
    // delete: (applicationId: string) => {
    //     useApplicationRepository.setState((state) => {
    //         state.applications.delete(applicationId);
    //     });
    // },
    // cleanup: () => {
    //     useApplicationRepository.setState((state) => {
    //         state.applications.clear();
    //     });
    // },
}));