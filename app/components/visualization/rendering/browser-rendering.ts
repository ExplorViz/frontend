import { getOwner } from '@ember/application';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import LocalUser from 'collaborative-mode/services/local-user';
import debugLogger from 'ember-debug-logger';
import { LandscapeData } from 'explorviz-frontend/controllers/visualization';
import { Position2D } from 'explorviz-frontend/modifiers/interaction-modifier';
import ForceGraph from 'explorviz-frontend/rendering/application/force-graph';
import RenderingLoop from 'explorviz-frontend/rendering/application/rendering-loop';
import ApplicationRenderer from 'explorviz-frontend/services/application-renderer';
import Configuration from 'explorviz-frontend/services/configuration';
import EntityManipulation from 'explorviz-frontend/services/entity-manipulation';
import HighlightingService from 'explorviz-frontend/services/highlighting-service';
import ApplicationRepository from 'explorviz-frontend/services/repos/application-repository';
import { Timestamp } from 'explorviz-frontend/services/repos/timestamp-repository';
import UserSettings from 'explorviz-frontend/services/user-settings';
import { CameraControls } from 'explorviz-frontend/utils/application-rendering/camera-controls';
import { moveCameraTo, openComponentMesh } from 'explorviz-frontend/utils/application-rendering/entity-manipulation';
import { removeHighlighting } from 'explorviz-frontend/utils/application-rendering/highlighting';
import { Span, Trace } from 'explorviz-frontend/utils/landscape-schemes/dynamic-data';
import {
    Application, Class, Node, Package
} from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import { defaultScene } from 'explorviz-frontend/utils/scene';
import ApplicationObject3D from 'explorviz-frontend/view-objects/3d/application/application-object-3d';
import ClazzCommunicationMesh from 'explorviz-frontend/view-objects/3d/application/clazz-communication-mesh';
import ClazzMesh from 'explorviz-frontend/view-objects/3d/application/clazz-mesh';
import ComponentMesh from 'explorviz-frontend/view-objects/3d/application/component-mesh';
import FoundationMesh from 'explorviz-frontend/view-objects/3d/application/foundation-mesh';
import ClazzCommuMeshDataModel from 'explorviz-frontend/view-objects/3d/application/utils/clazz-communication-mesh-data-model';
import BaseMesh from 'explorviz-frontend/view-objects/3d/base-mesh';
import ApplicationMesh from 'explorviz-frontend/view-objects/3d/landscape/application-mesh';
import NodeMesh from 'explorviz-frontend/view-objects/3d/landscape/node-mesh';
import HeatmapConfiguration from 'heatmap/services/heatmap-configuration';
import THREE, { Vector3 } from 'three';
import ThreeForceGraph from 'three-forcegraph';
import { MapControls } from 'three/examples/jsm/controls/OrbitControls';
import SpectateUserService from 'virtual-reality/services/spectate-user';

interface BrowserRenderingArgs {
    readonly id: string;
    readonly landscapeData: LandscapeData;
    readonly visualizationPaused: boolean;
    readonly selectedTimestampRecords: Timestamp[];
    openDataSelection(): void;
    toggleVisualizationUpdating(): void;
    switchToAR(): void,
    switchToVR(): void,
}
type PopupData = {
    mouseX: number,
    mouseY: number,
    entity: Node | Application | Package | Class | ClazzCommuMeshDataModel,
    isPinned: boolean,
};

export default class BrowserRendering extends Component<BrowserRenderingArgs> {

    @service('application-renderer')
    applicationRenderer!: ApplicationRenderer;

    @service('repos/application-repository')
    applicationRepo!: ApplicationRepository;

    @service('configuration')
    configuration!: Configuration;

    @service('user-settings')
    userSettings!: UserSettings;

    @service('local-user')
    private localUser!: LocalUser;

    @service('highlighting-service')
    private highlightingService!: HighlightingService;

    @service('spectate-user')
    private spectateUserService!: SpectateUserService;

    @service('heatmap-configuration')
    private heatmapConf!: HeatmapConfiguration;

    @service('entity-manipulation')
    private entityManipulation!: EntityManipulation;

    @tracked
    readonly graph: ThreeForceGraph;

    @tracked
    readonly scene: THREE.Scene;

    @tracked
    canvas!: HTMLCanvasElement;

    renderer!: THREE.WebGLRenderer;

    updatables: any[] = [];

    renderingLoop!: RenderingLoop;

    hoveredObject: BaseMesh | null = null;

    controls!: MapControls;

    cameraControls!: CameraControls;

    initDone: boolean = false;

    @tracked
    mousePosition: Vector3 = new Vector3(0, 0, 0);

    @tracked
    selectedApplicationId: string = '';

    @tracked
    popupData: PopupData[] = [];

    get selectedApplicationObject3D() {
        return this.applicationRenderer.getApplicationById(this.selectedApplicationId);
    }

    get camera() {
        return this.localUser.defaultCamera;
    }

    get raycastObjects() {
        return this.scene.children;
    }
    get appSettings() {
        return this.userSettings.applicationSettings;
    }

    selectedId: string | null = null;

    debug = debugLogger('BrowserRendering');

    constructor(owner: any, args: BrowserRenderingArgs) {
        super(owner, args);
        this.debug('Constructor called');
        // scene
        this.scene = defaultScene();
        this.scene.background = this.configuration.landscapeColors.backgroundColor;

        // camera
        this.localUser.defaultCamera = new THREE.PerspectiveCamera(75, 1.0, 0.1, 1000);
        this.camera.position.set(500, 500, 500);

        this.applicationRenderer.getOpenApplications().clear();
        // force graph
        const forceGraph = new ForceGraph(getOwner(this));
        this.graph = forceGraph.graph;
        this.scene.add(forceGraph.graph);
        this.updatables.push(forceGraph);

        // spectate
        this.updatables.push(this.spectateUserService);
    }

    get rightClickMenuItems() {
        const commButtonTitle = this.configuration.isCommRendered ? 'Hide Communication' : 'Add Communication';
        const heatmapButtonTitle = this.heatmapConf.heatmapActive ? 'Disable Heatmap' : 'Enable Heatmap';
        const pauseItemtitle = this.args.visualizationPaused ? 'Resume Visualization' : 'Pause Visualization';

        return [
            { title: 'Reset View', action: this.resetView },
            { title: 'Open All Components', action: this.applicationRenderer.openAllComponentsOfAllApplications },
            { title: commButtonTitle, action: this.applicationRenderer.toggleCommunicationRendering },
            { title: heatmapButtonTitle, action: this.heatmapConf.toggleHeatmap },
            { title: pauseItemtitle, action: this.args.toggleVisualizationUpdating },
            { title: 'Open Sidebar', action: this.args.openDataSelection },
            { title: 'Enter AR', action: this.args.switchToAR },
            { title: 'Enter VR', action: this.args.switchToVR },
        ];
    }


    /**
     * Highlights a trace or specified trace step.
     * Opens all component meshes to make whole trace visible.
     *
     * @param trace Trace which shall be highlighted.
     * @param step Step of the trace which shall be highlighted. Default is 1.
     */
    @action
    highlightTrace(trace: Trace, traceStep: string) {
        if (this.selectedApplicationObject3D) {
            this.highlightingService.highlightTrace(
                trace, traceStep,
                this.selectedApplicationObject3D,
                this.args.landscapeData.structureLandscapeData,
            );
        }
    }

    @action
    resetView() {
        this.cameraControls.focusCameraOn(1.2, ...this.applicationRenderer.getOpenApplications())
    }

    @action
    canvasInserted(canvas: HTMLCanvasElement) {
        this.debug('Canvas inserted');

        this.canvas = canvas;

        canvas.oncontextmenu = (e) => {
            e.preventDefault();
        };
    }

    @action
    resize(outerDiv: HTMLElement) {
        const width = outerDiv.clientWidth;
        const height = outerDiv.clientHeight;

        // Update renderer and camera according to canvas size
        this.renderer.setSize(width, height);
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
    }

    // https://github.com/vasturiano/3d-force-graph/blob/master/example/custom-node-geometry/index.html
    @action
    async outerDivInserted(outerDiv: HTMLElement) {
        this.initRenderer();
        this.resize(outerDiv);
    }

    /**
     * Initiates a WebGLRenderer
     */
    private initRenderer() {
        const { width, height } = this.canvas;
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            canvas: this.canvas,
        });

        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(width, height);
        this.debug('Renderer set up');

        // controls
        this.cameraControls = new CameraControls(this.camera, this.canvas);
        this.graph.onFinishUpdate(() => {
            if (!this.initDone && this.graph.graphData().nodes.length > 0) {
                this.debug('initdone!');
                setTimeout(() => {
                    this.cameraControls.focusCameraOn(1.2, ...this.applicationRenderer.getOpenApplications())
                }, 200);
                this.initDone = true;
            }
        })
        this.updatables.push(this.cameraControls);

        this.renderingLoop = new RenderingLoop(getOwner(this),
            {
                camera: this.camera,
                scene: this.scene,
                renderer: this.renderer,
                updatables: this.updatables,
            });
        this.renderingLoop.start();
    }

    @action
    handleSingleClick(intersection: THREE.Intersection) {
        if (intersection) {
            // this.mousePosition.copy(intersection.point);
            this.handleSingleClickOnMesh(intersection.object);
        }
    }

    @action
    removeHighlighting() {
        if (this.selectedApplicationObject3D) {
            removeHighlighting(this.selectedApplicationObject3D);
        }
    }

    @action
    handleSingleClickOnMesh(mesh: THREE.Object3D) {
        // User clicked on blank spot on the canvas
        if (mesh === undefined) {
            this.removeHighlighting();
        } else if (mesh instanceof ComponentMesh || mesh instanceof ClazzMesh
            || mesh instanceof ClazzCommunicationMesh) {
            this.highlightingService.highlight(mesh);
        } else if (mesh instanceof FoundationMesh) {
            if (mesh.parent instanceof ApplicationObject3D) {
                this.selectActiveApplication(mesh.parent);
            }
            this.cameraControls.focusCameraOn(1, mesh);
        }
    }

    @action
    handleDoubleClick(intersection: THREE.Intersection) {
        if (intersection) {
            this.handleDoubleClickOnMesh(intersection.object);
        }
    }

    selectActiveApplication(applicationObject3D: ApplicationObject3D) {
        if (this.selectedApplicationObject3D !== applicationObject3D) {
            this.selectedApplicationId = applicationObject3D.dataModel.id;
            this.heatmapConf.setActiveApplication(applicationObject3D);
        }
        this.heatmapConf.setActiveApplication(applicationObject3D);
        applicationObject3D.position.y = 10;
        applicationObject3D.updateMatrixWorld();
        this.applicationRenderer.updateLinks?.()
    }

    @action
    handleDoubleClickOnMesh(mesh: THREE.Object3D) {
        if (mesh instanceof ComponentMesh) {
            const applicationObject3D = mesh.parent;
            if (applicationObject3D instanceof ApplicationObject3D) {
                // Toggle open state of clicked component
                this.applicationRenderer.toggleComponent(mesh, applicationObject3D);
            }
            // Close all components since foundation shall never be closed itself
        } else if (mesh instanceof FoundationMesh) {
            const applicationObject3D = mesh.parent;
            if (applicationObject3D instanceof ApplicationObject3D) {
                this.applicationRenderer.closeAllComponents(applicationObject3D);
            }
        }
    }

    @action
    handleMouseMove(intersection: THREE.Intersection) {
        // this.runOrRestartMouseMovementTimer();
        if (intersection) {
            this.mousePosition.copy(intersection.point);
            this.handleMouseMoveOnMesh(intersection.object);
        }
    }

    @action
    showApplication(appId: string) {
        this.removePopup(appId);
        const applicationObject3D = this.applicationRenderer.getApplicationById(appId);
        if (applicationObject3D) {
            this.cameraControls.focusCameraOn(0.8, applicationObject3D);
        }
    }

    @action
    handleMouseMoveOnMesh(mesh: THREE.Object3D | undefined) {
        // const { value: enableHoverEffects } = this.landSettings.enableHoverEffects;

        // Update hover effect
        if (mesh === undefined && this.hoveredObject) {
            this.hoveredObject.resetHoverEffect();
            this.hoveredObject = null;
            // } else if (mesh instanceof PlaneMesh && enableHoverEffects) {
            //     if (this.hoveredObject) { this.hoveredObject.resetHoverEffect(); }

            //     this.hoveredObject = mesh;
            //     mesh.applyHoverEffect();
        }

        // Hide popups when mouse moves
        if (!this.appSettings.enableCustomPopupPosition.value) {
            this.popupData = [];
        }
        const { value: enableAppHoverEffects } = this.appSettings.enableHoverEffects;

        // Update hover effect
        if (mesh === undefined && this.hoveredObject) {
            this.hoveredObject.resetHoverEffect();
            this.hoveredObject = null;
        } else if (mesh instanceof BaseMesh
            && enableAppHoverEffects && !this.heatmapConf.heatmapActive) {
            if (this.hoveredObject) { this.hoveredObject.resetHoverEffect(); }

            this.hoveredObject = mesh;
            mesh.applyHoverEffect();
        }

        // Hide popups when mouse moves
        if (!this.appSettings.enableCustomPopupPosition.value) {
            this.popupData = [];
        }
    }

    @action
    removePopup(entityId: string) {
        if (!this.appSettings.enableCustomPopupPosition.value) {
            this.popupData = [];
        } else {
            this.popupData = this.popupData.filter(((pd) => pd.entity.id !== entityId));
        }
    }

    @action
    pinPopup(entityId: string) {
        this.popupData.forEach((pd) => {
            if (pd.entity.id === entityId) {
                pd.isPinned = true;
            }
        });
        this.popupData = [...this.popupData];
    }

    @action
    handleMouseOut() {
        if (!this.appSettings.enableCustomPopupPosition.value) {
            this.popupData = [];
        }
    }

    @action
    handleMouseStop(intersection: THREE.Intersection, mouseOnCanvas: Position2D) {
        if (intersection) {
            this.handleMouseStopOnMesh(intersection.object, mouseOnCanvas);
        }
    }

    @action
    handleMouseStopOnMesh(mesh: THREE.Object3D, mouseOnCanvas: Position2D) {
        // Show information as popup is mouse stopped on top of a mesh
        if ((mesh instanceof NodeMesh || mesh instanceof ApplicationMesh
            || mesh instanceof ClazzMesh || mesh instanceof ComponentMesh
            || mesh instanceof ClazzCommunicationMesh)) {
            const newPopup = {
                mouseX: mouseOnCanvas.x,
                mouseY: mouseOnCanvas.y,
                entity: mesh.dataModel,
                applicationId: mesh.parent?.dataModel?.id,
                isPinned: false,
            };

            if (!this.appSettings.enableCustomPopupPosition.value) {
                this.popupData = [newPopup];
            } else {
                const popupAlreadyExists = this.popupData.any((pd) => pd.entity.id === mesh.dataModel.id);
                if (popupAlreadyExists) return;

                const notPinnedPopupIndex = this.popupData.findIndex((pd) => !pd.isPinned);

                if (notPinnedPopupIndex === -1) {
                    this.popupData = [...this.popupData, newPopup];
                } else {
                    this.popupData[notPinnedPopupIndex] = newPopup;
                    this.popupData = [...this.popupData];
                }
            }
        }
    }

    /**
     * Opens all parents / components of a given component or clazz.
     * Adds communication and restores highlighting.
     *
     * @param entity Component or Clazz of which the mesh parents shall be opened
     */
    @action
    openParents(entity: Package | Class, applicationId: string) {
        const applicationObject3D = this.applicationRenderer.getApplicationById(applicationId);
        if (!applicationObject3D) {
            return;
        }
        // TODO after here it should probably be moved to the application renderer.
        // eslint-disable-next-line @typescript-eslint/no-shadow
        function getAllAncestorComponents(entity: Package | Class): Package[] {
            // if (isClass(entity)) {
            //  return getAllAncestorComponents(entity.parent);
            // }

            if (entity.parent === undefined) {
                return [];
            }

            return [entity.parent, ...getAllAncestorComponents(entity.parent)];
        }

        const ancestors = getAllAncestorComponents(entity);
        ancestors.forEach((anc) => {
            const ancestorMesh = applicationObject3D.getBoxMeshbyModelId(anc.id);
            if (ancestorMesh instanceof ComponentMesh) {
                openComponentMesh(ancestorMesh, applicationObject3D);
            }
        });
        this.applicationRenderer.updateApplicationObject3DAfterUpdate(applicationObject3D);
    }

    /**
     * Highlights a given component or clazz
     *
     * @param entity Component or clazz which shall be highlighted
     */
    @action
    highlightModel(entity: Package | Class, applicationId: string) {
        const applicationObject3D = this.applicationRenderer.getApplicationById(applicationId);
        if (!applicationObject3D) {
            return;
        }
        this.highlightingService.highlightModel(entity, applicationObject3D);
    }

    /**
     * Moves camera such that a specified clazz or clazz communication is in focus.
     *
     * @param model Clazz or clazz communication which shall be in focus of the camera
     */
    @action
    moveCameraTo(emberModel: Class | Span) {
        if (!this.selectedApplicationObject3D) {
            return;
        }
        moveCameraTo(emberModel, this.selectedApplicationObject3D,
            this.args.landscapeData.dynamicLandscapeData, this.cameraControls);
    }

    @action
    updateColors() {
        this.entityManipulation.updateColors(this.scene);
    }

    /**
    * This overridden Ember Component lifecycle hook enables calling
    * ExplorViz's custom cleanup code.
    *
    * @method willDestroy
    */
    willDestroy() {
        super.willDestroy();

        this.renderingLoop.stop();

        // is not called before other e.g. vr-rendering is inserted:
        // https://github.com/emberjs/ember.js/issues/18873
        // this.applicationRenderer.cleanUpApplications();
        this.renderer.dispose();
        this.renderer.forceContextLoss();

        this.heatmapConf.cleanup();
        this.renderingLoop.stop();
        this.configuration.isCommRendered = true;
        // this.graph.graphData([]);

        this.debug('Cleaned up application rendering');

        // Clean up WebGL rendering context by forcing context loss
        const gl = this.canvas.getContext('webgl');
        if (!gl) {
            return;
        }
        const glExtension = gl.getExtension('WEBGL_lose_context');
        if (!glExtension) return;
        glExtension.loseContext();
    }
}
