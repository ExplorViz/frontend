import ForceGraph3D, { ForceGraph3DInstance } from '3d-force-graph';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
// @ts-ignore
import * as d3 from 'd3-force-3d';
import debugLogger from 'ember-debug-logger';
import ApplicationRenderer from 'explorviz-frontend/services/application-renderer';
import Configuration from 'explorviz-frontend/services/configuration';
import ApplicationRepository from 'explorviz-frontend/services/repos/application-repository';
import ApplicationData from 'explorviz-frontend/utils/application-data';
import { configureControls, getDistance } from 'explorviz-frontend/utils/application-rendering/camera-controls';
import { DrawableClassCommunication } from 'explorviz-frontend/utils/application-rendering/class-communication-computer';
import { linkPositionUpdate } from 'explorviz-frontend/utils/link-helper';
import ApplicationObject3D from 'explorviz-frontend/view-objects/3d/application/application-object-3d';
// import { Stats } from 'fs';
import { AmbientLight, DirectionalLight, PerspectiveCamera } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import Stats from 'three/examples/jsm/libs/stats.module';

interface BrowserRenderingArgs { }

interface GraphNode {
    data: ApplicationData,
    id: string,
    index: number,
    x: number,
    y: number,
    z: number,
    __threeObj: ApplicationObject3D,
}

export interface GraphLink {
    source: GraphNode,
    target: GraphNode,
    value: number,
    communicationData: DrawableClassCommunication,
    __curve: any,
}


// type LinkObject = object & {
//     source?: string | number | NodeObject;
//     target?: string | number | NodeObject;
// };
//
const PARTICLE_SPEED_MULTIPLIER = 0.001;

export default class BrowserRendering extends Component<BrowserRenderingArgs> {

    @service('application-renderer')
    applicationRenderer!: ApplicationRenderer;

    @service('repos/application-repository')
    applicationRepo!: ApplicationRepository;

    @service('configuration')
    configuration!: Configuration;

    @tracked
    graph!: ForceGraph3DInstance;

    get camera() {
        return this.graph.camera() as PerspectiveCamera;
    }

    get renderer() {
        return this.graph.renderer();
    }

    get controls() {
        return this.graph.controls() as OrbitControls;
    }

    get scene() {
        return this.graph.scene();
    }

    selectedId: string | null = null;

    debug = debugLogger('BrowserRendering');

    @action
    resize(outerDiv: HTMLElement) {
        this.graph.width(outerDiv.clientWidth)
        this.graph.height(outerDiv.clientHeight)
    }

    particleSpeed(link: GraphLink) {
        return Math.sqrt(link.value) * PARTICLE_SPEED_MULTIPLIER;
    }

    initDone: boolean = false;

    @action
    initScene() {
        this.initDone = true;
        // tune lights
        setTimeout(() => {
            this.scene?.children?.forEach((object) => {
                if (object.isAmbientLight) {
                    const light: AmbientLight = object;
                    light.intensity = 1;
                    light.color.setRGB(0.65, 0.65, 0.65);
                }
                if (object.isDirectionalLight) {
                    const light: DirectionalLight = object;
                    light.intensity = 0.3;
                }
            })
        }, 20)
        // adjust camera
        setTimeout(() => {
            this.graph.zoomToFit(800);
        }, 1500)
    }

    // https://github.com/vasturiano/3d-force-graph/blob/master/example/custom-node-geometry/index.html
    @action
    async outerDivInserted(outerDiv: HTMLElement) {
        let didSetup = false;

        const stats = new Stats();

        const graph = ForceGraph3D({ controlType: 'orbit' })
            (outerDiv)
            .nodeThreeObject(({ id, data, fy }) => this.applicationRenderer.addApplicationData(data))
            .numDimensions(3)
            .dagMode('lr')
            // .dagMode('radialin')
            .dagLevelDistance(100)
            .warmupTicks(400)
            .enableNodeDrag(false)
            .backgroundColor('#' + this.configuration.landscapeColors.backgroundColor.getHexString())
            .linkDirectionalArrowLength(5.5)
            .linkDirectionalArrowRelPos(0.8)
            // .linkColor('#' + this.configuration.applicationColors.communicationColor.getHexString())
            .linkColor(() => '#' + this.configuration.landscapeColors.communicationColor.getHexString())
            .linkDirectionalArrowColor(() => '#' + this.configuration.applicationColors.communicationArrowColor.getHexString())
            .linkDirectionalParticleColor(() => '#' + this.configuration.applicationColors.communicationArrowColor.getHexString())
            .linkWidth(1)
            .linkOpacity(1)
            .nodeVal(5)
            .linkCurvature(0.00001) // used as workaround to make particles aware of non-centered start/ end
            // particles
            .linkDirectionalParticles("value")
            .linkDirectionalParticleWidth(1.5)
            // .linkDirectionalParticleSpeed(link => link.value * 0.0004)
            .linkDirectionalParticleSpeed(this.particleSpeed)
            .linkPositionUpdate(linkPositionUpdate)
            .onNodeClick((node: GraphNode, event: PointerEvent) => {
                this.applicationRenderer.openAllComponentsOfAllApplications();
                // Aim at node from outside it
                const distance = getDistance(node.__threeObj, graph.camera());
                this.selectedId = node.id;
                // TODO fix label render order, as they are currently slighly transparent
                node.__threeObj.setOpacity(0.99)
                node.__threeObj.traverse(child => child.renderOrder = 1)

                const newPos = node.x || node.y
                    ? { x: node.x, y: distance + 30, z: node.z + 10 }
                    : { x: 0, y: 0, z: distance }; // special case if node is in (0,0,0)

                // graph.zoomToFit(1500, 10, (xx) => xx.id === node.id);

                graph.cameraPosition(
                    newPos, // new position
                    node, // lookAt ({ x, y, z })
                    900  // ms transition duration
                );
            })
            .onBackgroundClick((event: PointerEvent) => {
                if (this.selectedId) {
                    const node = graph.graphData().nodes.findBy('id', this.selectedId);
                    node!.__threeObj.setOpacity(1)
                    // node!.__threeObj.children.forEach(child => child.renderOrder = 0)
                    node!.__threeObj.traverse(child => child.renderOrder = 0)
                    this.selectedId = null;
                }
            })
            .onEngineTick(() => {
                if (!didSetup) {
                    this.initScene();
                    didSetup = true;
                }
                // workaroud because DAG mode overwrites the fy value of the graph node data
                graph.graphData().nodes.forEach((node) => {
                    if (node.id === this.selectedId) {
                        node.fy = 20;
                    } else {
                        node.fy = 0;
                    }
                })
                stats.update();
            })
            // .cooldownTicks(1)
            // .onEngineStop(this.initScene)
            // force
            .d3Force('collision', d3.forceCollide(node => {
                return node.__threeObj.foundationMesh.width / 2 + 3
            }))
            .d3VelocityDecay(0.8);

        // forces
        graph.d3Force('collision')!.iterations(1)
        // graph.d3Force('link').distance(30);
        graph.d3Force('charge')!.strength(-70)
        // graph.renderer().tick

        outerDiv.appendChild(stats.dom);

        // stats.tick = () => {
        //     stats.update()
        // };

        // add custom object
        // const planeGeometry = new THREE.PlaneGeometry(1000, 1000, 1, 1);
        // const planeMaterial = new THREE.MeshLambertMaterial({ color: 0xFF0000, side: THREE.DoubleSide });
        // const mesh = new THREE.Mesh(planeGeometry, planeMaterial);
        // mesh.position.set(-100, -200, -100);
        // mesh.rotation.set(0.5 * Math.PI, 0, 0);
        // graph.scene().add(mesh);

        configureControls(graph.controls() as OrbitControls);

        graph.cameraPosition({ x: 0, y: 1000, z: 0 });

        this.graph = graph;

    }
}
