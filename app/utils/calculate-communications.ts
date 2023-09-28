import { getAllClassesInApplication } from './application-helpers';
import AggregatedClassCommunication from './landscape-schemes/dynamic/aggregated-class-communication';
import { Application } from './landscape-schemes/structure-data';

export default function calculateCommunications(
  application: Application,
  aggregatedClassCommunications: AggregatedClassCommunication[]
) {
  const allClasses = new Set(getAllClassesInApplication(application));
  const communicationInApplication = aggregatedClassCommunications.filter(
    (comm) =>
      allClasses.has(comm.sourceClass) && allClasses.has(comm.targetClass)
  );
  return communicationInApplication;
}
