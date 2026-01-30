import { Container, Root } from '@react-three/uikit';
import { Button } from '@react-three/uikit-default';
import { AppWindow } from '@react-three/uikit-lucide';
import { InstancedMesh2 } from '@three.ez/instanced-mesh';
import { useConfigurationStore } from 'explorviz-frontend/src/stores/configuration';
import { useModelStore } from 'explorviz-frontend/src/stores/repos/model-repository';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import ApplicationData from 'explorviz-frontend/src/utils/application-data';
import BoxLayout from 'explorviz-frontend/src/utils/layout/box-layout';
import CityDistrictLabel from 'explorviz-frontend/src/view-objects/3d/city/city-district-label';
import CityDistricts from 'explorviz-frontend/src/view-objects/3d/city/city-districts';
import CityFoundation from 'explorviz-frontend/src/view-objects/3d/city/city-foundation';
import CodeBuildingLabel from 'explorviz-frontend/src/view-objects/3d/city/code-building-label';
import CodeBuildings from 'explorviz-frontend/src/view-objects/3d/city/code-buildings';
import CommunicationR3F from 'explorviz-frontend/src/view-objects/3d/city/communication-r3f';
import EmbeddedBrowser from 'explorviz-frontend/src/view-objects/3d/city/embedded-browser';
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

  const city = useModelStore.getState().getCity(applicationData.application.id);

  const [appPosition, setAppPosition] = useState<THREE.Vector3 | undefined>(
    layoutMap.get(applicationData.getId())?.position
  );
  const [isBrowserActive, setIsBrowserActive] = useState(false);

  const { isCommRendered } = useConfigurationStore(
    useShallow((state) => ({
      isCommRendered: state.isCommRendered,
    }))
  );

  const buildingInstanceMeshRef = useRef<InstancedMesh2>(null);
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

  if (!city) return null;

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
      {layoutMap.get(city.id) && (
        <CityFoundation city={city} layout={layoutMap.get(city.id)} />
      )}
      <CodeBuildings
        buildingIds={city.buildingIds.filter((id) => layoutMap.has(id))}
        city={city}
        ref={buildingInstanceMeshRef}
      />
      {city.buildingIds.map((buildingId) => (
        <CodeBuildingLabel
          key={buildingId + '-label'}
          buildingId={buildingId}
        />
      ))}
      <CityDistricts
        districtIds={city.districtIds.filter((id) => layoutMap.has(id))}
        layoutMap={layoutMap}
        ref={componentInstanceMeshRef}
        city={city}
      />
      {city.districtIds.map((districtId) => {
        const district = useModelStore.getState().getDistrict(districtId);
        const layout = layoutMap.get(districtId);
        if (district && layout) {
          return (
            <CityDistrictLabel
              key={districtId + '-label'}
              district={district}
              layout={layout}
            />
          );
        }
        return null;
      })}
      {isCommRendered &&
        applicationData.classCommunications.map((communication) => (
          <CommunicationR3F
            key={communication.id}
            communicationModel={communication}
            applicationElement={applicationData.application}
            layoutMap={layoutMap}
            applicationModels={[applicationData]}
          />
        ))}
    </group>
  );
}
