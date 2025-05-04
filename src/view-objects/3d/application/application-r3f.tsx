import { useApplicationRendererStore } from 'explorviz-frontend/src/stores/application-renderer';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import ApplicationData from 'explorviz-frontend/src/utils/application-data';
import { calculateLineThickness } from 'explorviz-frontend/src/utils/application-rendering/communication-layouter';
import ClassCommunication from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/class-communication';
import ApplicationObject3D from 'explorviz-frontend/src/view-objects/3d/application/application-object-3d';
import ClassR3F from 'explorviz-frontend/src/view-objects/3d/application/class-r3f';
import CommunicationR3F from 'explorviz-frontend/src/view-objects/3d/application/communication-r3f';
import ComponentR3F from 'explorviz-frontend/src/view-objects/3d/application/component-r3f';
import EmbeddedBrowser from 'explorviz-frontend/src/view-objects/3d/application/embedded-browser';
import FoundationR3F from 'explorviz-frontend/src/view-objects/3d/application/foundation-r3f';
import CommunicationLayout from 'explorviz-frontend/src/view-objects/layout-models/communication-layout';
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

  const { commLineThickness } = useUserSettingsStore(
    useShallow((state) => ({
      commLineThickness: state.visualizationSettings.commThickness.value,
    }))
  );

  const [app3D, setApp3D] = useState<ApplicationObject3D | null>(null);

  const computeApp = useCallback(async () => {
    const application3D =
      await applicationRendererState.addApplicationTask(applicationData);
    setApp3D(application3D);
  }, [applicationData, applicationRendererState]);

  useEffect(() => {
    computeApp();
  }, [applicationData, computeApp]);

  const getCommunicationLayout = (classCommunication: ClassCommunication) => {
    const commLayout = new CommunicationLayout(classCommunication);

    const sourceModelId = classCommunication.sourceClass.id;
    const sourceLayout = app3D?.getBoxLayout(sourceModelId);
    if (sourceLayout) {
      commLayout.startX = sourceLayout.positionX;
      commLayout.startY = sourceLayout.positionY;
      commLayout.startZ = sourceLayout.positionZ;
    }

    const targetModelId = classCommunication.targetClass.id;
    const targetLayout = app3D?.getBoxLayout(targetModelId);
    if (targetLayout) {
      commLayout.endX = targetLayout.positionX;
      commLayout.endY = targetLayout.positionY;
      commLayout.endZ = targetLayout.positionZ;
    }

    // Place recursive communication slightly above class
    if (sourceModelId === targetModelId) {
      commLayout.startY += 2.0;
      commLayout.endY += 2.0;
    }

    // TODO: Calculate Thickness
    commLayout.lineThickness = calculateLineThickness(
      classCommunication,
      commLineThickness
    );

    return commLayout;
  };

  return (
    <>
      {app3D && (
        <primitive object={app3D}>
          <EmbeddedBrowser />
          <FoundationR3F
            application={applicationData.application}
            boxLayout={app3D.layout}
          />
          {applicationData.getPackages().map((packageData) => (
            <ComponentR3F
              key={packageData.id}
              component={packageData}
              layout={app3D.getBoxLayout(packageData.id)!}
            />
          ))}
          {applicationData.getClasses().map((classData) => (
            <ClassR3F
              key={classData.id}
              dataModel={classData}
              layout={app3D.getBoxLayout(classData.id)!}
            />
          ))}
          {applicationData.classCommunications.map((communication) => (
            <CommunicationR3F
              key={communication.id}
              application={applicationData.application}
              communicationModel={communication}
              communicationLayout={getCommunicationLayout(communication)}
            />
          ))}
        </primitive>
      )}
    </>
  );
}
