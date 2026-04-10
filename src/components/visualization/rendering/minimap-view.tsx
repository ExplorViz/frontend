import { CameraControls, OrthographicCamera } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import LocalUserMarker from 'explorviz-frontend/src/components/visualization/rendering/minimap-user-marker';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import { LandscapeData } from 'explorviz-frontend/src/utils/landscape-schemes/landscape-data';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

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
  const orthoRef = useRef<THREE.OrthographicCamera>(null);
  // We can just pick the one we need in the render loop.
  const { scene: mainScene, gl, camera: mainCamera } = useThree(); // mainCamera

  // Get the minimap corner, padding, size and shape
  const zoom = useUserSettingsStore(
    (state) => state.visualizationSettings.minimapZoom
  );
  const minimap_minimapBgColor = useUserSettingsStore(
    (state) => state.visualizationSettings.minimapBgColor
  );
  const minimapCorner = useUserSettingsStore(
    (state) => state.visualizationSettings.minimapCorner.value
  );
  const minimapPaddingX = useUserSettingsStore(
    (state) => state.visualizationSettings.minimapMarginX
  );
  const minimapPaddingY = useUserSettingsStore(
    (state) => state.visualizationSettings.minimapMarginY
  );
  const minimapWidth: number = useUserSettingsStore(
    (state) => state.visualizationSettings.minimapWidth.value
  );
  const minimapHeight: number = useUserSettingsStore(
    (state) => state.visualizationSettings.minimapHeight.value
  );
  const minimapShape = useUserSettingsStore(
    (state) => state.visualizationSettings.minimapShape.value
  );
  const minimapMode = useUserSettingsStore(
    (state) => state.visualizationSettings.minimapMode.value
  );
  const minimapRotate = useUserSettingsStore(
    (state) => state.visualizationSettings.minimapRotate.value
  );

  const sceneLayers = useVisualizationStore((state) => state.sceneLayers);

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
  const minimapRectRef = useRef<{
    x: number;
    y: number;
    w: number;
    h: number;
    fbo?: THREE.WebGLRenderTarget;
  }>({ x: 0, y: 0, w: 0, h: 0 });

  // For round minimap
  const stencilScene = useRef(new THREE.Scene()).current;
  useEffect(() => {
    let geometry: THREE.BufferGeometry;

    if (minimapShape === 'round' && !isFullscreen) {
      geometry = new THREE.CircleGeometry(1, 64);
    } else {
      geometry = new THREE.PlaneGeometry(2, 2);
    }

    const material = new THREE.MeshBasicMaterial();
    const mesh = new THREE.Mesh(geometry, material);
    stencilScene.add(mesh);
    return () => {
      stencilScene.clear();
      geometry.dispose();
      material.dispose();
    };
  }, [stencilScene, minimapShape, isFullscreen]);

  const stencilCamera = useRef(
    new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  ).current;

  // A scene to store the user marker (only minimap cam will be rendered with it)
  const minimapScene = useRef(new THREE.Scene()).current;

  // the bounds of the (loaded) landscape (used so that the minimap does not go out of the bounds, even if the user does)
  const landscapeBoundsRef = useRef<THREE.Box3>(FALLBACK_BOUNDS.clone());
  const boundsReady = useRef(false);

  // Important vectors that should not be re-instantiated in every pass of useFrame
  // instead only the value is changed when necessary
  const scratch = useRef({
    userTarget: new THREE.Vector3(),
    clampedPos: new THREE.Vector3(),
    size: new THREE.Vector3(),
    center: new THREE.Vector3(),
    box: new THREE.Box3(),
  }).current;

  // Disable the cmareaControls for the main camera when minimap is in fullscreen mode
  useEffect(() => {
    if (mainCameraControls.current) {
      // eslint-disable-next-line
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

      let isInsideMinimap =
        clientX >= x && clientX <= x + w && clientY >= y && clientY <= y + h;

      if (isInsideMinimap && minimapShape === 'round' && !isFullscreen) {
        const centerX = x + w / 2;
        const centerY = y + h / 2;
        const dist = Math.sqrt(
          Math.pow(clientX - centerX, 2) + Math.pow(clientY - centerY, 2)
        );
        if (dist > w / 2) {
          isInsideMinimap = false;
        }
      }

      // If the map is in fullscreen a click inside the map should teleport the user,
      // otherwise a click inside the map should put it into fullscreen
      if (isFullscreen) {
        if (!isInsideMinimap) {
          setIsFullscreen(false);
        } else {
          event.stopPropagation();

          if (orthoRef.current && mainCameraControls.current) {
            const minimapCam = orthoRef.current!;
            const controls = mainCameraControls.current;

            // Calculate Destination
            const u = (clientX - x) / w;
            const v = (clientY - y) / h;

            let worldX = 0;
            let worldZ = 0;

            if (minimapCam instanceof THREE.OrthographicCamera) {
              const localX =
                minimapCam.left + u * (minimapCam.right - minimapCam.left);
              const localY =
                minimapCam.bottom + v * (minimapCam.top - minimapCam.bottom);

              worldX = minimapCam.position.x + localX;
              worldZ = minimapCam.position.z - localY;
            }

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

      let isInsideMinimap =
        clientX >= x && clientX <= x + w && clientY >= y && clientY <= y + h;

      if (isInsideMinimap && minimapShape === 'round' && !isFullscreen) {
        const centerX = x + w / 2;
        const centerY = y + h / 2;
        const dist = Math.sqrt(
          Math.pow(clientX - centerX, 2) + Math.pow(clientY - centerY, 2)
        );
        if (dist > w / 2) {
          isInsideMinimap = false;
        }
      }

      // When he mouse wheel event was inside the minimap (small screen), then adjust the zoom
      if (isInsideMinimap && !isFullscreen) {
        event.stopPropagation();
        const minimapZoomSetting =
          useUserSettingsStore.getState().visualizationSettings.minimapZoom;
        const currentZoom = minimapZoomSetting.value;
        const { min, max } = minimapZoomSetting.range;

        // Calculate new zoom and clamp it to the range
        const newZoom = currentZoom + -Math.sign(event.deltaY) * 0.05;
        const clampedZoom = Math.max(min, Math.min(max, newZoom));

        useUserSettingsStore
          .getState()
          .updateSetting('minimapZoom', clampedZoom);
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
  }, [gl, isFullscreen, mainCameraControls, minimapShape, minimapRotate]);

  // Whenever the landscape changes boundsReady is set to zero so they are recomputed in useFrame loop
  useEffect(() => {
    boundsReady.current = false;
  }, [landscapeData]);

  // Whenever the settings for layer visibility change, update the camera settings
  useEffect(() => {
    if (orthoRef.current) {
      const cam = orthoRef.current;
      const toggleLayer = (layerId: number, isEnabled: boolean) => {
        if (isEnabled) cam.layers.enable(layerId);
        else cam.layers.disable(layerId);
      };

      toggleLayer(sceneLayers.Foundation, showFoundation);
      toggleLayer(sceneLayers.District, showDistricts);
      toggleLayer(sceneLayers.Building, showBuildings);
      toggleLayer(sceneLayers.Communication, showCommunication);
      toggleLayer(sceneLayers.Label, showLabels);
    }
  }, [
    showFoundation,
    showDistricts,
    showBuildings,
    showCommunication,
    showLabels,
    sceneLayers,
  ]);

  // RENDER LOOP (Manual rendering overwrites default R3F rendering)
  useFrame(() => {
    const minimapCam = orthoRef.current;

    if (!minimapCam || !mainCameraControls.current || gl.xr.isPresenting)
      return;

    if (minimapMode === 'target') {
      mainCameraControls.current.getTarget(scratch.userTarget);
    } else if (minimapMode === 'landscape') {
      landscapeBoundsRef.current.getCenter(scratch.userTarget);
    } else {
      // Use camera position by default
      scratch.userTarget.copy(mainCamera.position);
    }

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
      const w = minimapWidth * pixelRatio;
      const h = minimapHeight * pixelRatio;
      const padX = minimapPaddingX.value * pixelRatio;
      const padY = minimapPaddingY.value * pixelRatio;
      viewW = w;
      viewH = h;

      switch (minimapCorner) {
        case 'top-left':
          viewX = padX;
          viewY = totalHeight - viewH - padY;
          break;
        case 'top-middle':
          viewX = (totalWidth - viewW) / 2;
          viewY = totalHeight - viewH - padY;
          break;
        case 'top-right':
          viewX = totalWidth - viewW - padX;
          viewY = totalHeight - viewH - padY;
          break;
        case 'middle-right':
          viewX = totalWidth - viewW - padX;
          viewY = (totalHeight - viewH) / 2;
          break;
        case 'bottom-left':
          viewX = padX;
          viewY = padY;
          break;
        case 'bottom-middle':
          viewX = (totalWidth - viewW) / 2;
          viewY = padY;
          break;
        case 'bottom-right':
          viewX = totalWidth - viewW - padX;
          viewY = padY;
          break;
        case 'middle-left':
          viewX = padX;
          viewY = (totalHeight - viewH) / 2;
          break;
        default:
          viewX = totalWidth - viewW - padX;
          viewY = padY;
          break;
      }
    }
    minimapRectRef.current = { x: viewX, y: viewY, w: viewW, h: viewH };

    // --- Update Camera Rotation/Zoom ---
    const bounds = landscapeBoundsRef.current;

    if (minimapMode !== 'landscape' && !isFullscreen) {
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
    } else {
      // In landscape mode OR fullscreen, always center
      bounds.getCenter(scratch.clampedPos);
    }

    // Zoom / Size
    bounds.getSize(scratch.size);
    const maxDim = Math.max(scratch.size.x, scratch.size.z);
    const validMaxDim = maxDim > 0 ? maxDim : 200;

    const aspect = viewW / viewH;
    const dist = isFullscreen ? 1 : zoom.value || 1;

    let viewSize = validMaxDim / dist;

    if (isFullscreen) {
      viewSize = validMaxDim * 1.1;
    }

    // We set top/bottom/left/right to match aspect ratio
    if (minimapCam instanceof THREE.OrthographicCamera) {
      minimapCam.left = (-viewSize * aspect) / 2;
      minimapCam.right = (viewSize * aspect) / 2;
      minimapCam.top = viewSize / 2;
      minimapCam.bottom = -viewSize / 2;
      minimapCam.updateProjectionMatrix();

      minimapCam.position.set(
        scratch.clampedPos.x,
        MINIMAP_HEIGHT,
        scratch.clampedPos.z
      );
    }

    // Standard rotation: look down (-PI/2 around X)
    minimapCam.rotation.set(-Math.PI / 2, 0, 0);

    if (!isFullscreen && minimapRotate) {
      minimapCam.rotation.z = mainCameraControls.current.azimuthAngle;
    }
    minimapCam.updateMatrixWorld();

    // End Camera Update

    //Rendering

    // Render main scene
    gl.setViewport(0, 0, totalWidth, totalHeight);
    gl.setScissorTest(false);
    // eslint-disable-next-line
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

    // --- FBO Handling for Round Minimap ---
    // We use a lazy-initialized FBO (render target) attached to the component instance via a ref
    // to avoid re-creating it every frame.
    if (!minimapRectRef.current.fbo) {
      minimapRectRef.current.fbo = new THREE.WebGLRenderTarget(viewW, viewH, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
      });
    }
    const fbo = minimapRectRef.current.fbo;

    // Resize FBO if necessary
    if (fbo.width !== viewW || fbo.height !== viewH) {
      fbo.setSize(viewW, viewH);
    }

    // 1. Render content into FBO
    gl.setRenderTarget(fbo);
    gl.setViewport(0, 0, viewW, viewH); // Render to full FBO
    gl.setScissorTest(false);

    // Clear FBO with background color
    gl.setClearColor(minimap_minimapBgColor.value, 1);
    gl.clear(true, true, true);

    // Render Main Scene
    gl.render(mainScene, minimapCam);

    // Render User Marker
    gl.clearDepth();
    gl.render(minimapScene, minimapCam);

    // 2. Render FBO texture marked by Circle to Screen
    gl.setRenderTarget(null); // Back to screen
    gl.setViewport(viewX, viewY, viewW, viewH);
    gl.setScissor(viewX, viewY, viewW, viewH);
    gl.setScissorTest(true);

    // Prepare Mesh to show FBO texture
    const mesh = stencilScene.children[0] as THREE.Mesh;
    if (mesh && mesh.material instanceof THREE.MeshBasicMaterial) {
      mesh.material.map = fbo.texture;
      mesh.material.color.set(0xffffff); // White so texture colors show
      fbo.texture.colorSpace = gl.outputColorSpace; // Match encoding
    }

    gl.clearDepth(); // Clear depth of the scissor area so overlay is on top

    gl.render(stencilScene, stencilCamera);

    gl.setClearColor(originalClearColor, originalClearAlpha);
    gl.setScissorTest(false);
  }, 1);

  // Clean up FBO and GL state on unmount
  useEffect(() => {
    return () => {
      // Dispose FBO
      if (minimapRectRef.current.fbo) {
        minimapRectRef.current.fbo.dispose();
        minimapRectRef.current.fbo = undefined;
      }

      // Clear scenes
      stencilScene.clear();
      minimapScene.clear();

      // Ensure GL state is fully reset
      gl.setScissorTest(false);
      const canvas = gl.domElement;
      gl.setViewport(0, 0, canvas.width, canvas.height);
      gl.autoClear = true;
    };
  }, [gl, stencilScene, minimapScene]);

  return (
    <>
      <OrthographicCamera
        ref={orthoRef}
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
