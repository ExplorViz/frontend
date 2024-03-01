import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import {
  DynamicLandscapeData,
  Span,
  Trace,
} from 'explorviz-frontend/utils/landscape-schemes/dynamic/dynamic-data';
import { action } from '@ember/object';
import {
  Application,
  Class,
  StructureLandscapeData,
} from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import { getHashCodeToClassMap } from 'explorviz-frontend/utils/landscape-structure-helpers';
import { getSortedTraceSpans } from 'explorviz-frontend/utils/trace-helpers';

interface Args {
  moveCameraTo(emberModel: Class | Span): void;
  highlightTrace(trace: Trace, traceStep: string): void;
  removeHighlighting(): void;
  readonly application: Application;
  readonly dynamicData: DynamicLandscapeData;
  readonly structureData: StructureLandscapeData;
}

export default class TraceSelectionAndReplayer extends Component<Args> {
  @tracked
  selectedTrace: Trace | null = null;

  get applicationTraces() {
    const hashCodeToClassMap = getHashCodeToClassMap(this.args.application);

    return this.args.dynamicData.filter((trace) =>
      trace.spanList.any(
        (span) => hashCodeToClassMap.get(span.methodHash) !== undefined
      )
    );
  }

  @action
  selectTrace(trace: Trace) {
    if (trace !== this.selectedTrace) {
      this.selectedTrace = trace;
      const traceSteps = getSortedTraceSpans(trace);

      if (traceSteps.length > 0) {
        const [firstStep] = traceSteps;

        this.args.highlightTrace(trace, firstStep.spanId);
      }
    } else {
      // Reset highlighting when highlighted trace is clicked again
      this.selectedTrace = null;
      this.args.removeHighlighting();
    }
  }

  willDestroy() {
    super.willDestroy();
    if (this.selectedTrace) {
      this.args.removeHighlighting();
    }
  }
}
