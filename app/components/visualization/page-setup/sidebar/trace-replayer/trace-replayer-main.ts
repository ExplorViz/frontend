import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import {
  Span,
  Trace,
} from 'explorviz-frontend/utils/landscape-schemes/dynamic/dynamic-data';
import {
  Class,
  StructureLandscapeData,
} from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import { getSortedTraceSpans } from 'explorviz-frontend/utils/trace-helpers';
import {
  getApplicationFromClass,
  getHashCodeToClassMap,
  spanIdToClass,
} from 'explorviz-frontend/utils/landscape-structure-helpers';
import ApplicationRenderer from 'explorviz-frontend/services/application-renderer';
import LocalUser from 'collaboration/services/local-user';

interface Args {
  selectedTrace: Trace;
  structureData: StructureLandscapeData;
  highlightTrace(trace: Trace, traceStep: string): void;
  moveCameraTo(emberModel: Class | Span): void;
}

export default class TraceReplayerMain extends Component<Args> {
  @tracked
  isReplayAnimated: boolean = true;

  @tracked
  currentTraceStep: Span | null = null;

  @tracked
  traceSteps: Span[] = [];

  @service('application-renderer')
  applicationRenderer!: ApplicationRenderer;

  @service('local-user')
  localUser!: LocalUser;

  constructor(owner: any, args: Args) {
    super(owner, args);
    const { selectedTrace } = this.args;
    this.traceSteps = getSortedTraceSpans(selectedTrace);

    if (this.traceSteps.length > 0) {
      const [firstStep] = this.traceSteps;
      this.currentTraceStep = firstStep;

      this.pingTraceStep();

      if (this.isReplayAnimated) {
        this.args.moveCameraTo(this.currentTraceStep);
      }
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

  @action
  toggleAnimation() {
    this.isReplayAnimated = !this.isReplayAnimated;
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

    this.args.highlightTrace(
      this.args.selectedTrace,
      this.currentTraceStep.spanId
    );

    this.pingTraceStep();

    if (this.isReplayAnimated) {
      this.args.moveCameraTo(this.currentTraceStep);
    }
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

    this.pingTraceStep();

    if (this.isReplayAnimated) {
      this.args.moveCameraTo(this.currentTraceStep);
    }
  }

  private pingTraceStep() {
    const traceOfSpan = this.args.selectedTrace;

    if (!traceOfSpan) {
      return;
    }

    if (this.sourceClass) {
      const sourceAppObject3D = this.applicationRenderer.getApplicationById(
        this.sourceApplication!.id
      );

      const sourceClazzMesh = sourceAppObject3D!.getBoxMeshbyModelId(
        this.sourceClass!.id
      );

      this.localUser.ping(
        sourceClazzMesh!,
        sourceClazzMesh!.getWorldPosition(sourceClazzMesh!.position)
      );
    } else if (this.targetClass) {
      const targetAppObject3D = this.applicationRenderer.getApplicationById(
        this.targetApplication!.id
      );

      const targetClazzMesh = targetAppObject3D!.getBoxMeshbyModelId(
        this.targetClass.id
      );

      this.localUser.ping(
        targetClazzMesh!,
        targetClazzMesh!.getWorldPosition(targetClazzMesh!.position)
      );
    }
  }
}
