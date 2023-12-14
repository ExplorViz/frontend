import { getAllClassesInApplication } from './application-helpers';
import ClassCommunication from './landscape-schemes/dynamic/class-communication';
import { Application } from './landscape-schemes/structure-data';

export default function calculateCommunications(
  application: Application,
  classCommunications: ClassCommunication[]
) {
  const allClasses = new Set(getAllClassesInApplication(application));
  const communicationInApplication = classCommunications.filter(
    (comm) =>
      allClasses.has(comm.sourceClass) && allClasses.has(comm.targetClass)
  );
  return communicationInApplication;
}
