import { getAllClassesInApplication } from './application-helpers';
import { DrawableClassCommunication } from './application-rendering/class-communication-computer';
import { Application } from './landscape-schemes/structure-data';

export default function calculateCommunications(
  application: Application,
  drawableClassCommunications: DrawableClassCommunication[]
) {
  const allClasses = new Set(getAllClassesInApplication(application));
  const communicationInApplication = drawableClassCommunications.filter(
    (comm) =>
      allClasses.has(comm.sourceClass) && allClasses.has(comm.targetClass)
  );
  return communicationInApplication;
}
