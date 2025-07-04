import { Instances } from '@react-three/drei';
import { Container, Root } from '@react-three/uikit';
import { Button } from '@react-three/uikit-default';
import { AppWindow } from '@react-three/uikit-lucide';
import { useApplicationRendererStore } from 'explorviz-frontend/src/stores/application-renderer';
import { useLinkRendererStore } from 'explorviz-frontend/src/stores/link-renderer';
import ApplicationData from 'explorviz-frontend/src/utils/application-data';
import ApplicationObject3D from 'explorviz-frontend/src/view-objects/3d/application/application-object-3d';
import CommunicationR3F from 'explorviz-frontend/src/view-objects/3d/application/communication-r3f';
import ComponentR3F from 'explorviz-frontend/src/view-objects/3d/application/component-r3f';
import EmbeddedBrowser from 'explorviz-frontend/src/view-objects/3d/application/embedded-browser';
import FoundationR3F from 'explorviz-frontend/src/view-objects/3d/application/foundation-r3f';
import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import InstancedClassR3F from './instanced-class-r3f';
import ClassesR3F from './classes-r3f';
import { InstancedMesh2 } from '@three.ez/instanced-mesh';

export default function ApplicationR3F({
  applicationData,
}: {
  applicationData: ApplicationData;
}) {
  const [isBrowserActive, setIsBrowserActive] = useState(false);

  const applicationRendererState = useApplicationRendererStore(
    useShallow((state) => ({
      addApplicationTask: state.addApplicationTask,
    }))
  );

  const computeCommunicationLayout = useLinkRendererStore(
    (state) => state.computeCommunicationLayout
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

  const instanceMeshRef = useRef<InstancedMesh2>(null);

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
          <Instances limit={2500} frustumCulled={false}>
            <boxGeometry />
            <meshStandardMaterial />
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
          </Instances>
          {/*           <Instances limit={25000} frustumCulled={false}>
            <boxGeometry />
            <meshStandardMaterial />
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
          </Instances> */}
          <InstancedClassR3F
            classes={applicationData.getClasses()}
            app3D={app3D}
            ref={instanceMeshRef}
          />
          {applicationData.classCommunications.map((communication) => (
            <CommunicationR3F
              key={communication.id}
              communicationModel={communication}
              communicationLayout={computeCommunicationLayout(communication, [
                applicationData,
              ])}
            />
          ))}
        </primitive>
      )}
    </>
  );
}
