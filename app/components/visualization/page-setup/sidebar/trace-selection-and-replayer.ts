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

interface Args {
  moveCameraTo(emberModel: Class | Span): void;
  highlightTrace(trace: Trace, traceStep: string): void;
  removeHighlighting(): void;
  removeComponent(componentPath: string): void;
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
        (span) => hashCodeToClassMap.get(span.hashCode) !== undefined
      )
    );
  }

  @action
  selectTrace(trace: Trace) {
    // Reset highlighting when highlighted trace is clicked again
    if (trace === this.selectedTrace) {
      this.selectedTrace = null;
      this.args.removeHighlighting();
      return;
    }

    this.selectedTrace = trace;
  }

  @action
  close() {
    this.args.removeComponent('trace-selection');
  }

  willDestroy() {
    super.willDestroy();
    if (this.selectedTrace) {
      this.args.removeHighlighting();
    }
  }
}
