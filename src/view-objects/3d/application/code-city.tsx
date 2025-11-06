import { Container, Root } from '@react-three/uikit';
import { Button } from '@react-three/uikit-default';
import { AppWindow } from '@react-three/uikit-lucide';
import { InstancedMesh2 } from '@three.ez/instanced-mesh';
import { useConfigurationStore } from 'explorviz-frontend/src/stores/configuration';
import { useLinkRendererStore } from 'explorviz-frontend/src/stores/link-renderer';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import ApplicationData from 'explorviz-frontend/src/utils/application-data';
import CodeBuildingLabel from 'explorviz-frontend/src/view-objects/3d/application/code-building-label';
import CommunicationR3F from 'explorviz-frontend/src/view-objects/3d/application/communication-r3f';
import BundledCommunicationR3F from 'explorviz-frontend/src/view-objects/3d/application/bundled-communication-r3f';
import CityDistrictLabel from 'explorviz-frontend/src/view-objects/3d/application/city-district-label';
import EmbeddedBrowser from 'explorviz-frontend/src/view-objects/3d/application/embedded-browser';
import CityFoundation from 'explorviz-frontend/src/view-objects/3d/application/city-foundation';
import BoxLayout from 'explorviz-frontend/src/view-objects/layout-models/box-layout';
import gsap from 'gsap';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useShallow } from 'zustand/react/shallow';
import CodeBuildings from './code-buildings';
import CityDistricts from './city-districts';
import { useFrame, useThree } from '@react-three/fiber';

export default function CodeCity({
  applicationData,
  layoutMap,
}: {
  applicationData: ApplicationData;
  layoutMap: Map<string, BoxLayout>;
}) {
  const [isCameraZoomedIn, setIsCameraZoomedIn] = useState(false);
  const { camera } = useThree();

  const { animationDuration, enableAnimations, zoomDistance } =
    useUserSettingsStore(
      useShallow((state) => ({
        animationDuration: state.visualizationSettings.animationDuration.value,
        enableAnimations: state.visualizationSettings.enableAnimations.value,
        zoomDistance: state.visualizationSettings.maxCamHeightForCamera.value,
      }))
    );

  useFrame(() => {
    setIsCameraZoomedIn(camera.position.y < zoomDistance);
  });

  const [appPosition, setAppPosition] = useState<THREE.Vector3>(
    layoutMap.get(applicationData.getId())?.position!
  );
  const [isBrowserActive, setIsBrowserActive] = useState(false);

  const computeCommunicationLayout = useLinkRendererStore(
    (state) => state.computeCommunicationLayout
  );
  const { isCommRendered } = useConfigurationStore(
    useShallow((state) => ({
      isCommRendered: state.isCommRendered,
    }))
  );

  const classInstanceMeshRef = useRef<InstancedMesh2>(null);
  const componentInstanceMeshRef = useRef<InstancedMesh2>(null);

  const { closedComponentIds } = useVisualizationStore(
    useShallow((state) => ({
      closedComponentIds: state.closedComponentIds,
    }))
  );

  useEffect(() => {
    const newPosition = layoutMap.get(applicationData.getId())?.position!;
    if (enableAnimations) {
      const gsapValues = {
        positionX: appPosition.x,
        positionY: appPosition.y,
        positionZ: appPosition.z,
      };
      gsap.to(gsapValues, {
        positionX: newPosition.x,
        positionY: newPosition.y,
        positionZ: newPosition.z,
        duration: animationDuration,
        onUpdate: () => {
          setAppPosition(
            new THREE.Vector3(
              gsapValues.positionX,
              gsapValues.positionY,
              gsapValues.positionZ
            )
          );
        },
      });
    } else {
      setAppPosition(newPosition);
    }
  }, [layoutMap]);

  return (
    <group position={appPosition}>
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
      {layoutMap.get(applicationData.getId()) && (
        <CityFoundation
          application={applicationData.application}
          layout={layoutMap.get(applicationData.getId())!}
        />
      )}
      <CodeBuildings
        classes={applicationData.getClasses()}
        appId={applicationData.application.id}
        layoutMap={layoutMap}
        application={applicationData.application}
        ref={classInstanceMeshRef}
      />
      {applicationData
        .getClasses()
        .map((classData) =>
          layoutMap.get(classData.id) ? (
            <CodeBuildingLabel
              key={classData.id + '-label'}
              dataModel={classData}
              application={applicationData.application}
              layout={layoutMap.get(classData.id)!}
              isCameraZoomedIn={isCameraZoomedIn}
            />
          ) : null
        )}
      <CityDistricts
        packages={applicationData.getPackages()}
        layoutMap={layoutMap}
        ref={componentInstanceMeshRef}
        application={applicationData.application}
      />
      {applicationData
        .getPackages()
        .map((packageData) =>
          layoutMap.get(packageData.id) ? (
            <CityDistrictLabel
              key={packageData.id + '-label'}
              component={packageData}
              layout={layoutMap.get(packageData.id)!}
              isCameraZoomedIn={isCameraZoomedIn}
            />
          ) : null
        )}
      {isCommRendered &&
        applicationData.classCommunications.map((communication) => (
          <CommunicationR3F
            key={communication.id}
            communicationModel={communication}
            communicationLayout={computeCommunicationLayout(
              communication,
              [applicationData],
              layoutMap,
              closedComponentIds
            )}
          />
        ))}

      {/* {isCommRendered &&
        applicationData.classCommunications.map((communication) => (
          <BundledCommunicationR3F
            key={communication.id}
            communicationModel={communication}
            communicationLayout={computeCommunicationLayout(
              communication,
              [applicationData],
              layoutMap,
              closedComponentIds
            )}
          />
        ))} */}
    </group>
  );
}
