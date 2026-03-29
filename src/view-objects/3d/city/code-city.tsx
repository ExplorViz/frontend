import { Container, Root } from '@react-three/uikit';
import { Button } from '@react-three/uikit-default';
import { AppWindow } from '@react-three/uikit-lucide';
import { InstancedMesh2 } from '@three.ez/instanced-mesh';
import { useConfigurationStore } from 'explorviz-frontend/src/stores/configuration';
import { useLayoutStore } from 'explorviz-frontend/src/stores/layout-store';
import { useModelStore } from 'explorviz-frontend/src/stores/repos/model-repository';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { City } from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import CityDistrictLabel from 'explorviz-frontend/src/view-objects/3d/city/city-district-label';
import CityDistricts from 'explorviz-frontend/src/view-objects/3d/city/city-districts';
import CityFoundation from 'explorviz-frontend/src/view-objects/3d/city/city-foundation';
import CodeBuildingLabel from 'explorviz-frontend/src/view-objects/3d/city/code-building-label';
import CodeBuildings from 'explorviz-frontend/src/view-objects/3d/city/code-buildings';
import gsap from 'gsap';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useShallow } from 'zustand/react/shallow';

export default function CodeCity({ city }: { city: City }) {
  console.log('CITY', city) // CC-TODO

  const { animationDuration, enableAnimations, showEmbeddedBrowserIcon } =
    useUserSettingsStore(
      useShallow((state) => ({
        animationDuration: state.visualizationSettings.animationDuration.value,
        enableAnimations: state.visualizationSettings.enableAnimations.value,
        showEmbeddedBrowserIcon:
          state.visualizationSettings.showEmbeddedBrowserIcon.value,
      }))
    );

  const appLayout = useLayoutStore.getState().getLayout(city.id);

  const [appPosition, setAppPosition] = useState<THREE.Vector3 | undefined>(
    appLayout?.position
  );
  const [isBrowserActive, setIsBrowserActive] = useState(false);

  const { isCommRendered } = useConfigurationStore(
    useShallow((state) => ({
      isCommRendered: state.isCommRendered,
    }))
  );

  const componentInstanceMeshRef = useRef<InstancedMesh2>(null);

  useEffect(() => {
    const newPosition = appLayout?.position;
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
  }, [appLayout]);

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
      {/* {isBrowserActive && (
        <EmbeddedBrowser application={applicationData.application} />
      )} */}
      {appLayout && <CityFoundation city={city} layout={appLayout} />}
      <CodeBuildings
        buildingIds={city.allContainedBuildingIds.filter((id) =>
          useLayoutStore.getState().getBuildingLayouts().has(id)
        )}
        city={city}
      />
      {city.allContainedBuildingIds.map((buildingId) => (
        <CodeBuildingLabel
          key={buildingId + '-label'}
          buildingId={buildingId}
        />
      ))}
      <CityDistricts
        districtIds={city.allContainedDistrictIds.filter((id) =>
          useLayoutStore.getState().districtLayouts.has(id)
        )}
        layoutMap={useLayoutStore.getState().districtLayouts}
        ref={componentInstanceMeshRef}
        city={city}
      />
      {city.allContainedDistrictIds.map((districtId) => {
        const district = useModelStore.getState().getDistrict(districtId);
        const layout = useLayoutStore.getState().getLayout(districtId);
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
      {/* {isCommRendered &&
        applicationData.classCommunications.map((communication) => (
          <CommunicationR3F
            key={communication.id}
            communicationModel={communication}
            applicationElement={applicationData.application}
            layoutMap={layoutMap}
            applicationModels={[applicationData]}
          />
        ))} */}
    </group>
  );
}
