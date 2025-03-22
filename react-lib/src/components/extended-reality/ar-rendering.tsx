import { useRef, useState, useEffect } from 'react';
import { useCollaborationSessionStore } from 'react-lib/src/stores/collaboration/collaboration-session';
import { useLocalUserStore } from 'react-lib/src/stores/collaboration/local-user';
import { useMessageSenderStore } from 'react-lib/src/stores/collaboration/message-sender';
import { LandscapeData } from 'react-lib/src/utils/landscape-schemes/landscape-data';
import { usePopupHandlerStore } from 'react-lib/src/stores/popup-handler';
import RenderingLoop from 'react-lib/src/rendering/application/rendering-loop';
import { useApplicationRendererStore } from 'react-lib/src/stores/application-renderer';
import { useHighlightingStore } from 'react-lib/src/stores/highlighting';
import { useSceneRepositoryStore } from 'react-lib/src/stores/repos/scene-repository';
import  { useUserSettingsStore } from 'react-lib/src/stores/user-settings';
import { updateColors } from 'react-lib/src/utils/application-rendering/entity-manipulation';
import { addSpheres } from 'react-lib/src/utils/application-rendering/spheres';
import hitTest from 'react-lib/src/utils/hit-test';
import Raycaster from 'react-lib/src/utils/raycaster';
import ApplicationObject3D from 'react-lib/src/view-objects/3d/application/application-object-3d';
import ClazzCommunicationMesh from 'react-lib/src/view-objects/3d/application/clazz-communication-mesh';
import ClazzMesh from 'react-lib/src/view-objects/3d/application/clazz-mesh';
import ComponentMesh from 'react-lib/src/view-objects/3d/application/component-mesh';
import FoundationMesh from 'react-lib/src/view-objects/3d/application/foundation-mesh';
import * as THREE from 'three';
// import ArSettings from 'explorviz-frontend/services/extended-reality/ar-settings';
import { useARSettingsStore } from 'react-lib/src/stores/extended-reality/ar-settings';
import ArZoomHandler from 'react-lib/src/utils/extended-reality/ar-helpers/ar-zoom-handler';
import {
  EntityMesh,
  isEntityMesh,
} from 'react-lib/src/utils/extended-reality/vr-helpers/detail-info-composer';
import { useHeatmapConfigurationStore } from 'react-lib/src/stores/heatmap/heatmap-configuration';
import { useToastHandlerStore } from 'react-lib/src/stores/toast-handler';
import { ImmersiveView } from 'react-lib/src/rendering/application/immersive-view';
import Landscape3D from 'react-lib/src/view-objects/3d/landscape/landscape-3d';
import LoadingIndicator from 'react-lib/src/components/visualization/rendering/loading-indicator.tsx';
import ArSettingsOpener from 'react-lib/src/components/extended-reality/visualization/page-setup/navbar/ar-settings-opener.tsx';
import CollaborationOpener from 'react-lib/src/components/collaboration/visualization/page-setup/sidebar/customizationbar/collaboration/collaboration-opener.tsx';
import SettingsOpener from 'react-lib/src/components/visualization/page-setup/sidebar/customizationbar/settings/settings-opener.tsx';
import HeatmapInfo from 'react-lib/src/components/heatmap/heatmap-info.tsx';
import { useConfigurationStore } from 'react-lib/src/stores/configuration';

interface ArRenderingArgs {
  readonly landscapeData: LandscapeData;
  readonly openedSettingComponent: string | null;
  readonly showSettingsSidebar: boolean;
  readonly visualizationPaused: boolean;
  switchToOnScreenMode(): void;
  toggleSettingsSidebarComponent(componentPath: string): void; // is passed down to the viz navbar
  openSettingsSidebar(): void;
  closeSettingsSidebar(): void;
  toggleVisualizationUpdating(): void;
}

export default function ArRendering(arRenderingArgs: ArRenderingArgs) {
  const loadingIndicator = LoadingIndicator;
  const arSettingsOpener = ArSettingsOpener;
  const collaborationOpener = CollaborationOpener;
  const settingsOpener = SettingsOpener;
  const heatmapInfo = HeatmapInfo;

  // outerDiv!: HTMLElement;
  const outerDiv = useRef<HTMLElement | null>(null);

  // canvas!: HTMLCanvasElement;
  const canvas = useRef<HTMLCanvasElement | null>(null);

  // currentSession: XRSession | null = null;
  const currentSession = useRef<XRSession | null>(null);

  const [arZoomHandler, setArZoomHandler] = useState<ArZoomHandler | undefined>(undefined);

  const landscapeMarker = useRef<THREE.Group>(new THREE.Group());

  const applicationMarkers = useRef<THREE.Group[]>([]);

  // Private variable
  const willDestroyController! = useRef<AbortController>(null);

  const [rendererResolutionMultiplier, setRendererResolutionMultiplier] = useState<number>(2);

  const lastPopupClear = useRef<number>(0);

  const lastOpenAllComponents = useRef<number>(0);

  const [showSettings, setShowSettings] = useState<boolean>(false);

  const localPing = useRef<{ obj: THREE.Object3D; time: number } | undefined | null>(null);

  const [scene, setScene] = useState<THREE.Scene>(new THREE.Scene);

  // Private variable
  const [landscape3D, setLandscape3D] = useState<Landscape3D>(new Landscape3D()); 

  // Private variable
  const renderer! = useRef<THREE.WebGLRenderer | null>(null);

  const updatables = useRef<any[]>([]);

  const raycaster = useRef<Raycaster>(new Raycaster());

  const reticle = useRef<THREE.Mesh>(new THREE.Mesh());

  // Not used?
  // get appSettings() {
  //   return this.userSettings.visualizationSettings;
  // }

  const rightClickMenuItems = () => {
    const pauseItemtitle = arRenderingArgs.visualizationPaused
      ? 'Resume Visualization'
      : 'Pause Visualization';
    const commButtonTitle = useConfigurationStore.getState().isCommRendered
      ? 'Hide Communication'
      : 'Add Communication';
    return [
      { title: 'Leave AR View', action: leaveArView },
      { title: 'Remove Popups', action: removeAllPopups },
      { title: 'Reset View', action: resetView },
      { title: pauseItemtitle, action: arRenderingArgs.toggleVisualizationUpdating },
      {
        title: 'Open All Components',
        action: useApplicationRendererStore.getState().openAllComponentsOfAllApplications,
      },
      {
        title: commButtonTitle,
        action: useApplicationRendererStore.getState().toggleCommunicationRendering,
      },
    ];
  }

  const leaveArView = () => {
    currentSession.current?.end();
    arRenderingArgs.switchToOnScreenMode();
  }

  const outerDivRef = useRef<HTMLElement>(null);

  // #endregion CLASS FIELDS AND GETTERS
  useEffect(() => {

    setScene(useSceneRepositoryStore.getState().getScene('ar', true));
    scene.background = null;

    // useApplicationRendererStore.getState().getOpenApplications().clear(); TODO: Is this mutable array or why would this work?
    setLandscape3D(new Landscape3D());
    scene.add(landscape3D);
    // updatables.push(localUser); TODO: What to do with this?

    document.addEventListener('contextmenu', (event) => event.preventDefault());
    useApplicationRendererStore.setState({landscape3D: landscape3D});

    outerDiv.current = outerDivRef.current;
    initRendering();
  });

  const camera = () => {
    return useLocalUserStore.getState().defaultCamera;
  }

  const [xcamera, setXcamera] = useState<any>(null); // Not used at all

  // #region COMPONENT AND SCENE INITIALIZATION
  //
  const renderingLoop = useRef<RenderingLoop | null>(null);

  /**
   * Calls all three related init functions and adds the three
   * performance panel if it is activated in user settings
   * Private function
   */
  const initRendering = () => {
    initCamera();
    initRenderer();
    initAr();

    setArZoomHandler(new ArZoomHandler(
      useLocalUserStore.getState().defaultCamera,
      // arSettings
    ));

    renderingLoop.current = new RenderingLoop({
      camera: camera,
      scene: scene,
      renderer: renderer.current!,
      updatables: updatables,
      zoomHandler: arZoomHandler!,
    });
    ImmersiveView.instance.registerRenderingLoop(renderingLoop.current);
    const controller = renderer.current!.xr.getController(0);
    // https://immersive-web.github.io/webxr/input-explainer.html
    // controller.addEventListener('select', this.onSelect);
    scene.add(controller);

    window.addEventListener('resize', () => {
      resize();
    });

    addSpheres('skyblue', mousePosition, scene, updatables.current);
    // renderingLoop.updatables.push(this); // How to handle this?
    renderingLoop.current.start();
    initCameraCrosshair();

    // cannot be resized after session started
    resize();

    if (!navigator.xr) {
      console.error('XR not available in navigator.');
      return;
    }

    navigator.xr
      .requestSession('immersive-ar', {
        requiredFeatures: ['hit-test'],
        optionalFeatures: ['dom-overlay', 'dom-overlay-for-handheld-ar'],
        // use document body to display all overlays
        domOverlay: { root: document.body },
      })
      .then(onSessionStarted);
  }

  /**
   * Creates a PerspectiveCamera according to canvas size and sets its initial position
   * Privat function
   */
  const initCamera = () => {
    // Set camera properties
    useLocalUserStore.setState({
      defaultCamera: new THREE.PerspectiveCamera(65,
        document.body.clientWidth / document.body.clientHeight,
        0.01,
        20
      )});
    scene.add(useLocalUserStore.getState().defaultCamera);
  }

  const initCameraCrosshair = () => {
    const geometry = new THREE.RingGeometry(0.0001, 0.0003, 30);
    const material = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const crosshairMesh = new THREE.Mesh(geometry, material);

    useLocalUserStore.getState().defaultCamera.add(crosshairMesh);
    crosshairMesh.position.z = -0.1;
  }

  const handlePinching = (_intersection: THREE.Intersection, delta: number) => {
    landscape3D.scale.multiplyScalar(delta);
  }

  const handleRotate = (_intersection: THREE.Intersection, delta: number) => {
    landscape3D.rotateY(delta);
  }

  const increaseSize = () => {
    landscape3D.scale.multiplyScalar(1.1);
  }

  const decreaseSize = () => {
    landscape3D.scale.multiplyScalar(0.9);
  }

  const rotateLeft = () => {
    landscape3D.rotateY((12.5 * Math.PI) / 180);
  }

  const rotateRight = () => {
    landscape3D.rotateY((-12.5 * Math.PI) / 180);
  }

  const openMenu = () => {
    const position = {
      clientX: 100,
      clientY: window.innerHeight - 200,
      preventDefault: () => {
        // not used atm
      },
    };
    const evt = new CustomEvent('openmenu', {
      detail: {
        srcEvent: position,
      },
      bubbles: true,
      cancelable: true,
    });
    canvas.current!.dispatchEvent(evt);
  }

  /**
   * Initiates a WebGLRenderer
   * Private function
   */
  const initRenderer = () => {
    renderer.current = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      canvas: canvas.current!,
      powerPreference: 'high-performance',
    });
    renderer.current.xr.enabled = true;

    renderer.current.setClearColor(new THREE.Color('lightgrey'), 0);
  }

  // Private function
  const initAr = () => {
    const localReticle = new THREE.Mesh(
      new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial()
    );
    localReticle.matrixAutoUpdate = false;
    localReticle.visible = false;
    reticle.current = localReticle;
    scene.add(localReticle);
    // const button = ARButton.createButton(this.renderer, {
    //   requiredFeatures: ['hit-test'],
    //   optionalFeatures: ['dom-overlay', 'dom-overlay-for-handheld-ar'],
    //   domOverlay: { root: document.body }
    // });
    // button.style.bottom = '70px'
    // this.outerDiv.appendChild(button);
    // this.resize(this.outerDiv)
  }

  const onSessionStarted = async (session: XRSession) => {
    session.addEventListener('end', onSessionEnded);

    renderer.current!.xr.setReferenceSpaceType('local');

    await renderer.current!.xr.setSession(session);
    currentSession.current = session;
  }

  const onSessionEnded = (/* event */) => {
    currentSession.current?.removeEventListener('end', onSessionEnded);
    currentSession.current = null;
    leaveArView();
  }

  const intersectableObjects = () => {
    return scene.children;
  }

  // #endregion COMPONENT AND SCENE INITIALIZATION

  // #region ACTIONS

  const outerDivInserted = async (outerDiv: HTMLElement) => {
    outerDiv = outerDiv;
    initRendering();
  }

  const canvasInserted = (localCanvas: HTMLCanvasElement) => {

    canvas.current = localCanvas;

    canvas.current!.oncontextmenu = (e) => {
      e.preventDefault();
    };
  }

  /**
   * Call this whenever the canvas is resized. Updated properties of camera
   * and renderer.
   *
   * @param outerDiv HTML element containing the canvas
   */
  const resize = (/* outerDiv: HTMLElement */) => {
    // AR view will be fullscreen
    // const { width } = window.screen;
    // const { height } = window.screen;
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.current!.setSize(
      width * rendererResolutionMultiplier,
      height * rendererResolutionMultiplier
    );

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  const resetView = () => {
    landscape3D.scale.setScalar(0.02);
    landscape3D.visible = false;
  }

  const updateRendererResolution = (resolutionMultiplier: number) => {
    setRendererResolutionMultiplier(resolutionMultiplier);
    resize();
  }

  const handlePrimaryCrosshairInteraction = () => {
    const intersection = raycastCenter();
    if (intersection) {
      handlePrimaryInputOn(intersection);
    } else if (reticle.current.visible && !landscape3D.visible) {
      const mesh = landscape3D;
      reticle.current.matrix.decompose(
        mesh.position,
        mesh.quaternion,
        new THREE.Vector3()
      );
      mesh.visible = true;
      reticle.current.visible = false;
    }
  }

  const handleSecondaryCrosshairInteraction = () => {
    const intersection = raycastCenter();

    if (intersection) {
      handleSecondaryInputOn(intersection);
    } else {
      useHighlightingStore.getState().removeHighlightingForAllApplications(true);
    }
  }

  const handleZoomToggle = () => {
    if (arZoomHandler?.zoomEnabled) {
      arZoomHandler?.disableZoom();
    } else {
      arZoomHandler?.enableZoom();
    }
  }

  const handleOpenAllComponents = async () => {
    lastOpenAllComponents.current = Date.now();

    const intersection = raycastCenter();

    if (!(intersection?.object.parent instanceof ApplicationObject3D)) {
      return;
    }

    const applicationObject3D = intersection.object.parent;

    useApplicationRendererStore.getState().openAllComponents(applicationObject3D);
  }

  const handlePing = async () => {
    if (!useCollaborationSessionStore.getState().isOnline) {
      useToastHandlerStore
        .getState()
        .showInfoToastMessage('Offline. <br> Join session with users to ping.');
      return;
    }

    const intersection = raycastCenter();

    if (!(intersection?.object.parent instanceof ApplicationObject3D)) {
      return;
    }

    const parentObj = intersection.object.parent;
    const pingPosition = intersection.point;
    parentObj.worldToLocal(pingPosition);

    useLocalUserStore.getState().ping(parentObj, pingPosition);

    if (!useCollaborationSessionStore.getState().isOnline) {
      if (parentObj instanceof ApplicationObject3D) {
        useMessageSenderStore.getState().sendMousePingUpdate(
          parentObj.getModelId(),
          true,
          pingPosition
        );
      } else {
        useMessageSenderStore.getState().sendMousePingUpdate('landscape', false, pingPosition);
      }
    }
  }

  const handleHeatmapToggle = async () => {
    const intersection = raycastCenter();
    if (
      intersection &&
      intersection.object.parent instanceof ApplicationObject3D
    ) {
      const applicationObject3D = intersection.object.parent;
      if (
        useHeatmapConfigurationStore.getState().currentApplication ===
          applicationObject3D &&
        useHeatmapConfigurationStore.getState().heatmapActive
      ) {
        useHeatmapConfigurationStore.setState({ heatmapActive: false });
        return;
      }
      useHeatmapConfigurationStore
        .getState()
        .setActiveApplication(applicationObject3D);
      useHeatmapConfigurationStore.setState({ heatmapActive: true });
    }
  }

  const handleInfoInteraction = () => {
    // Do not add popup if user long pressed popup button to remove all popups
    if (Date.now() - lastPopupClear.current < 10) return;

    const intersection = raycastCenter();

    if (!intersection) {
      removeUnpinnedPopups();
      return;
    }

    const mesh = intersection.object;
    const position = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    usePopupHandlerStore.getState().addPopup({
      mesh,
      position,
      hovered: true,
    });
  }

  const toggleSettingsPane = () => {
    arRenderingArgs.openSettingsSidebar();
  }

  const removeAllPopups = () => {
    lastPopupClear.current = Date.now();
    usePopupHandlerStore.getState().clearPopups();
  }

  // #endregion ACTIONS

  // #region MOUSE & KEYBOARD EVENT HANDLER

  const handleDoubleClick = (intersection: THREE.Intersection | null) => {
    if (!intersection) return;

    handlePrimaryInputOn(intersection);
  }

  const [mousePosition, setMousePosition] = useState<THREE.Vector3>(new THREE.Vector3(0, 0, 0));

  const handleSingleClick = (intersection: THREE.Intersection | null) => {
    if (!intersection) return;

    mousePosition.copy(intersection.point);

    handleSecondaryInputOn(intersection);
  }

  const handleMouseWheel = (delta: number) => {
    const intersection = raycastCenter();

    if (
      intersection &&
      intersection.object.parent instanceof ApplicationObject3D
    ) {
      const object = intersection.object.parent;

      // Scale hit object with respect to scroll direction and scroll distance
      object.scale.copy(object.scale.multiplyScalar(1 - delta / 25));
    }
  }

  // Private function
  const raycastCenter = () => {
    const possibleObjects = intersectableObjects;
    return raycaster.current.raycasting(
      { x: 0, y: 0 },
      camera,
      possibleObjects
    );
  }

  // #endregion MOUSE & KEYBOARD EVENT HANDLER

  // #region RENDERING

  const hoveredObject = useRef<EntityMesh | null>(null);

  const tick = (delta: number, frame: XRFrame) => {
    const intersection = raycastCenter();
    usePopupHandlerStore.getState().handleHoverOnMesh(intersection?.object);
    if (intersection) {
      const mesh = intersection.object;
      if (isEntityMesh(mesh)) {
        hoveredObject.current = mesh;
        mesh.applyHoverEffect();
      }
    } else {
      if (isEntityMesh(hoveredObject)) {
        hoveredObject.applyHoverEffect();
      }
      hoveredObject.current = null;
    }

    if (renderer.current!.xr.enabled) {
      if (!landscape3D.visible || reticle.current.visible) {
        hitTest(renderer.current!, reticle.current, frame);
      }
    }
    useCollaborationSessionStore.getState().idToRemoteUser.forEach((remoteUser) => {
      remoteUser.update(delta);
    });
  }

  // #endregion RENDERING

  // #region UTILS
  // Private function

  const handlePrimaryInputOn = (intersection: THREE.Intersection) => {
    const localLastOpenComponents = lastOpenAllComponents.current;
    const { object } = intersection;

    function handleApplicationObject(appObject: THREE.Object3D) {
      if (
        !(appObject.parent instanceof ApplicationObject3D) ||
        Date.now() - localLastOpenComponents < 20
      )
        return;

      if (appObject instanceof ComponentMesh) {
        useApplicationRendererStore.getState().toggleComponent(appObject, appObject.parent);
      } else if (appObject instanceof FoundationMesh) {
        useApplicationRendererStore.getState().closeAllComponents(appObject.parent);
      }
    }

    // Handle application hits
    if (object.parent instanceof ApplicationObject3D) {
      handleApplicationObject(object);
    }
  }

  // Private function
  const handleSecondaryInputOn = (intersection: THREE.Intersection) => {
    const { object } = intersection;

    if (
      object instanceof ComponentMesh ||
      object instanceof ClazzMesh ||
      object instanceof ClazzCommunicationMesh
    ) {
      useHighlightingStore.getState().toggleHighlight(object, {
        sendMessage: true,
      });
    }
  }

  const removeUnpinnedPopups = () => {
    usePopupHandlerStore.getState().removeUnpinnedPopups();
  }

  // willDestroy() {
  //   super.willDestroy();
  const willDestroy = () => {
    renderingLoop.current!.stop();
    // Remove event listers.
    willDestroyController.current!.abort();
  }

  const updateColors = () => {
    updateColors();
  }

  return(
    <div className='row' style={height:'100%'}>
      <div className='d-flex col-12' style={flex-direction: 'column'; height: '100%'}>
        <div
          id='rendering'
          ref={outerDivRef}
          {{did-resize this.resize debounce=100}}
        >
          {useHeatmapConfigurationStore.getState().heatmapActive &&(
            <div {React heatmapInfo} />
          )}

          {{#if this.loadNewLandscape.isRunning}}
            <div {{react this.loadingIndicator text='Loading New Landscape'}} />
          {{else if this.addApplication.isRunning}}
            <div {{react this.loadingIndicator text='Loading New Application'}} />
          {{/if}}

          {{#unless @showSettingsSidebar}}
            <div className='ar-right-relative foreground mt-6'>
              <BsButton
                id='arSettingsOpener'
                @onClick={{this.toggleSettingsPane}}
                @type='secondary'
                @outline={{true}}
                title='Settings'
              >
                {{svg-jar 'gear-16' className='octicon align-middle'}}
              </BsButton>
            </div>
          {{/unless}}

          {{! popup(s) }}

          {{#each this.popupHandler.popupData as |d|}}
            <Visualization::Rendering::Popups::PopupCoordinator
              @popupData={{d}}
              @pinPopup={{this.popupHandler.pinPopup}}
              @sharePopup={{this.popupHandler.sharePopup}}
              @removePopup={{this.popupHandler.removePopup}}
              @structureData={{@landscapeData.structureLandscapeData}}
              @toggleHighlightById={{this.highlightingService.toggleHighlightById}}
              @openParents={{this.applicationRenderer.openParents}}
            />
          {{/each}}

          <canvas
            id='threejs-canvas'
            className='webgl position-absolute
              {{if this.hoverHandler.hoveredEntityObj "pointer-cursor"}}'
            {{did-insert this.canvasInserted}}
            {{interaction-modifier
              raycastObjects=this.intersectableObjects
              rendererResolutionMultiplier=this.rendererResolutionMultiplier
              camera=this.camera
              doubleClick=this.handleDoubleClick
              singleClick=this.handleSingleClick
              pinch=this.handlePinching
              rotate=this.handleRotate
            }}
            {{heatmap-renderer camera=this.camera scene=this.scene}}
            {{landscape-data-watcher
              landscapeData=@landscapeData
              landscape3D=this.landscape3D
            }}
            {{collaboration/collaborative-modifier
              raycastObject3D=this.intersectableObjects
              camera=this.localUser.defaultCamera
            }}
          >
            <ContextMenu @items={{this.rightClickMenuItems}} />
          </canvas>

          <div className='ar-left-button-container'>

            <ExtendedReality::Visualization::PageSetup::ArButtons::PopupButton
              @handleInfoInteraction={{this.handleInfoInteraction}}
              @removeAllPopups={{this.removeAllPopups}}
            />

            <ExtendedReality::Visualization::PageSetup::ArButtons::HeatmapButton
              @toggleHeatmap={{this.handleHeatmapToggle}}
            />

            <ExtendedReality::Visualization::PageSetup::ArButtons::ZoomButton
              @arZoomHandler={{this.arZoomHandler}}
              @handleZoomToggle={{this.handleZoomToggle}}
            />

            <div id='ar-minus-interaction-container'>
              <BsButton
                @type='primary'
                className='half-transparent'
                {{on 'click' this.decreaseSize}}
              >
                {{svg-jar 'dash-16' className='octicon align-middle ar-button-svg'}}
              </BsButton>
            </div>

            <div id='ar-left-interaction-container'>
              <BsButton
                @type='primary'
                className='half-transparent'
                {{on 'click' this.rotateLeft}}
              >
                {{svg-jar
                  'arrow-left-16'
                  className='octicon align-middle ar-button-svg'
                }}
              </BsButton>
            </div>

          </div>

          <div className='ar-right-button-container'>

            <div id='ar-three-bars-interaction-container'>
              <BsButton
                @type='primary'
                className='half-transparent'
                {{on 'click' this.openMenu}}
              >
                {{svg-jar
                  'three-bars-16'
                  className='octicon align-middle ar-button-svg'
                }}
              </BsButton>
            </div>

            <ExtendedReality::Visualization::PageSetup::ArButtons::PrimaryInteractionButton
              @handlePrimaryCrosshairInteraction={{this.handlePrimaryCrosshairInteraction}}
              @openAllComponents={{this.handleOpenAllComponents}}
            />

            <ExtendedReality::Visualization::PageSetup::ArButtons::SecondaryInteractionButton
              @handleSecondaryCrosshairInteraction={{this.handleSecondaryCrosshairInteraction}}
            />

            <ExtendedReality::Visualization::PageSetup::ArButtons::PingButton
              @handlePing={{this.handlePing}}
            />

            <div id='ar-plus-interaction-container'>
              <BsButton
                @type='primary'
                className='half-transparent'
                {{on 'click' this.increaseSize}}
              >
                {{svg-jar 'plus-16' className='octicon align-middle ar-button-svg'}}
              </BsButton>
            </div>

            <div id='ar-right-interaction-container'>
              <BsButton
                @type='primary'
                className='half-transparent'
                {{on 'click' this.rotateRight}}
              >
                {{svg-jar
                  'arrow-right-16'
                  className='octicon align-middle ar-button-svg'
                }}
              </BsButton>
            </div>

          </div>

        </div>
      </div>
      {{#if @showSettingsSidebar}}
        <div className='sidebar right col-8' id='settingsSidebar'>
          <div className='mt-6 d-flex flex-row w-100'>
            <Visualization::PageSetup::Sidebar::Customizationbar::SettingsSidebar
              @closeSettingsSidebar={{@closeSettingsSidebar}}
            >
              <div className='explorviz-visualization-navbar'>
                <ul className='nav justify-content-center'>
                  <div
                    {{react
                      this.arSettingsOpener
                      openedComponent=@openedSettingComponent
                      toggleSettingsSidebarComponent=@toggleSettingsSidebarComponent
                    }}
                  />
                  <div
                    {{react
                      this.collaborationOpener
                      openedComponent=@openedSettingComponent
                      toggleSettingsSidebarComponent=@toggleSettingsSidebarComponent
                    }}
                  />
                  <div
                    {{react
                      this.settingsOpener
                      openedComponent=@openedSettingComponent
                      toggleSettingsSidebarComponent=@toggleSettingsSidebarComponent
                    }}
                  />
                </ul>
              </div>
              {{#if @openedSettingComponent}}
                <Visualization::PageSetup::Sidebar::SidebarComponent
                  @componentId={{@openedSettingComponent}}
                >
                  {{#if (eq @openedSettingComponent 'Collaboration')}}
                    <Collaboration::Visualization::PageSetup::Sidebar::Customizationbar::Collaboration::CollaborationControls
                    />
                  {{/if}}
                  {{#if (eq @openedSettingComponent 'AR-Settings')}}
                    <ExtendedReality::Visualization::PageSetup::Sidebar::ArSettingsSelector
                      @updateView={{this.updateColors}}
                      @updateCameraResolution={{this.initArJs}}
                      @updateRendererResolution={{this.updateRendererResolution}}
                    />
                  {{/if}}
                  {{#if (eq @openedSettingComponent 'trace-selection')}}
                    <Visualization::PageSetup::Sidebar::TraceSelectionAndReplayer
                      @highlightTrace={{this.highlightTrace}}
                      @removeHighlighting={{this.removeHighlighting}}
                      @dynamicData={{@landscapeData.dynamicLandscapeData}}
                      @structureData={{@landscapeData.structureLandscapeData}}
                    />
                  {{/if}}
                  {{#if (eq @openedSettingComponent 'Settings')}}
                    <Visualization::PageSetup::Sidebar::Customizationbar::Settings::Settings
                      @enterFullscreen={{this.enterFullscreen}}
                      @popups={{this.popupHandler.popupData}}
                      @redrawCommunication={{this.applicationRenderer.addCommunicationForAllApplications}}
                      @resetSettings={{this.userSettings.applyDefaultSettings}}
                      @setGamepadSupport={{this.setGamepadSupport}}
                      @updateColors={{this.updateColors}}
                      @updateHighlighting={{this.highlightingService.updateHighlighting}}
                    />
                  {{/if}}
                </Visualization::PageSetup::Sidebar::SidebarComponent>
              {{/if}}
            </Visualization::PageSetup::Sidebar::Customizationbar::SettingsSidebar>
          </div>
        </div>
      {{/if}}
    </div>

    {{add-listener
      this.heatmapConfiguration
      'updatedClazzMetrics'
      this.applyHeatmap
    }}
  )
}