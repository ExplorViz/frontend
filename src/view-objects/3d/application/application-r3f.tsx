import { useApplicationRendererStore } from 'explorviz-frontend/src/stores/application-renderer';
import ApplicationData from 'explorviz-frontend/src/utils/application-data';
import {
  Class,
  Package,
} from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import ApplicationObject3D from 'explorviz-frontend/src/view-objects/3d/application/application-object-3d';
import ClassR3F from 'explorviz-frontend/src/view-objects/3d/application/class-r3f';
import ComponentR3F from 'explorviz-frontend/src/view-objects/3d/application/component-r3f';
import EmbeddedBrowser from 'explorviz-frontend/src/view-objects/3d/application/embedded-browser';
import FoundationR3F from 'explorviz-frontend/src/view-objects/3d/application/foundation-r3f';
import { useCallback, useEffect, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';

export default function ApplicationR3F({
  applicationData,
}: {
  applicationData: ApplicationData;
}) {
  const applicationRendererState = useApplicationRendererStore(
    useShallow((state) => ({
      addApplicationTask: state.addApplicationTask,
    }))
  );

  const [app3D, setApp3D] = useState<ApplicationObject3D | null>(null);
  const [packages, setPackages] = useState<Package[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);

  const computeApp = useCallback(async () => {
    const application3D =
      await applicationRendererState.addApplicationTask(applicationData);
    setApp3D(application3D);
    setPackages(applicationData.getPackages());
    setClasses(applicationData.getClasses());
  }, [applicationData, applicationRendererState]);

  useEffect(() => {
    computeApp();
  }, [applicationData, computeApp]);

  return (
    <>
      {app3D && (
        <primitive object={app3D}>
          <EmbeddedBrowser appLayout={app3D.layout} />
          <FoundationR3F
            application={applicationData.application}
            boxLayout={app3D.layout}
          />
          {packages?.map((packageData) => (
            <ComponentR3F
              key={packageData.id}
              component={packageData}
              appLayout={app3D.layout}
              layout={app3D.getBoxLayout(packageData.id)!}
            />
          ))}
          {classes?.map((classData) => (
            <ClassR3F
              key={classData.id}
              dataModel={classData}
              layout={app3D.getBoxLayout(classData.id)!}
            />
          ))}
        </primitive>
      )}
    </>
  );
}
