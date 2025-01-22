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
import { getSortedTraceSpans } from 'explorviz-frontend/utils/trace-helpers';
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

interface Args {
  selectedTrace: Trace;
  structureData: StructureLandscapeData;
  renderingLoop: RenderingLoop;

  highlightTrace(trace: Trace, traceStep: string): void;

  readonly landscapeData: LandscapeData;

  triggerRenderingForGivenLandscapeData(
    structureData: StructureLandscapeData,
    dynamicData: DynamicLandscapeData
  ): void;
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

  constructor(owner: any, args: Args) {
    super(owner, args);
    const { selectedTrace } = this.args;
    this.traceSteps = getSortedTraceSpans(selectedTrace);

    if (this.traceSteps.length > 0) {
      const [firstStep] = this.traceSteps;
      this.currentTraceStep = firstStep;
    }
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

  public minSpeed = 0.1;
  public maxSpeed = 1.0;
  public selectedSpeed = 0.5;

  @action
  inputSpeed(_: any, htmlInputElement: any) {
    const newValue = htmlInputElement.target.value;
    if (newValue) {
      console.log(newValue);
      this.selectedSpeed = Number(newValue);
    }
  }

  @action
  changeSpeed(event: any) {
    this.selectedSpeed = Number(event.target.value);
  }

  private delta: number = 0;
  private steps: Span[] = [];

  tick(delta: number) {
    this.delta += delta;

    if (this.delta > this.selectedSpeed) {
      console.log('tick');
      this.delta = 0;

      if (this.steps.length > 0) {
        let step = this.steps.pop();
        if (step) {
          let application = this.applicationRenderer.getApplicationById(
            this.applicationRenderer.getOpenApplications()[0].getModelId()
          );

          if (application) {
            const hashCodeToClassMap = getHashCodeToClassMap(
              this.args.landscapeData.structureLandscapeData
            );
            let clazz = hashCodeToClassMap.get(step.methodHash);

            console.log(clazz);
            if (clazz) {
              let span = application.getMeshById(clazz.id);
              if (span) {
                console.log(span.position);
                if (this.track) {
                  // TODO offset
                  const position = new THREE.Vector3(0, 2, 4);
                  this.track.position.copy(position);
                }
              }
            }
          }

          this.args.highlightTrace(this.args.selectedTrace, step.spanId);
        }
      } else {
        this.stop();
      }
    }
  }

  private track;

  @action
  start() {
    this.isReplayAnimated = true;
    this.steps = [...this.traceSteps];
    this.args.renderingLoop.updatables.push(this);

    let application = this.applicationRenderer.getApplicationById(
      this.applicationRenderer.getOpenApplications()[0].getModelId()
    );

    const geometry = new THREE.SphereGeometry(0.5, 32, 32);
    const material = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    const mesh = new THREE.Mesh(geometry, material);

    const position = new THREE.Vector3(0, 1, 4);

    mesh.position.copy(position);
    this.track = mesh;

    if (application) {
      this.args.renderingLoop.scene.add(mesh);
    }
  }

  @action
  stop() {
    this.isReplayAnimated = false;
    this.steps.clear();
    this.args.renderingLoop.updatables.removeObject(this);
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
