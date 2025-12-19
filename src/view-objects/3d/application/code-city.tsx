import { Container, Root } from '@react-three/uikit';
import { Button } from '@react-three/uikit-default';
import { AppWindow } from '@react-three/uikit-lucide';
import { InstancedMesh2 } from '@three.ez/instanced-mesh';
import { useConfigurationStore } from 'explorviz-frontend/src/stores/configuration';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import ApplicationData from 'explorviz-frontend/src/utils/application-data';
import { computeCommunicationLayout } from 'explorviz-frontend/src/utils/application-rendering/communication-layouter';
import BoxLayout from 'explorviz-frontend/src/utils/layout/box-layout';
import CityDistrictLabel from 'explorviz-frontend/src/view-objects/3d/application/city-district-label';
import CityDistricts from 'explorviz-frontend/src/view-objects/3d/application/city-districts';
import CityFoundation from 'explorviz-frontend/src/view-objects/3d/application/city-foundation';
import CodeBuildingLabel from 'explorviz-frontend/src/view-objects/3d/application/code-building-label';
import CodeBuildings from 'explorviz-frontend/src/view-objects/3d/application/code-buildings';
import CommunicationR3F from 'explorviz-frontend/src/view-objects/3d/application/communication-r3f';
import EmbeddedBrowser from 'explorviz-frontend/src/view-objects/3d/application/embedded-browser';
import gsap from 'gsap';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useShallow } from 'zustand/react/shallow';

export default function CodeCity({
  applicationData,
  layoutMap,
}: {
  applicationData: ApplicationData;
  layoutMap: Map<string, BoxLayout>;
}) {
  const { animationDuration, enableAnimations, showEmbeddedBrowserIcon } =
    useUserSettingsStore(
      useShallow((state) => ({
        animationDuration: state.visualizationSettings.animationDuration.value,
        enableAnimations: state.visualizationSettings.enableAnimations.value,
        showEmbeddedBrowserIcon:
          state.visualizationSettings.showEmbeddedBrowserIcon.value,
      }))
    );

  const [appPosition, setAppPosition] = useState<THREE.Vector3 | undefined>(
    layoutMap.get(applicationData.getId())?.position
  );
  const [isBrowserActive, setIsBrowserActive] = useState(false);

  const { isCommRendered } = useConfigurationStore(
    useShallow((state) => ({
      isCommRendered: state.isCommRendered,
    }))
  );

  const classInstanceMeshRef = useRef<InstancedMesh2>(null);
  const componentInstanceMeshRef = useRef<InstancedMesh2>(null);

  useEffect(() => {
    const newPosition = layoutMap.get(applicationData.getId())?.position;
    if (!newPosition) return;
    if (enableAnimations && appPosition) {
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
      {showEmbeddedBrowserIcon && (
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
      )}
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
        classes={applicationData
          .getClasses()
          .filter((cls) => layoutMap.has(cls.id))}
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
            />
          ) : null
        )}
      <CityDistricts
        packages={applicationData
          .getPackages()
          .filter((pkg) => layoutMap.has(pkg.id))}
        layoutMap={layoutMap}
        ref={componentInstanceMeshRef}
        application={applicationData.application}
      />
      {applicationData
        .getPackages()
        .filter((packageData) => layoutMap.has(packageData.id))
        .map((packageData) => (
          <CityDistrictLabel
            key={packageData.id + '-label'}
            component={packageData}
            layout={layoutMap.get(packageData.id)!}
          />
        ))}
      {isCommRendered &&
        applicationData.classCommunications.map((communication) => (
          <CommunicationR3F
            key={communication.id}
            communicationModel={communication}
            communicationLayout={computeCommunicationLayout(
              communication,
              [applicationData],
              layoutMap
            )}
            applicationElement={applicationData.application}
            layoutMap={layoutMap}
          />
        ))}
    </group>
  );
}
