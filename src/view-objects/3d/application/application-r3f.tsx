import { Instances } from '@react-three/drei';
import { Container, Root } from '@react-three/uikit';
import { Button } from '@react-three/uikit-default';
import { AppWindow } from '@react-three/uikit-lucide';
import { useLinkRendererStore } from 'explorviz-frontend/src/stores/link-renderer';
import ApplicationData from 'explorviz-frontend/src/utils/application-data';
import ClassR3F from 'explorviz-frontend/src/view-objects/3d/application/class-r3f';
import CommunicationR3F from 'explorviz-frontend/src/view-objects/3d/application/communication-r3f';
import ComponentR3F from 'explorviz-frontend/src/view-objects/3d/application/component-r3f';
import EmbeddedBrowser from 'explorviz-frontend/src/view-objects/3d/application/embedded-browser';
import FoundationR3F from 'explorviz-frontend/src/view-objects/3d/application/foundation-r3f';
import { Fragment, useEffect, useState } from 'react';

export default function ApplicationR3F({
  applicationData,
}: {
  applicationData: ApplicationData;
}) {
  const [isBrowserActive, setIsBrowserActive] = useState(false);
  const [applicationPosition, setApplicationPosition] = useState<
    THREE.Vector3 | undefined
  >(applicationData.boxLayoutMap.get(applicationData.getId())?.position);

  const computeCommunicationLayout = useLinkRendererStore(
    (state) => state.computeCommunicationLayout
  );

  useEffect(() => {
    setApplicationPosition(
      applicationData.boxLayoutMap.get(applicationData.getId())?.position
    );
  }, [applicationData, applicationData.boxLayoutMap]);

  return (
    <>
      {applicationPosition && (
        <group position={applicationPosition}>
          <Root positionBottom={15} positionLeft={0} pixelSize={1}>
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
          {applicationData.boxLayoutMap.get(applicationData.getId()) && (
            <FoundationR3F
              application={applicationData.application}
              layout={
                applicationData.boxLayoutMap.get(applicationData.getId())!
              }
            />
          )}

          <Instances limit={5000} frustumCulled={false}>
            <boxGeometry />
            <meshLambertMaterial />
            {applicationData
              .getPackages()
              .map((packageData) =>
                applicationData.boxLayoutMap.get(packageData.id) ? (
                  <ComponentR3F
                    key={packageData.id}
                    component={packageData}
                    layout={applicationData.boxLayoutMap.get(packageData.id)!}
                  />
                ) : (
                  <Fragment key={packageData.id} />
                )
              )}
          </Instances>
          <Instances limit={50000} frustumCulled={false}>
            <boxGeometry />
            <meshLambertMaterial />
            {applicationData
              .getClasses()
              .map((classData) =>
                applicationData.boxLayoutMap.get(classData.id) ? (
                  <ClassR3F
                    key={classData.id}
                    dataModel={classData}
                    layout={applicationData.boxLayoutMap.get(classData.id)!}
                  />
                ) : (
                  <Fragment key={classData.id} />
                )
              )}
          </Instances>
          {applicationData.classCommunications.map((communication) => (
            <CommunicationR3F
              key={communication.id}
              communicationModel={communication}
              communicationLayout={computeCommunicationLayout(communication, [
                applicationData,
              ])}
            />
          ))}
        </group>
      )}
    </>
  );
}
