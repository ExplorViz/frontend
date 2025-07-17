import { Instances, Text } from '@react-three/drei';
import { Container, Root } from '@react-three/uikit';
import { Button } from '@react-three/uikit-default';
import { AppWindow } from '@react-three/uikit-lucide';
import { InstancedMesh2 } from '@three.ez/instanced-mesh';
import { useConfigurationStore } from 'explorviz-frontend/src/stores/configuration';
import { useLinkRendererStore } from 'explorviz-frontend/src/stores/link-renderer';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import ApplicationData from 'explorviz-frontend/src/utils/application-data';
import ClassR3F from 'explorviz-frontend/src/view-objects/3d/application/class-r3f';
import CommunicationR3F from 'explorviz-frontend/src/view-objects/3d/application/communication-r3f';
import ComponentR3F from 'explorviz-frontend/src/view-objects/3d/application/component-r3f';
import EmbeddedBrowser from 'explorviz-frontend/src/view-objects/3d/application/embedded-browser';
import FoundationR3F from 'explorviz-frontend/src/view-objects/3d/application/foundation-r3f';
import BoxLayout from 'explorviz-frontend/src/view-objects/layout-models/box-layout';
import gsap from 'gsap';
import { Fragment, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useShallow } from 'zustand/react/shallow';
import InstancedClassR3F from './instanced-class-r3f';
import InstancedComponentR3F from './instanced-component-r3f';
import ClassLabelR3F from 'explorviz-frontend/src/view-objects/3d/application/class-label-r3f';
import ComponentLabelR3F from 'explorviz-frontend/src/view-objects/3d/application/component-label-r3f';

export default function ApplicationR3F({
  applicationData,
  layoutMap,
}: {
  applicationData: ApplicationData;
  layoutMap: Map<string, BoxLayout>;
}) {
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

  const {
    enableAnimations,
    classLabelFontSize,
    classLabelLength,
    classTextColor,
    labelOffset,
    labelRotation,
  } = useUserSettingsStore(
    useShallow((state) => ({
      enableAnimations: state.visualizationSettings.enableAnimations.value,
      unchangedClassColor:
        state.visualizationSettings.unchangedClassColor.value,
      classLabelFontSize: state.visualizationSettings.classLabelFontSize.value,
      classLabelLength: state.visualizationSettings.classLabelLength.value,
      classTextColor: state.visualizationSettings.classTextColor.value,
      labelOffset: state.visualizationSettings.labelOffset.value,
      labelRotation: state.visualizationSettings.classLabelOrientation.value,
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
        duration: 0.25,
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
      {/* <Root positionBottom={15} positionLeft={0} pixelSize={1}>
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
      )} */}
      {layoutMap.get(applicationData.getId()) && (
        <FoundationR3F
          application={applicationData.application}
          layout={layoutMap.get(applicationData.getId())!}
        />
      )}

      {/* <Instances limit={5000} frustumCulled={false}>
        <boxGeometry />
        <meshLambertMaterial />
        {applicationData
          .getPackages()
          .map((packageData) =>
            layoutMap.get(packageData.id) ? (
              <ComponentR3F
                key={packageData.id}
                component={packageData}
                layout={layoutMap.get(packageData.id)!}
                application={applicationData.application}
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
            layoutMap.get(classData.id) ? (
              <ClassR3F
                key={classData.id}
                dataModel={classData}
                layout={layoutMap.get(classData.id)!}
                application={applicationData.application}
              />
            ) : (
              <Fragment key={classData.id} />
            )
          )}
      </Instances> */}
      <InstancedClassR3F
        classes={applicationData.getClasses()}
        appId={applicationData.application.id}
        layoutMap={layoutMap}
        application={applicationData.application}
        ref={classInstanceMeshRef}
      />
      {applicationData
        .getClasses()
        .map((classData) =>
          layoutMap.get(classData.id) && classInstanceMeshRef.current ? (
            <ClassLabelR3F
              key={classData.id + '-label'}
              dataModel={classData}
              application={applicationData.application}
              layout={layoutMap.get(classData.id)!}
            />
          ) : null
        )}
      <InstancedComponentR3F
        packages={applicationData.getPackages()}
        layoutMap={layoutMap}
        ref={componentInstanceMeshRef}
        application={applicationData.application}
      />
      {applicationData
        .getPackages()
        .map((packageData) =>
          layoutMap.get(packageData.id) && componentInstanceMeshRef.current ? (
            <ComponentLabelR3F
              key={packageData.id + '-label'}
              component={packageData}
              layout={layoutMap.get(packageData.id)!}
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
              layoutMap
            )}
          />
        ))}
    </group>
  );
}
