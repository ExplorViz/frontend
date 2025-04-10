import { useApplicationRendererStore } from 'explorviz-frontend/src/stores/application-renderer';
import ApplicationData from 'explorviz-frontend/src/utils/application-data';
import ApplicationObject3D from 'explorviz-frontend/src/view-objects/3d/application/application-object-3d';
import FoundationR3F from 'explorviz-frontend/src/view-objects/3d/application/foundation-r3f';
import { useEffect, useState } from 'react';
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

  const computeApp = async () => {
    const test =
      await applicationRendererState.addApplicationTask(applicationData);
    setApp3D(test);
  };

  useEffect(() => {
    computeApp();
  }, [applicationData]);

  return (
    <>
      {app3D && (
        <primitive object={app3D}>
          <FoundationR3F
            application={applicationData.application}
            boxLayout={app3D.layout}
          />
        </primitive>
      )}
    </>
  );
}
