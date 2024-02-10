import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
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

  constructor(owner: any, args: Args) {
    super(owner, args);
    const { selectedTrace } = this.args;
    this.traceSteps = getSortedTraceSpans(selectedTrace);

    if (this.traceSteps.length > 0) {
      const [firstStep] = this.traceSteps;
      this.currentTraceStep = firstStep;

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

    if (this.isReplayAnimated) {
      this.args.moveCameraTo(this.currentTraceStep);
    }
  }
}
