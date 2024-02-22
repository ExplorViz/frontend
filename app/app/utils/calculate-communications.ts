import { getAllClassesInApplication } from 'some-react-lib/src/utils/application-helpers';
import ClassCommunication from 'some-react-lib/src/utils/landscape-schemes/dynamic/class-communication';
import { Application } from 'some-react-lib/src/utils/landscape-schemes/structure-data';

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
