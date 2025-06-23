import { Container, Root } from '@react-three/uikit';
import { Button } from '@react-three/uikit-default';
import { AppWindow } from '@react-three/uikit-lucide';
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
import { Fragment, useCallback, useEffect, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';

export default function ApplicationR3F({
  applicationData,
}: {
  applicationData: ApplicationData;
}) {
  const [isBrowserActive, setIsBrowserActive] = useState(false);
  const [communications, setCommunications] = useState<
    {
      id: string;
      communicationModel: ClassCommunication;
      layout: CommunicationLayout;
    }[]
  >([]);

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

  useEffect(() => {
    if (!app3D?.boxLayoutMap) return;
    const tempCommunications = [];

    for (
      let index = 0;
      index < applicationData.classCommunications.length;
      index++
    ) {
      const classCommunication = applicationData.classCommunications[index];
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

      tempCommunications.push({
        id: classCommunication.id,
        communicationModel: classCommunication,
        layout: commLayout,
      });
    }
    setCommunications([...tempCommunications]);
  }, [
    applicationData,
    app3D?.boxLayoutMap,
    applicationData.classCommunications,
  ]);

  return (
    <>
      {app3D && (
        <primitive object={app3D}>
          <Root
            positionBottom={15}
            positionLeft={app3D.layout.width / 2 - 5}
            pixelSize={1}
          >
            <Container>
              <Button
                width={25}
                height={25}
                padding={5}
                backgroundColor={isBrowserActive ? 'red' : 'black'}
                onClick={() => {
                  setIsBrowserActive(!isBrowserActive);
                }}
              >
                <AppWindow />
              </Button>
            </Container>
          </Root>
          {isBrowserActive && (
            <EmbeddedBrowser application={applicationData.application} />
          )}
          <FoundationR3F
            application={applicationData.application}
            boxLayout={app3D.layout}
          />
          {applicationData
            .getPackages()
            .map((packageData) =>
              app3D.getBoxLayout(packageData.id) ? (
                <ComponentR3F
                  key={packageData.id}
                  component={packageData}
                  layout={app3D.getBoxLayout(packageData.id)!}
                />
              ) : (
                <Fragment key={packageData.id} />
              )
            )}
          {applicationData
            .getClasses()
            .map((classData) =>
              app3D.getBoxLayout(classData.id) ? (
                <ClassR3F
                  key={classData.id}
                  dataModel={classData}
                  layout={app3D.getBoxLayout(classData.id)!}
                />
              ) : (
                <Fragment key={classData.id} />
              )
            )}
          {communications.map((communication) => (
            <CommunicationR3F
              key={communication.id}
              communicationModel={communication.communicationModel}
              communicationLayout={communication.layout}
            />
          ))}
        </primitive>
      )}
    </>
  );
}
