import { CameraControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import LocalUserMarker, {
  MinimapMarkerAnchor,
} from 'explorviz-frontend/src/components/visualization/rendering/minimap-user-marker';
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

const _size = new THREE.Vector2();
const _clearColor = new THREE.Color();

/**
 * Restore full-canvas GL state so R3F's next pass is not clipped to the minimap rect.
 * Three.js setViewport/setScissor take *logical* (CSS) pixels and multiply by DPR
 * internally — never pass canvas.width/height (device pixels) here.
 */
function resetMainViewport(gl: THREE.WebGLRenderer) {
  gl.getSize(_size);
  gl.setScissorTest(false);
  gl.setViewport(0, 0, _size.width, _size.height);
  gl.autoClear = true;
}

function createMinimapCamera() {
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000);
  cam.position.set(0, MINIMAP_HEIGHT, 0);
  cam.up.set(0, 0, -1);
  cam.lookAt(0, 0, 0);
  cam.layers.enableAll();
  return cam;
}

function createMinimapOverrideMaterial() {
  // Unlit material that still reads each mesh's color/map so Lambert/Standard
  // city meshes are visible from the ortho camera without light coupling.
  // Communication edges with enableEdgeColoring use vertexColors + white base —
  // that flag must be copied or lines stay white on the minimap.
  const mat = new THREE.MeshBasicMaterial({
    toneMapped: false,
    side: THREE.DoubleSide,
  });
  mat.onBeforeRender = (_renderer, _scene, _camera, _geometry, object) => {
    const mesh = object as THREE.Mesh;
    const src = mesh.material;
    const srcMat = Array.isArray(src) ? src[0] : src;
    const useVertexColors = Boolean(
      srcMat &&
      'vertexColors' in srcMat &&
      (srcMat as THREE.Material & { vertexColors?: boolean }).vertexColors
    );

    if (mat.vertexColors !== useVertexColors) {
      mat.vertexColors = useVertexColors;
      mat.needsUpdate = true;
    }

    if (srcMat && 'color' in srcMat && srcMat.color instanceof THREE.Color) {
      mat.color.copy(srcMat.color);
    } else {
      mat.color.set(0x888888);
    }
    if (srcMat && 'map' in srcMat) {
      mat.map = (srcMat as THREE.MeshBasicMaterial).map ?? null;
    } else {
      mat.map = null;
    }
    if (srcMat && 'transparent' in srcMat) {
      mat.transparent = Boolean((srcMat as THREE.Material).transparent);
      mat.opacity =
        'opacity' in srcMat ? Number((srcMat as THREE.Material).opacity) : 1;
    } else {
      mat.transparent = false;
      mat.opacity = 1;
    }
  };
  return mat;
}

export default function MinimapView({
  mainCameraControls,
  landscapeData,
}: MinimapViewProps) {
  // Own the camera in a ref — drei's <OrthographicCamera> ref is unreliable
  // (useImperativeHandle with [] deps can stick on null). Mutated only in
  // useFrame / event handlers so React Compiler immutability rules stay happy.
  const minimapCamRef = useRef<THREE.OrthographicCamera | null>(null);
  const getMinimapCam = () => {
    if (!minimapCamRef.current) {
      minimapCamRef.current = createMinimapCamera();
    }
    return minimapCamRef.current;
  };

  const [minimapOverrideMaterial] = useState(createMinimapOverrideMaterial);
  // Stable scene identity for the marker portal (not a ref — must be readable in render)
  const [minimapScene] = useState(() => new THREE.Scene());

  const { gl, invalidate } = useThree();

  // Get the minimap corner, padding, size and shape
  const zoom = useUserSettingsStore(
    (state) => state.visualizationSettings.minimapZoom
  );
  const minimapMarkerSize = useUserSettingsStore(
    (state) => state.visualizationSettings.minimapMarkerSize.value
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
  // Logical (CSS) pixel rect — same space as gl.setViewport / pointer events
  const minimapRectRef = useRef({ x: 0, y: 0, w: 0, h: 0 });

  const markerAnchorRef = useRef<MinimapMarkerAnchor>({
    x: 0,
    y: 1,
    z: 0,
    scale: 0.25,
    facingX: 0,
    facingZ: -1,
    rotateWithView: false,
  });

  // the bounds of the (loaded) landscape (used so that the minimap does not go out of the bounds, even if the user does)
  const landscapeBoundsRef = useRef<THREE.Box3>(FALLBACK_BOUNDS.clone());
  const boundsReady = useRef(false);

  // Important vectors that should not be re-instantiated in every pass of useFrame
  // instead only the value is changed when necessary
  const scratchRef = useRef({
    userTarget: new THREE.Vector3(),
    clampedPos: new THREE.Vector3(),
    size: new THREE.Vector3(),
    center: new THREE.Vector3(),
    box: new THREE.Box3(),
    lookTarget: new THREE.Vector3(),
    facing: new THREE.Vector3(),
  });

  // Disable the cameraControls for the main camera when minimap is in fullscreen mode
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
      // Minimap rect is stored in logical (CSS) pixels to match setViewport.
      const rect = canvas.getBoundingClientRect();
      const clientX = event.clientX - rect.left;
      const clientY = rect.height - (event.clientY - rect.top);

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

          if (mainCameraControls.current) {
            const controls = mainCameraControls.current;
            const minimapCam = getMinimapCam();

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
      const rect = canvas.getBoundingClientRect();
      const clientX = event.clientX - rect.left;
      const clientY = rect.height - (event.clientY - rect.top);

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
      resetMainViewport(gl);
    };
  }, [gl, isFullscreen, mainCameraControls, minimapShape, minimapRotate]);

  // Whenever the landscape changes boundsReady is set to zero so they are recomputed in useFrame loop
  useEffect(() => {
    boundsReady.current = false;
  }, [landscapeData]);

  // Cities/districts/buildings use dedicated layers (1–6). Start from enableAll so
  // nothing is missed, then honour the minimap visibility toggles.
  const syncMinimapLayers = (cam: THREE.Camera) => {
    cam.layers.enableAll();
    if (!showFoundation) cam.layers.disable(sceneLayers.Foundation);
    if (!showDistricts) cam.layers.disable(sceneLayers.District);
    if (!showBuildings) cam.layers.disable(sceneLayers.Building);
    if (!showCommunication) cam.layers.disable(sceneLayers.Communication);
    if (!showLabels) cam.layers.disable(sceneLayers.Label);
  };

  // RENDER LOOP (Manual rendering overwrites default R3F rendering)
  // Priority > 0 takes over R3F's automatic render — we must draw the main scene ourselves.
  // Read gl/scene/camera from the frame state so mutations are not treated as
  // illegal changes to useThree() hook return values.
  useFrame((state) => {
    const { gl: frameGl, scene: mainScene, camera: mainCamera } = state;
    if (!mainCameraControls.current || frameGl.xr.isPresenting) return;

    const minimapCam = getMinimapCam();
    const scratch = scratchRef.current;

    syncMinimapLayers(minimapCam);

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

    // Logical (CSS) pixels — required by gl.setViewport / setScissor (they apply DPR).
    // Using canvas.width or multiplying by getPixelRatio() double-scales on Retina /
    // Mac scaled displays and only shifts the main view instead of drawing a minimap.
    const totalWidth = state.size.width;
    const totalHeight = state.size.height;
    let viewX: number;
    let viewY: number;
    let viewW: number;
    let viewH: number;
    if (isFullscreen) {
      const dim = Math.min(totalWidth, totalHeight) * 0.9;
      viewW = Math.round(dim);
      viewH = Math.round(dim);
      viewX = Math.round((totalWidth - viewW) / 2);
      viewY = Math.round((totalHeight - viewH) / 2);
    } else {
      viewW = Math.round(minimapWidth);
      viewH = Math.round(minimapHeight);
      const padX = Math.round(minimapPaddingX.value);
      const padY = Math.round(minimapPaddingY.value);

      switch (minimapCorner) {
        case 'top-left':
          viewX = padX;
          viewY = totalHeight - viewH - padY;
          break;
        case 'top-middle':
          viewX = Math.round((totalWidth - viewW) / 2);
          viewY = totalHeight - viewH - padY;
          break;
        case 'top-right':
          viewX = totalWidth - viewW - padX;
          viewY = totalHeight - viewH - padY;
          break;
        case 'middle-right':
          viewX = totalWidth - viewW - padX;
          viewY = Math.round((totalHeight - viewH) / 2);
          break;
        case 'bottom-left':
          viewX = padX;
          viewY = padY;
          break;
        case 'bottom-middle':
          viewX = Math.round((totalWidth - viewW) / 2);
          viewY = padY;
          break;
        case 'bottom-right':
          viewX = totalWidth - viewW - padX;
          viewY = padY;
          break;
        case 'middle-left':
          viewX = padX;
          viewY = Math.round((totalHeight - viewH) / 2);
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

    // Zoom / Size — match the original square ortho frustum
    bounds.getSize(scratch.size);
    const maxDim = Math.max(scratch.size.x, scratch.size.z);
    const validMaxDim = maxDim > 0 ? maxDim : 200;

    const dist = isFullscreen ? 1 : zoom.value || 1;
    const cameraViewRadius =
      (isFullscreen ? validMaxDim * 1.1 : validMaxDim) / 2 / dist;

    bounds.getCenter(scratch.center);
    // Sit above the landscape AABB — layout Y is often not 0
    const camY = bounds.max.y + MINIMAP_HEIGHT;
    const targetY = scratch.center.y;

    minimapCam.left = -cameraViewRadius;
    minimapCam.right = cameraViewRadius;
    minimapCam.top = cameraViewRadius;
    minimapCam.bottom = -cameraViewRadius;
    minimapCam.near = 0.1;
    minimapCam.far = Math.max(camY - bounds.min.y + 50, MINIMAP_HEIGHT * 2);
    minimapCam.updateProjectionMatrix();

    // When rotate is on, always pivot around the user so orientation matches the
    // main view. Otherwise: follow user when zoomed, landscape center at zoom=1.
    const pivotOnUser =
      !isFullscreen &&
      (minimapRotate || (dist !== 1 && minimapMode !== 'landscape'));
    if (pivotOnUser) {
      minimapCam.position.set(scratch.clampedPos.x, camY, scratch.clampedPos.z);
    } else {
      minimapCam.position.set(scratch.center.x, camY, scratch.center.z);
    }

    // Screen-up = horizontal look direction of the main camera (camera → target
    // on XZ). That keeps minimap rotation aligned with the normal view.
    const rotateWithView = !isFullscreen && minimapRotate;
    if (rotateWithView) {
      mainCameraControls.current.getTarget(scratch.lookTarget);
      scratch.facing.set(
        scratch.lookTarget.x - mainCamera.position.x,
        0,
        scratch.lookTarget.z - mainCamera.position.z
      );
      if (scratch.facing.lengthSq() < 1e-8) {
        // Looking nearly straight down — fall back to azimuth
        const az = mainCameraControls.current.azimuthAngle;
        scratch.facing.set(-Math.sin(az), 0, -Math.cos(az));
      } else {
        scratch.facing.normalize();
      }
      minimapCam.up.copy(scratch.facing);
    } else {
      minimapCam.up.set(0, 0, -1); // north-up
      scratch.facing.set(0, 0, -1);
    }
    minimapCam.lookAt(minimapCam.position.x, targetY, minimapCam.position.z);
    minimapCam.updateMatrixWorld();

    // Keep the user marker just under the ortho camera and sized relative to the
    // view so it stays visible after cam height follows landscape bounds.
    // Base factor 0.03; setting default 5 matches the previous hard-coded size.
    const markerSizeFactor = Math.max(minimapMarkerSize, 0.1) * 0.03;
    const markerScale = Math.max(cameraViewRadius * markerSizeFactor, 0.15);
    markerAnchorRef.current.y = camY - 1;
    markerAnchorRef.current.scale = markerScale;
    markerAnchorRef.current.facingX = scratch.facing.x;
    markerAnchorRef.current.facingZ = scratch.facing.z;
    markerAnchorRef.current.rotateWithView = rotateWithView;

    // Marker useFrame (priority 0) runs before this pass — apply height/scale /
    // facing here so they match the camera used for this frame's render.
    const marker = minimapScene.getObjectByName('minimap-user-marker');
    if (marker) {
      marker.position.y = camY - 1;
      marker.scale.set(markerScale, markerScale, markerScale);
      if (rotateWithView) {
        marker.rotation.set(
          -Math.PI / 2,
          Math.atan2(-scratch.facing.x, -scratch.facing.z),
          0,
          'YXZ'
        );
      }
    }

    // --- Rendering ---
    // Main view, then minimap drawn directly into a scissored sub-rect (same
    // approach as the original working minimap before the FBO pass).

    frameGl.setRenderTarget(null);
    frameGl.setViewport(0, 0, totalWidth, totalHeight);
    frameGl.setScissorTest(false);
    frameGl.autoClear = true;
    frameGl.render(mainScene, mainCamera);

    frameGl.getClearColor(_clearColor);
    const originalClearAlpha = frameGl.getClearAlpha();

    frameGl.autoClear = false;
    frameGl.setViewport(viewX, viewY, viewW, viewH);
    frameGl.setScissor(viewX, viewY, viewW, viewH);
    frameGl.setScissorTest(true);

    frameGl.setClearColor(minimap_minimapBgColor.value, 1);
    frameGl.clear(true, true);

    // Pass 1: city geometry with unlit override.
    // Skip Label (troika SDF) and Communication (already MeshBasicMaterial with
    // vertexColors / arrow colors — override forces them white).
    syncMinimapLayers(minimapCam);
    minimapCam.layers.disable(sceneLayers.Label);
    minimapCam.layers.disable(sceneLayers.Communication);
    const prevOverride = mainScene.overrideMaterial;
    mainScene.overrideMaterial = minimapOverrideMaterial;
    frameGl.render(mainScene, minimapCam);
    mainScene.overrideMaterial = prevOverride;

    // Pass 2: communication lines + arrows with native materials
    if (showCommunication) {
      frameGl.clearDepth();
      minimapCam.layers.disableAll();
      minimapCam.layers.enable(sceneLayers.Communication);
      frameGl.render(mainScene, minimapCam);
    }

    // Pass 3: labels with native troika materials
    if (showLabels) {
      frameGl.clearDepth();
      minimapCam.layers.disableAll();
      minimapCam.layers.enable(sceneLayers.Label);
      frameGl.render(mainScene, minimapCam);
    }

    frameGl.clearDepth();
    syncMinimapLayers(minimapCam); // restore for marker (default layer)
    frameGl.render(minimapScene, minimapCam);

    frameGl.setClearColor(_clearColor, originalClearAlpha);
    resetMainViewport(frameGl);
  }, 1);

  // Reset GL state when minimap is disabled so R3F auto-render resumes cleanly
  useEffect(() => {
    return () => {
      minimapScene.clear();
      minimapOverrideMaterial.dispose();
      resetMainViewport(gl);
      invalidate();
    };
  }, [gl, minimapScene, minimapOverrideMaterial, invalidate]);

  return (
    <LocalUserMarker
      minimapScene={minimapScene}
      mainCameraControls={mainCameraControls}
      markerAnchorRef={markerAnchorRef}
    />
  );
}
