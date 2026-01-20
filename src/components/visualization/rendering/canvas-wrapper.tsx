import { Magnify } from '@malte-hansen/magnify-r3f';
import { CameraControls, PerspectiveCamera, Stats } from '@react-three/drei';
import { Canvas, useLoader, useThree } from '@react-three/fiber';
import type { XRStore } from '@react-three/xr';
import {
  createXRStore,
  IfInSessionMode,
  TeleportTarget,
  XR,
  XROrigin,
} from '@react-three/xr';
import {
  default as CollaborationCameraSync,
  default as SpectateCameraController,
} from 'explorviz-frontend/src/components/visualization/rendering/collaboration-camera-sync';
import useLandscapeDataWatcher from 'explorviz-frontend/src/hooks/landscape-data-watcher';
import {
  INITIAL_CAMERA_POSITION,
  useCameraControls,
} from 'explorviz-frontend/src/stores/camera-controls-store';
import { useConfigurationStore } from 'explorviz-frontend/src/stores/configuration';
import { useLayoutStore } from 'explorviz-frontend/src/stores/layout-store';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import {
  getAllClassesInApplication,
  getAllPackagesInApplication,
} from 'explorviz-frontend/src/utils/application-helpers';
import ControllerMenu from 'explorviz-frontend/src/utils/extended-reality/vr-menus-r3f/controller-menu';
import { LandscapeData } from 'explorviz-frontend/src/utils/landscape-schemes/landscape-data';
import { getApplicationsFromNodes } from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import {
  getAllApplicationsInLandscape,
  getApplicationFromPackage,
} from 'explorviz-frontend/src/utils/landscape-structure-helpers';
import BoxLayout from 'explorviz-frontend/src/utils/layout/box-layout';
import layoutLandscape from 'explorviz-frontend/src/utils/layout/elk-layouter';
import { AnimatedPing } from 'explorviz-frontend/src/view-objects/3d/application/animated-ping-r3f';
import CodeCity from 'explorviz-frontend/src/view-objects/3d/application/code-city';
import CommunicationR3F from 'explorviz-frontend/src/view-objects/3d/application/communication-r3f';
import { HAPSystemManager } from 'explorviz-frontend/src/view-objects/3d/application/hap-system-manager';
import TraceReplayOverlayR3F from 'explorviz-frontend/src/view-objects/3d/application/trace-replay-overlay-r3f';
import AutoComponentOpenerR3F from 'explorviz-frontend/src/view-objects/3d/auto-component-opener-r3f';
import ClusterCentroidsR3F from 'explorviz-frontend/src/view-objects/3d/cluster-centroids-r3f';
import LandscapeR3F from 'explorviz-frontend/src/view-objects/3d/landscape/landscape-r3f';
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import * as THREE from 'three';
import { useShallow } from 'zustand/react/shallow';
import MinimapView from './minimap-view';

/**
 * Helper component to configure the main camera's layers.
 * Must be placed inside the Canvas to access the R3F state.
 */
function CameraLayerHandler() {
  const camera = useThree((state) => state.camera);

  useEffect(() => {
    // The main camera should be able to see all labels
    camera.layers.enableAll();
  }, [camera]);

  return null;
}

export default function CanvasWrapper({
  landscapeData,
  xrStore,
}: {
  landscapeData: LandscapeData | null;
  xrStore?: XRStore | undefined;
}) {
  const [layoutMap, setLayoutMap] = useState<Map<string, BoxLayout> | null>(
    null
  );
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const floorTexture = useLoader(
    THREE.TextureLoader,
    'extended-reality/images/materials/floor.jpg'
  );
  floorTexture.repeat.set(200, 200);
  floorTexture.wrapS = floorTexture.wrapT = THREE.RepeatWrapping;

  const [isHAPTreeReady, setIsHAPTreeReady] = useState(false);
  const hapSystemManager = HAPSystemManager.getInstance();

  const directionalLightRef = useRef(null);

  const {
    applicationLayoutAlgorithm,
    packageLayoutAlgorithm,
    appLabelMargin,
    applicationAspectRatio,
    applicationDistance,
    appMargin,
    cameraFar,
    cameraFov,
    cameraNear,
    castShadows,
    componentLabelPlacement,
    classFootprint,
    classLayoutAlgorithm,
    classWidthMetric,
    classWidthMetricMultiplier,
    classDepthMetric,
    classDepthMetricMultiplier,
    classMargin,
    closedComponentHeight,
    openedComponentHeight,
    packageLabelMargin,
    packageMargin,
    sceneBackgroundColor,
    showAxesHelper,
    showFpsCounter,
    showLightHelper,
    spiralCenterOffset,
    spiralGap,
    leftMouseButtonAction,
    middleMouseButtonAction,
    mouseWheelAction,
    rightMouseButtonAction,
    isMagnifierActive,
    magnifierZoom,
    magnifierExponent,
    magnifierRadius,
    magnifierOutlineColor,
    magnifierOutlineThickness,
    magnifierAntialias,
  } = useUserSettingsStore(
    useShallow((state) => ({
      applicationLayoutAlgorithm:
        state.visualizationSettings.applicationLayoutAlgorithm.value,
      packageLayoutAlgorithm:
        state.visualizationSettings.packageLayoutAlgorithm.value,
      appLabelMargin: state.visualizationSettings.appLabelMargin,
      applicationAspectRatio:
        state.visualizationSettings.applicationAspectRatio,
      applicationDistance: state.visualizationSettings.applicationDistance,
      appMargin: state.visualizationSettings.appMargin,
      cameraFar: state.visualizationSettings.cameraFar.value,
      cameraFov: state.visualizationSettings.cameraFov.value,
      cameraNear: state.visualizationSettings.cameraNear.value,
      castShadows: state.visualizationSettings.castShadows.value,
      classFootprint: state.visualizationSettings.classFootprint,
      classLayoutAlgorithm:
        state.visualizationSettings.classLayoutAlgorithm.value,
      classMargin: state.visualizationSettings.classMargin.value,
      classWidthMetric: state.visualizationSettings.classWidthMetric.value,
      classWidthMetricMultiplier:
        state.visualizationSettings.classWidthMultiplier.value,
      classDepthMetric: state.visualizationSettings.classDepthMetric.value,
      classDepthMetricMultiplier:
        state.visualizationSettings.classDepthMultiplier.value,
      closedComponentHeight: state.visualizationSettings.closedComponentHeight,
      componentLabelPlacement:
        state.visualizationSettings.componentLabelPlacement.value,
      colors: state.colors,
      openedComponentHeight: state.visualizationSettings.openedComponentHeight,
      packageLabelMargin: state.visualizationSettings.packageLabelMargin,
      packageMargin: state.visualizationSettings.packageMargin,
      sceneBackgroundColor: state.visualizationSettings.backgroundColor.value,
      showAxesHelper: state.visualizationSettings.showAxesHelper.value,
      showFpsCounter: state.visualizationSettings.showFpsCounter.value,
      showLightHelper: state.visualizationSettings.showLightHelper.value,
      spiralCenterOffset: state.visualizationSettings.spiralCenterOffset.value,
      spiralGap: state.visualizationSettings.spiralGap.value,
      leftMouseButtonAction:
        state.visualizationSettings.leftMouseButtonAction.value,
      mouseWheelAction: state.visualizationSettings.mouseWheelAction.value,
      rightMouseButtonAction:
        state.visualizationSettings.rightMouseButtonAction.value,
      middleMouseButtonAction:
        state.visualizationSettings.middleMouseButtonAction.value,
      isMagnifierActive: state.visualizationSettings.isMagnifierActive.value,
      magnifierZoom: state.visualizationSettings.magnifierZoom.value,
      magnifierExponent: state.visualizationSettings.magnifierExponent.value,
      magnifierRadius: state.visualizationSettings.magnifierRadius.value,
      magnifierOutlineColor:
        state.visualizationSettings.magnifierOutlineColor.value,
      magnifierOutlineThickness:
        state.visualizationSettings.magnifierOutlineThickness.value,
      magnifierAntialias: state.visualizationSettings.magnifierAntialias.value,
      visualizationSettings: state.visualizationSettings,
    }))
  );

  const { removedComponentIds } = useVisualizationStore();

  const allApplications = useMemo(() => {
    if (!landscapeData) return [];
    return getAllApplicationsInLandscape(
      landscapeData.structureLandscapeData
    ).filter((app) => !removedComponentIds.has(app.id));
  }, [landscapeData, removedComponentIds]);

  const getHAPPosition = useCallback(
    (element: any): THREE.Vector3 => {
      if (!layoutMap || !layoutMap.has(element.id)) {
        return new THREE.Vector3(0, 0, 0);
      }

      const layout = layoutMap.get(element.id)!;
      const level =
        element.type === 'application' ? 2 : element.type === 'package' ? 1 : 0;

      const isApplication = element.type === 'application';

      // Following the pattern from layout-helper.ts:getLandscapePositionOfModel
      // but without landscapeScalar since we're rendering inside the scaled landscape group

      if (isApplication) {
        // For applications: use position + (width/2, 0, depth/2) as center
        const modelPosition = new THREE.Vector3(
          layout.position.x + layout.width / 2,
          layout.position.y + level * 20,
          layout.position.z + layout.depth / 2
        );
        return modelPosition;
      }

      // For classes and packages: need to add application position offset
      // Check if application context was provided (via _tempApp)
      let application = element._tempApp;

      if (!application) {
        // Try to find the parent application by traversing up the parent chain
        let currentElement = element;
        while (currentElement.parent) {
          currentElement = currentElement.parent;
        }

        // If we found a top-level package, try to find its application by ID pattern
        if (currentElement.id && currentElement.id.includes('.component-')) {
          application = getApplicationFromPackage(
            landscapeData!.structureLandscapeData,
            currentElement.id
          );
        }
      }

      // Get application layout if we found the application
      const appLayout = application ? layoutMap.get(application.id) : null;
      if (!appLayout) {
        // Fallback: use layout center
        return new THREE.Vector3(
          layout.center.x,
          layout.position.y + level * 20,
          layout.center.z
        );
      }

      // For classes/packages: appPosition + modelCenter
      const appPosition = appLayout.position.clone();
      const modelPosition = layout.center.clone();

      return new THREE.Vector3(
        appPosition.x + modelPosition.x,
        modelPosition.y + level * 20,
        appPosition.z + modelPosition.z
      );
    },
    [layoutMap]
  );

  const getLevel = useCallback((element: any): number => {
    if (element.type === 'application') return 2;
    if (element.type === 'package') return 1;
    if (element.type === 'class') return 0;
    return 0;
  }, []);

  // Build HAP tree with optimized debouncing
  useEffect(() => {
    if (!layoutMap || allApplications.length === 0) {
      setIsHAPTreeReady(false);
      return;
    }

    // Use requestAnimationFrame to defer HAP tree building
    // This prevents blocking the main thread during initial render
    const handle = requestAnimationFrame(() => {
      hapSystemManager.buildLandscapeHAPTree(
        allApplications,
        getHAPPosition,
        getLevel
      );
      setIsHAPTreeReady(true);
    });

    return () => cancelAnimationFrame(handle);
  }, [layoutMap, allApplications, getHAPPosition, getLevel]);

  const cameraControlsRef = useRef<CameraControls>(null);

  // Initialize camera controls store
  useCameraControls(cameraControlsRef);

  // Function to map setting values to camera controls mouse button constants
  const getMouseMapping = (action: string): number => {
    switch (action) {
      case 'NONE':
        return 0; // None
      case 'ROTATE':
        return 1; // ROTATE
      case 'TRUCK':
        return 2; // TRUCK
      case 'SCREEN_PAN':
        return 4; // SCREEN_PAN
      case 'OFFSET':
        return 8; // SCREEN_PAN
      case 'DOLLY':
        return 16; // DOLLY
      case 'ZOOM':
        return 32; // ZOOM
      default:
        return 0; // None
    }
  };

  const { isCommRendered } = useConfigurationStore(
    useShallow((state) => ({
      isCommRendered: state.isCommRendered,
    }))
  );

  const { applicationModels, interAppCommunications } =
    useLandscapeDataWatcher(landscapeData);

  const { resetVisualizationState } = useVisualizationStore(
    useShallow((state) => ({
      resetVisualizationState: state.actions.resetVisualizationState,
    }))
  );

  const [position, setPosition] = useState(new THREE.Vector3());

  useEffect(() => {
    if (landscapeData) {
      // Use layout of landscape data watcher
      setLayoutMap(null);
      const allPackages = getAllApplicationsInLandscape(
        landscapeData.structureLandscapeData
      )
        .filter((app) => !removedComponentIds.has(app.id))
        .map((app) => getAllPackagesInApplication(app))
        .flat()
        .filter((pkg) => !removedComponentIds.has(pkg.id));
      const packagesIds = new Set(allPackages.map((pkg) => pkg.id));

      const allClasses = getAllApplicationsInLandscape(
        landscapeData.structureLandscapeData
      )
        .filter((app) => !removedComponentIds.has(app.id))
        .map((app) => getAllClassesInApplication(app))
        .flat()
        .filter((classModel) => !removedComponentIds.has(classModel.id));
      const classIds = new Set(allClasses.map((classModel) => classModel.id));

      const communicationIds = new Set(
        interAppCommunications.map((comm) => comm.id)
      );

      const entityIds = new Set([
        ...packagesIds,
        ...classIds,
        ...communicationIds,
      ]);

      // Remove all ids that are no longer part of the landscape
      useVisualizationStore.getState().actions.filterEntityIds(entityIds);
    }
  }, [landscapeData, interAppCommunications]);

  const updateLayout = async () => {
    if (!landscapeData) return;

    const layoutMap = await layoutLandscape(
      landscapeData.structureLandscapeData.k8sNodes!,
      getApplicationsFromNodes(
        landscapeData.structureLandscapeData.nodes
      ).filter((app) => !removedComponentIds.has(app.id)),
      useVisualizationStore.getState().removedComponentIds ?? new Set<string>()
    );
    useLayoutStore.getState().updateLayouts(layoutMap);
    setLayoutMap(layoutMap);
  };

  useEffect(() => {
    updateLayout();
  }, [
    componentLabelPlacement,
    appLabelMargin,
    applicationAspectRatio,
    applicationDistance,
    applicationLayoutAlgorithm,
    appMargin,
    classDepthMetric,
    classDepthMetricMultiplier,
    classFootprint,
    classLayoutAlgorithm,
    classMargin,
    classWidthMetric,
    classWidthMetricMultiplier,
    closedComponentHeight,
    openedComponentHeight,
    packageLabelMargin,
    packageLayoutAlgorithm,
    packageMargin,
    removedComponentIds,
    spiralCenterOffset,
    spiralGap,
  ]);

  useEffect(() => {
    return () => {
      resetVisualizationState();
    };
  }, []);

  // Keyboard handler for magnifier toggle
  const handleKeyDown = (event: KeyboardEvent) => {
    // Ignore if typing in an input field
    if (
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement
    ) {
      return;
    }

    // Toggle magnifier on M key press
    if (event.key === 'M' || event.key === 'm') {
      useUserSettingsStore
        .getState()
        .updateSetting('isMagnifierActive', !isMagnifierActive);
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMagnifierActive]);

  const minimapEnabled = useUserSettingsStore(
    (state) => state.visualizationSettings.isMinimapEnabled.value
  );

  return (
    <>
      <Canvas
        id="three-js-canvas"
        className={'webgl'}
        gl={{
          powerPreference: 'high-performance',
          preserveDrawingBuffer: true,
        }}
        style={{ background: sceneBackgroundColor }}
        onMouseMove={(e) => {
          if (isMagnifierActive) {
            setMousePos({
              x: e.clientX,
              y: window.innerHeight - e.clientY,
            });
          }
        }}
      >
        {xrStore ? null : (
          <>
            <CameraControls
              ref={cameraControlsRef}
              dollySpeed={0.3}
              draggingSmoothTime={0.05}
              maxDistance={250}
              maxPolarAngle={0.5 * Math.PI}
              makeDefault
              minDistance={1}
              mouseButtons={{
                left: getMouseMapping(leftMouseButtonAction) as any,
                middle: getMouseMapping(middleMouseButtonAction) as any,
                wheel: getMouseMapping(mouseWheelAction) as any,
                right: getMouseMapping(rightMouseButtonAction) as any,
              }}
              smoothTime={0.5}
            />
            <PerspectiveCamera
              position={INITIAL_CAMERA_POSITION}
              fov={cameraFov}
              near={cameraNear}
              far={cameraFar}
              makeDefault
            />
            {/* Insert Layer Handler here inside the Canvas */}
            <CameraLayerHandler />

            {minimapEnabled && (
              <MinimapView mainCameraControls={cameraControlsRef} />
            )}
            {isMagnifierActive && (
              <Magnify
                position={mousePos}
                zoom={magnifierZoom}
                exp={magnifierExponent}
                radius={magnifierRadius}
                outlineColor={parseInt(
                  magnifierOutlineColor.replace('#', ''),
                  16
                )}
                outlineThickness={magnifierOutlineThickness}
                antialias={magnifierAntialias}
              />
            )}
            <SpectateCameraController />
            <CollaborationCameraSync />
          </>
        )}
        <XR store={xrStore || createXRStore({})}>
          <IfInSessionMode allow={['immersive-ar', 'immersive-vr']}>
            <XROrigin position={position}>
              <ControllerMenu handedness="left" />
              <ControllerMenu handedness="right" />
            </XROrigin>
            <TeleportTarget onTeleport={setPosition}>
              <Suspense>
                <mesh
                  name="floor"
                  position={[0, -0.1, 0]}
                  rotation={[-Math.PI / 2, 0, 0]}
                >
                  <planeGeometry attach="geometry" args={[200, 200]} />
                  <meshBasicMaterial attach="material" map={floorTexture} />
                </mesh>
              </Suspense>
            </TeleportTarget>
          </IfInSessionMode>
          <LandscapeR3F
            layout={applicationModels[0]?.boxLayoutMap.get('landscape')}
          >
            {applicationModels.map((appModel) => (
              <CodeCity
                key={appModel.application.id}
                applicationData={appModel}
                layoutMap={layoutMap || appModel.boxLayoutMap}
              />
            ))}
            {isCommRendered &&
              interAppCommunications.map((communication) => (
                <CommunicationR3F
                  key={communication.id}
                  communicationModel={communication}
                  applicationElement={communication.sourceApp}
                  layoutMap={layoutMap || applicationModels[0].boxLayoutMap}
                  applicationModels={applicationModels}
                />
              ))}
          </LandscapeR3F>
          <ClusterCentroidsR3F />
          <AutoComponentOpenerR3F />
          <AnimatedPing />
          <TraceReplayOverlayR3F />
          <ambientLight />
          <directionalLight
            name="DirectionalLight"
            ref={directionalLightRef}
            intensity={2}
            position={[5, 10, -20]}
            castShadow={castShadows}
          />
          {showLightHelper && directionalLightRef.current && (
            <directionalLightHelper
              args={[directionalLightRef.current, 2, 0x0000ff]}
            />
          )}
          {showFpsCounter && (
            <>
              <Stats showPanel={0} className="stats0" />
              <Stats showPanel={1} className="stats1" />
              <Stats showPanel={2} className="stats2" />
            </>
          )}
          {showAxesHelper && <axesHelper args={[5]} />}
        </XR>
      </Canvas>
    </>
  );
}
