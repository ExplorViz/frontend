import ForceGraph3D, { ForceGraph3DInstance } from '3d-force-graph';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import * as d3 from 'd3-force-3d';
import debugLogger from 'ember-debug-logger';
import ApplicationRenderer from 'explorviz-frontend/services/application-renderer';
import Configuration from 'explorviz-frontend/services/configuration';
import ApplicationRepository from 'explorviz-frontend/services/repos/application-repository';
import ApplicationData from 'explorviz-frontend/utils/application-data';
import { getDistance } from 'explorviz-frontend/utils/application-rendering/camera-controls';
import { DrawableClassCommunication } from 'explorviz-frontend/utils/application-rendering/class-communication-computer';
import ApplicationObject3D from 'explorviz-frontend/view-objects/3d/application/application-object-3d';
import { MOUSE, Object3D } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';


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

type Coords = { x: number; y: number; z: number; }

// type LinkObject = object & {
//     source?: string | number | NodeObject;
//     target?: string | number | NodeObject;
// };

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
        return this.graph.camera();
    }

    get renderer() {
        return this.graph.renderer();
    }

    debug = debugLogger('BrowserRendering');

    @action
    resize(outerDiv: HTMLElement) {
        const width = Number(outerDiv.clientWidth);
        const height = Number(outerDiv.clientHeight);

        // Update renderer and camera according to canvas size
        this.renderer.setSize(width, height);
        this.camera.aspect = width / height;
        // this.camera.updateProjectionMatrix();
    }


    // https://github.com/vasturiano/3d-force-graph/blob/master/example/custom-node-geometry/index.html
    @action
    async outerDivInserted(outerDiv: HTMLElement) {
        // Object3D.DefaultUp.set(0, 0, 1);
        const initData = {
            nodes: [],
            links: []
        };

        // Object3D.DefaultUp.set(0, 0, 1);
        let i = 0

        const graph = ForceGraph3D({ controlType: 'orbit' })
            (outerDiv)
            .nodeThreeObject(({ id, data }) => this.applicationRenderer.addApplicationData(data))
            .graphData(initData)
            .numDimensions(2)
            .warmupTicks(300)
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
            .linkDirectionalParticleSpeed(link => Math.sqrt(link.value) * 0.001)
            .linkPositionUpdate((line: Object3D, coords: { start: Coords, end: Coords }, link: any) => {
                const drawableClassCommunication: DrawableClassCommunication = link.communicationData;

                // source
                const sourceApp = link.source.__threeObj
                const sourceMesh = sourceApp.getBoxMeshbyModelId(drawableClassCommunication.sourceClass.id);
                const start = sourceMesh.position.clone();
                sourceApp.localToWorld(start);
                line.position.x = start.x;
                line.position.y = start.y;
                line.position.z = start.z;

                // target
                const targetApp = link.target.__threeObj
                const targetMesh = targetApp.getBoxMeshbyModelId(drawableClassCommunication.targetClass.id);
                const end = targetMesh.position.clone();
                targetApp.localToWorld(end);

                // workaround to move particles and arrow
                link.__curve.v0.copy(start);
                link.__curve.v1.copy(start);
                link.__curve.v2.copy(end);

                // distance
                const distance = start.distanceTo(end);
                line.scale.z = distance;
                line.lookAt(end);

                return true;
            })
            // .linkDirectionalParticles((x, y) => {
            //     const xx = x
            //     return x
            // })
            .onNodeClick((node: GraphNode, event: PointerEvent) => {
                this.applicationRenderer.openAllComponentsOfAllApplications();
                // Aim at node from outside it
                const distance = getDistance(node.__threeObj, graph.camera());
                node.z = 0; // only 2 dimensions
                node.__threeObj.position.z = 100

                const newPos = node.x || node.y
                    ? { x: node.x, y: node.y - 10, z: distance + 10 }
                    : { x: 0, y: 0, z: distance }; // special case if node is in (0,0,0)

                // graph.zoomToFit(1500, 10, (xx) => xx.id === node.id);


                graph.cameraPosition(
                    newPos, // new position
                    node, // lookAt ({ x, y, z })
                    900  // ms transition duration
                );
            })
            .onEngineTick(() => {
            })
            .dagMode('lr')
            .dagLevelDistance(100)

            // force
            .d3Force('collision', d3.forceCollide(node => {
                return node.__threeObj.foundationMesh.width / 2 + 3
            }))
            .d3VelocityDecay(0.8);
        graph.d3Force('collision').iterations(1)
        // graph.d3Force('link').distance(30);
        // graph.d3Force('charge').strength(-300)

        // add custom object
        // const planeGeometry = new THREE.PlaneGeometry(1000, 1000, 1, 1);
        // const planeMaterial = new THREE.MeshLambertMaterial({ color: 0xFF0000, side: THREE.DoubleSide });
        // const mesh = new THREE.Mesh(planeGeometry, planeMaterial);
        // mesh.position.set(-100, -200, -100);
        // mesh.rotation.set(0.5 * Math.PI, 0, 0);
        // graph.scene().add(mesh);

        const controls = graph.controls() as OrbitControls;
        controls.mouseButtons.LEFT = MOUSE.PAN;
        controls.mouseButtons.RIGHT = MOUSE.ROTATE;
        this.graph = graph;
    }
}
