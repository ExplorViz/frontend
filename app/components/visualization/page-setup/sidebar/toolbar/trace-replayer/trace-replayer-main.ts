import Component from '@glimmer/component';
import { action, computed } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import * as THREE from 'three';
import {
  DynamicLandscapeData,
  Span,
  Trace,
} from 'explorviz-frontend/utils/landscape-schemes/dynamic/dynamic-data';
import { StructureLandscapeData } from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import {
  calculateDuration,
  getSortedTraceSpans,
  getTraceIdToSpanTree,
} from 'explorviz-frontend/utils/trace-helpers';
import {
  getApplicationFromClass,
  getHashCodeToClassMap,
  spanIdToClass,
} from 'explorviz-frontend/utils/landscape-structure-helpers';
import ApplicationRenderer from 'explorviz-frontend/services/application-renderer';
import LocalUser from 'explorviz-frontend/services/collaboration/local-user';
import * as EntityRendering from 'explorviz-frontend/utils/application-rendering/entity-rendering';
import {
  addMeshToApplication,
  updateMeshVisiblity,
} from 'explorviz-frontend/utils/application-rendering/entity-rendering';
import RenderingLoop from 'explorviz-frontend/rendering/application/rendering-loop';
import { WebGLRenderer } from 'three';
import { LandscapeData } from 'explorviz-frontend/utils/landscape-schemes/landscape-data';
import ClazzMesh from 'explorviz-frontend/view-objects/3d/application/clazz-mesh';
import { float } from 'three/examples/jsm/nodes/shadernode/ShaderNode';

interface Args {
  selectedTrace: Trace;
  structureData: StructureLandscapeData;
  renderingLoop: RenderingLoop;

  highlightTrace(trace: Trace, traceStep: string): void;

  readonly landscapeData: LandscapeData;
}

export default class TraceReplayerMain extends Component<Args> {
  @tracked
  isReplayAnimated: boolean = false;

  @tracked
  currentTraceStep: Span | null = null;

  @tracked
  traceSteps: Span[] = [];

  @service('application-renderer')
  applicationRenderer!: ApplicationRenderer;

  @service('collaboration/local-user')
  localUser!: LocalUser;

  private hashCodeToClassMap;

  constructor(owner: any, args: Args) {
    super(owner, args);
    const { selectedTrace } = this.args;
    this.traceSteps = getSortedTraceSpans(selectedTrace);

    if (this.traceSteps.length > 0) {
      const [firstStep] = this.traceSteps;
      this.currentTraceStep = firstStep;
    }

    this.hashCodeToClassMap = getHashCodeToClassMap(this.args.structureData);
  }

  get currentTraceStepIndex() {
    return this.traceSteps.findIndex((span) => span === this.currentTraceStep);
  }

  get sourceClass() {
    const {
      currentTraceStep,
      args: { selectedTrace },
    } = this;
    if (selectedTrace && currentTraceStep) {
      return spanIdToClass(
        this.args.structureData,
        selectedTrace,
        currentTraceStep.parentSpanId
      );
    }
    return undefined;
  }

  get sourceApplication() {
    return this.sourceClass
      ? getApplicationFromClass(this.args.structureData, this.sourceClass)
      : undefined;
  }

  get targetClass() {
    const {
      currentTraceStep,
      args: { selectedTrace },
    } = this;
    if (selectedTrace && currentTraceStep) {
      return spanIdToClass(
        this.args.structureData,
        selectedTrace,
        currentTraceStep.spanId
      );
    }
    return undefined;
  }

  get targetApplication() {
    return this.targetClass
      ? getApplicationFromClass(this.args.structureData, this.targetClass)
      : undefined;
  }

  get operationName() {
    const hashCodeToClassMap = getHashCodeToClassMap(this.args.structureData);

    if (this.currentTraceStep) {
      const clazz = hashCodeToClassMap.get(this.currentTraceStep.methodHash);

      return clazz?.methods.find(
        (method) => method.methodHash === this.currentTraceStep?.methodHash
      )?.name;
    }
    return undefined;
  }

  public minSpeed = 1;
  public maxSpeed = 20;
  @tracked
  public selectedSpeed = 5;

  @action
  inputSpeed(_: any, htmlInputElement: any) {
    const newValue = htmlInputElement.target.value;
    if (newValue) {
      this.selectedSpeed = Number(newValue);
    }
  }

  @action
  changeSpeed(event: any) {
    this.selectedSpeed = Number(event.target.value);
  }

  private delta: number = 0;
  private steps: Span[] = [];

  private cloud: THREE.Mesh[] = [];
  private curve: THREE.QuadraticBezierCurve3 | undefined = undefined;
  private duration = 0;
  @tracked
  private progress = 0;

  tick(delta: number) {
    this.delta += delta;

    if (this.curve) {
      const progress = this.delta / this.duration;
      if (0.0 <= progress && progress <= 1.0) {
        this.cloud[0].position.copy(this.curve.getPoint(progress));
      }
    }
    this.progress = Math.ceil(
      ((this.traceSteps.length - this.steps.length) / this.traceSteps.length) *
        100
    );

    if (this.delta > this.duration) {
      this.delta = 0;

      if (this.steps.length > 1) {
        const origin = this.steps.shift();
        const target = this.steps[0];

        if (origin && target) {
          this.duration =
            (1 + calculateDuration(origin) / 1000.0) / this.selectedSpeed;

          let originClass = this.hashCodeToClassMap.get(origin.methodHash);
          let targetClass = this.hashCodeToClassMap.get(target.methodHash);
          // let method = clazz?.methods.find(
          //   (method) => method.methodHash === current?.methodHash
          // );

          if (originClass && targetClass) {
            let originMesh = this.applicationRenderer.getMeshById(
              originClass.id
            );
            let targetMesh = this.applicationRenderer.getMeshById(
              targetClass.id
            );
            if (originMesh && targetMesh) {
              let scale = this.applicationRenderer.forceGraph.scale;
              let start = this.applicationRenderer
                .getGraphPosition(originMesh)
                .multiply(scale);
              let end = this.applicationRenderer
                .getGraphPosition(targetMesh)
                .multiply(scale);

              const classDistance = Math.hypot(
                end.x - start.x,
                end.z - start.z
              );
              const height =
                classDistance *
                0.2 *
                this.applicationRenderer.appSettings.curvyCommHeight.value;
              const middle = new THREE.Vector3(
                start.x + (end.x - start.x) / 2.0,
                height + start.y + (end.y - start.y) / 2.0,
                start.z + (end.z - start.z) / 2.0
              );

              this.curve = new THREE.QuadraticBezierCurve3(start, middle, end);

              this.cloud[0].position.copy(start);
              this.cloud[0].visible = true;
            }
          }

          // this.args.highlightTrace(this.args.selectedTrace, current.spanId);
        }
      } else {
        this.stop();
      }
    }
  }

  @action
  start() {
    this.isReplayAnimated = true;
    this.steps = [...this.traceSteps];
    this.args.renderingLoop.updatables.push(this);

    const geometry = new THREE.SphereGeometry(0.05, 16, 16);

    const colors = ['red', 'green', 'blue'];

    for (let i = 0; i < 3; ++i) {
      const material = new THREE.MeshBasicMaterial({ color: colors[i] });
      let mesh = new THREE.Mesh(geometry, material);
      mesh.visible = false;
      this.args.renderingLoop.scene.add(mesh);
      this.cloud.push(mesh);
    }
  }

  @action
  stop() {
    this.isReplayAnimated = false;
    this.steps.clear();
    this.args.renderingLoop.updatables.removeObject(this);
    this.progress = 0;

    for (let mesh of this.cloud) {
      this.args.renderingLoop.scene.remove(mesh);
    }
    this.cloud.clear();
  }

  @action
  selectNextTraceStep() {
    // Can only select next step if a trace is selected
    if (!this.currentTraceStep) {
      return;
    }

    const currentTracePosition = this.traceSteps.findIndex(
      (span) => span === this.currentTraceStep
    );

    if (currentTracePosition === -1) {
      return;
    }

    const nextStepPosition = currentTracePosition + 1;

    if (nextStepPosition > this.traceSteps.length - 1) {
      return;
    }

    this.currentTraceStep = this.traceSteps[nextStepPosition];

    console.log(this.currentTraceStep);

    this.args.highlightTrace(
      this.args.selectedTrace,
      this.currentTraceStep.spanId
    );
  }

  @action
  selectPreviousTraceStep() {
    // Can only select next step if a trace is selected
    if (!this.currentTraceStep) {
      return;
    }

    const currentTracePosition = this.traceSteps.findIndex(
      (span) => span === this.currentTraceStep
    );

    if (currentTracePosition === -1) {
      return;
    }

    const previousStepPosition = currentTracePosition - 1;

    if (previousStepPosition < 0) {
      return;
    }

    this.currentTraceStep = this.traceSteps[previousStepPosition];

    this.args.highlightTrace(
      this.args.selectedTrace,
      this.currentTraceStep.spanId
    );
  }
}
