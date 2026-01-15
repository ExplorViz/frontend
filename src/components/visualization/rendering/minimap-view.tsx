import { CameraControls, OrthographicCamera } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef, useMemo, useState } from 'react';
import * as THREE from 'three';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { LandscapeData } from 'explorviz-frontend/src/utils/landscape-schemes/landscape-data';
import LocalUserMarker from 'explorviz-frontend/src/components/visualization/rendering/minimap-user-marker';
import { SceneLayers } from 'explorviz-frontend/src/components/visualization/rendering/canvas-wrapper';

interface MinimapViewProps {
  mainCameraControls: React.RefObject<CameraControls>;
  landscapeData: LandscapeData | null;
}

const MINIMAP_HEIGHT = 100;
// The fallback bounds are used to compute the minimap logic when no scene is loaded yet.
// (Without a scene no bounds of a scene can be computed)
const FALLBACK_BOUNDS = new THREE.Box3(
  new THREE.Vector3(-100, 0, -100),
  new THREE.Vector3(100, 0, 100)
);

export default function MinimapView({
  mainCameraControls,
  landscapeData,
}: MinimapViewProps) {
  // Get the scene and cameras etc.
  const cameraRef = useRef<THREE.OrthographicCamera>(null); // Minimap Camera
  const { scene: mainScene, gl, camera: mainCamera } = useThree(); // mainCamera

  // Get the minimap zoom and set up a store for minimap fullscreen
  const zoom = useUserSettingsStore(
    (state) => state.visualizationSettings.zoom
  );
  const minimap_bg_color = useUserSettingsStore(
    (state) => state.visualizationSettings.bg_color
  );

  // Get the minimap layer visibility settings
  const showFoundation = useUserSettingsStore(
    (state) => state.visualizationSettings.layer1.value
  );
  const showDistricts = useUserSettingsStore(
    (state) => state.visualizationSettings.layer2.value
  );
  const showBuildings = useUserSettingsStore(
    (state) => state.visualizationSettings.layer3.value
  );
  const showCommunication = useUserSettingsStore(
    (state) => state.visualizationSettings.layer4.value
  );
  const showLabels = useUserSettingsStore(
    (state) => state.visualizationSettings.layer6.value
  );

  const [isFullscreen, setIsFullscreen] = useState(false);
  // Stores physical WebGL coordinates of the minimap
  const minimapRectRef = useRef({ x: 0, y: 0, w: 0, h: 0 });

  // A scene to store the user marker (only minimap cam will be rendered with it)
  const minimapScene = useMemo(() => new THREE.Scene(), []);

  // the bounds of the (loaded) landscape (used so that the minimap does not go out of the bounds, even if the user does)
  const landscapeBoundsRef = useRef<THREE.Box3>(FALLBACK_BOUNDS.clone());
  const boundsReady = useRef(false);

  // Important vectors that should not be re-instantiated in every pass of useFrame
  // instead only the value is changed when necessary
  const scratch = useMemo(
    () => ({
      userTarget: new THREE.Vector3(),
      clampedPos: new THREE.Vector3(),
      size: new THREE.Vector3(),
      center: new THREE.Vector3(),
      box: new THREE.Box3(),
    }),
    []
  );

  // Disable the cmareaControls for the main camera when minimap is in fullscreen mode
  useEffect(() => {
    if (mainCameraControls.current) {
      mainCameraControls.current.enabled = !isFullscreen;
    }
  }, [isFullscreen, mainCameraControls]);

  // Add event listeners for minimap interaction
  useEffect(() => {
    const canvas = gl.domElement;

    // Handles pointer down event:
    // When clicked on small minimap make full size
    // When clicked on full size minimap teleport to click target
    const handlePointerDown = (event: PointerEvent) => {
      // At first check wether the click was inside the minimap
      const pixelRatio = gl.getPixelRatio();
      const rect = canvas.getBoundingClientRect();
      const clientX = (event.clientX - rect.left) * pixelRatio;
      const clientY = (rect.height - (event.clientY - rect.top)) * pixelRatio;

      const { x, y, w, h } = minimapRectRef.current;

      const isInsideMinimap =
        clientX >= x && clientX <= x + w && clientY >= y && clientY <= y + h;

      // If the map is in fullscreen a click inside the map should teleport the user,
      // otherwise a click inside the map should put it into fullscreen
      if (isFullscreen) {
        if (!isInsideMinimap) {
          setIsFullscreen(false);
        } else {
          event.stopPropagation();

          if (cameraRef.current && mainCameraControls.current) {
            const minimapCam = cameraRef.current;
            const controls = mainCameraControls.current;

            // Calculate Destination
            const u = (clientX - x) / w;
            const v = (clientY - y) / h;

            const localX =
              minimapCam.left + u * (minimapCam.right - minimapCam.left);
            const localY =
              minimapCam.bottom + v * (minimapCam.top - minimapCam.bottom);

            const worldX = minimapCam.position.x + localX;
            const worldZ = minimapCam.position.z - localY;

            // Get Current State
            const currentTarget = new THREE.Vector3();
            const currentPosition = new THREE.Vector3();
            controls.getTarget(currentTarget);
            controls.getPosition(currentPosition);

            // Calculate the Shift of the camera
            // (When only changing the target, the camera rotates what we don't want)
            const deltaX = worldX - currentTarget.x;
            const deltaZ = worldZ - currentTarget.z;

            // Apply Shift to BOTH Position and Target
            // This ensures the "Camera Vector" stays frozen
            const newPosX = currentPosition.x + deltaX;
            const newPosZ = currentPosition.z + deltaZ;

            // Keep the old Y (height) for both position and target
            controls.setLookAt(
              newPosX,
              currentPosition.y,
              newPosZ,
              worldX,
              currentTarget.y,
              worldZ,
              true
            );
            // After teleportation, exit the minimap
            setIsFullscreen(false);
          }
        }
      } else {
        if (isInsideMinimap) {
          event.stopPropagation();
          setIsFullscreen(true);
        }
      }
    };

    // Handle Wheel event
    // When scroll over the small minimap zoom in or out
    const handleWheel = (event: WheelEvent) => {
      // At first check wether the click was inside the minimap
      const pixelRatio = gl.getPixelRatio();
      const rect = canvas.getBoundingClientRect();
      const clientX = (event.clientX - rect.left) * pixelRatio;
      const clientY = (rect.height - (event.clientY - rect.top)) * pixelRatio;

      const { x, y, w, h } = minimapRectRef.current;

      const isInsideMinimap =
        clientX >= x && clientX <= x + w && clientY >= y && clientY <= y + h;

      // When he mouse wheel event was inside the minimap (small screen), then adjust the zoom
      if (isInsideMinimap && !isFullscreen) {
        event.stopPropagation();
        const currentZoom =
          useUserSettingsStore.getState().visualizationSettings.zoom.value;
        useUserSettingsStore
          .getState()
          .updateSetting('zoom', currentZoom + -Math.sign(event.deltaY) * 0.05);
      }
    };

    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('wheel', handleWheel);

    // Clean up function for when the component is unmounted (minimap disabled)
    return () => {
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('wheel', handleWheel);
      gl.setScissorTest(false);
      gl.setViewport(0, 0, canvas.width, canvas.height);
    };
  }, [gl, isFullscreen]);

  // Whenever the landscape changes boundsReady is set to zero so they are recomputed in useFrame loop
  useEffect(() => {
    boundsReady.current = false;
  }, [landscapeData]);

  // Whenever the settings for layer visibility change, update the camera settings
  useEffect(() => {
    if (cameraRef.current) {
      const cam = cameraRef.current;
      const toggleLayer = (layerId: number, isEnabled: boolean) => {
        if (isEnabled) cam.layers.enable(layerId);
        else cam.layers.disable(layerId);
      };

      toggleLayer(SceneLayers.Foundation, showFoundation);
      toggleLayer(SceneLayers.Component, showDistricts);
      toggleLayer(SceneLayers.Clazz, showBuildings);
      toggleLayer(SceneLayers.Communication, showCommunication);
      toggleLayer(SceneLayers.Label, showLabels);
    }
  }, [
    showFoundation,
    showDistricts,
    showBuildings,
    showCommunication,
    showLabels,
  ]);

  // RENDER LOOP (Manual rendering overwrites default R3F rendering)
  useFrame(() => {
    if (!cameraRef.current || !mainCameraControls.current || gl.xr.isPresenting)
      return;

    mainCameraControls.current.getTarget(scratch.userTarget);

    // When the landscape is changed or not yet loaded, (re)compute the bounds
    if (!boundsReady.current) {
      scratch.box.setFromObject(mainScene);
      if (!scratch.box.isEmpty()) {
        landscapeBoundsRef.current.copy(scratch.box);
        boundsReady.current = true;
      }
    }

    // Compute the minimap size values
    const { width: totalWidth, height: totalHeight } = gl.domElement;
    const pixelRatio = gl.getPixelRatio();
    let viewX, viewY, viewW, viewH;
    if (isFullscreen) {
      const dim = Math.min(totalWidth, totalHeight) * 0.9;
      viewW = dim;
      viewH = dim;
      viewX = (totalWidth - viewW) / 2;
      viewY = (totalHeight - viewH) / 2;
    } else {
      const defaultSize = 300 * pixelRatio;
      const maxSize = Math.min(totalWidth, totalHeight) / 3;
      const size = Math.min(defaultSize, maxSize);
      const margin = 20 * pixelRatio;
      viewW = size;
      viewH = size;
      viewX = totalWidth - viewW - margin;
      viewY = margin;
    }
    minimapRectRef.current = { x: viewX, y: viewY, w: viewW, h: viewH };

    // Care for the minimap camera to not get out of landscape bounds
    const minimapCam = cameraRef.current;
    const bounds = landscapeBoundsRef.current;
    scratch.clampedPos.copy(scratch.userTarget);
    scratch.clampedPos.x = THREE.MathUtils.clamp(
      scratch.clampedPos.x,
      bounds.min.x,
      bounds.max.x
    );
    scratch.clampedPos.z = THREE.MathUtils.clamp(
      scratch.clampedPos.z,
      bounds.min.z,
      bounds.max.z
    );

    // Compute the frustum of the orthographic camera
    bounds.getSize(scratch.size);
    const maxDim = Math.max(scratch.size.x, scratch.size.z);
    const validMaxDim = maxDim > 0 ? maxDim : 200;

    const dist = isFullscreen ? 1 : zoom.value || 1;
    const cameraViewRadius = validMaxDim / 2 / dist;

    minimapCam.left = -cameraViewRadius;
    minimapCam.right = cameraViewRadius;
    minimapCam.top = cameraViewRadius;
    minimapCam.bottom = -cameraViewRadius;
    minimapCam.updateProjectionMatrix();

    // Set the camera position based on wether the camera is zoomed or not
    if (dist !== 1) {
      minimapCam.position.set(
        scratch.clampedPos.x,
        MINIMAP_HEIGHT,
        scratch.clampedPos.z
      );
    } else {
      bounds.getCenter(scratch.center);
      minimapCam.position.set(
        scratch.center.x,
        MINIMAP_HEIGHT,
        scratch.center.z
      );
    }

    //Rendering

    // Render main scene
    gl.setViewport(0, 0, totalWidth, totalHeight);
    gl.setScissorTest(false);
    gl.autoClear = true;
    gl.render(mainScene, mainCamera);

    // Render minimap with main scene
    gl.autoClear = false;
    gl.setViewport(viewX, viewY, viewW, viewH);
    gl.setScissor(viewX, viewY, viewW, viewH);
    gl.setScissorTest(true);

    const originalClearColor = new THREE.Color();
    gl.getClearColor(originalClearColor);
    const originalClearAlpha = gl.getClearAlpha();

    gl.setClearColor(minimap_bg_color.value, 1);
    gl.clear(true, true);

    gl.clearDepth();
    gl.render(mainScene, minimapCam);

    // Render minimap with user marker
    gl.clearDepth();
    gl.render(minimapScene, minimapCam);

    gl.setClearColor(originalClearColor, originalClearAlpha);
    gl.setScissorTest(false);
  }, 1);

  return (
    <>
      <OrthographicCamera
        ref={cameraRef}
        makeDefault={false}
        position={[0, MINIMAP_HEIGHT, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        near={0.1}
        far={1000}
        manual
      />
      <LocalUserMarker
        minimapScene={minimapScene}
        mainCameraControls={mainCameraControls}
      />
    </>
  );
}
