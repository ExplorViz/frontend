import { action, computed } from '@ember/object';
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import {
  Span,
  Trace,
} from 'explorviz-frontend/utils/landscape-schemes/dynamic/dynamic-data';
import {
  Class,
  Application,
  StructureLandscapeData,
} from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import { getHashCodeToClassMap } from 'explorviz-frontend/utils/landscape-structure-helpers';
import {
  calculateDuration,
  getSortedTraceSpans,
  sortTracesByDuration,
  sortTracesById,
} from 'explorviz-frontend/utils/trace-helpers';

export type TimeUnit = 'ns' | 'ms' | 's';

interface Args {
  moveCameraTo(emberModel: Class | Span): void;
  selectTrace(trace: Trace): void;
  readonly structureData: StructureLandscapeData;
  readonly application: Application;
  readonly selectedTrace: Trace;
  readonly applicationTraces: Trace[];
}

export default class TraceSelection extends Component<Args> {
  // default time units
  @tracked
  traceTimeUnit: TimeUnit = 'ms';

  @tracked
  sortBy: any = 'traceId';

  @tracked
  isSortedAsc: boolean = true;

  @tracked
  filterTerm: string = '';

  @computed(
    'args.selectedTrace',
    'firstClasses',
    'lastClasses',
    'sortBy',
    'isSortedAsc',
    'filterTerm'
  )
  get traces() {
    return this.filterAndSortTraces();
  }

  @computed('traces')
  get traceDurations() {
    return this.traces.map((trace) => calculateDuration(trace));
  }

  @computed('args.applicationTraces')
  get firstClasses() {
    const sortedSpanLists = this.args.applicationTraces.map((trace) =>
      getSortedTraceSpans(trace)
    );

    const hashCodeToClassInLandscapeMap = getHashCodeToClassMap(
      this.args.structureData
    );

    const traceIdToFirstClassMap = new Map<string, Class>();

    this.args.applicationTraces.forEach((trace, index) => {
      const spanList = sortedSpanLists[index];

      const firstClassHashCode = spanList[0].hashCode;
      const firstClass = hashCodeToClassInLandscapeMap.get(firstClassHashCode)!;

      traceIdToFirstClassMap.set(trace.traceId, firstClass);
    });

    return traceIdToFirstClassMap;
  }

  @computed('args.applicationTraces')
  get lastClasses() {
    const sortedSpanLists = this.args.applicationTraces.map((trace) =>
      getSortedTraceSpans(trace)
    );

    const hashCodeToClassInLandscapeMap = getHashCodeToClassMap(
      this.args.structureData
    );

    const traceIdToLastClassMap = new Map<string, Class>();

    this.args.applicationTraces.forEach((trace, index) => {
      const spanList = sortedSpanLists[index];

      const lastClassHashCode = spanList[spanList.length - 1].hashCode;
      const lastClass = hashCodeToClassInLandscapeMap.get(lastClassHashCode)!;

      traceIdToLastClassMap.set(trace.traceId, lastClass);
    });

    return traceIdToLastClassMap;
  }

  filterAndSortTraces() {
    if (this.args.selectedTrace) {
      return [this.args.selectedTrace];
    }

    const filteredTraces: Trace[] = [];
    const filter = this.filterTerm;
    this.args.applicationTraces.forEach((trace) => {
      if (filter === '' || trace.traceId.toLowerCase().includes(filter)) {
        filteredTraces.push(trace);
        return;
      }

      const firstClass = this.firstClasses.get(trace.traceId);
      const lastClass = this.lastClasses.get(trace.traceId);

      if (
        (firstClass && firstClass.name.toLowerCase().includes(filter)) ||
        (lastClass && lastClass.name.toLowerCase().includes(filter))
      ) {
        filteredTraces.push(trace);
      }
    });

    if (this.sortBy === 'traceId') {
      sortTracesById(filteredTraces, this.isSortedAsc);
    }
    if (this.sortBy === 'firstClassName') {
      this.sortTracesByfirstClassName(filteredTraces, this.isSortedAsc);
    }
    if (this.sortBy === 'lastClassName') {
      this.sortTracesBylastClassName(filteredTraces, this.isSortedAsc);
    }
    if (this.sortBy === 'traceDuration') {
      sortTracesByDuration(filteredTraces, this.isSortedAsc);
    }

    return filteredTraces;
  }

  sortTracesByfirstClassName(traces: Trace[], ascending = true) {
    traces.sort((a, b) => {
      const firstClassA = this.firstClasses.get(a.traceId)!;
      const firstClassB = this.firstClasses.get(b.traceId)!;

      if (firstClassA.name > firstClassB.name) {
        return 1;
      }
      if (firstClassB.name > firstClassA.name) {
        return -1;
      }
      return 0;
    });

    if (!ascending) {
      traces.reverse();
    }
  }

  sortTracesBylastClassName(traces: Trace[], ascending = true) {
    traces.sort((a, b) => {
      const lastClassA = this.lastClasses.get(a.traceId)!;
      const lastClassB = this.lastClasses.get(b.traceId)!;

      if (lastClassA.name > lastClassB.name) {
        return 1;
      }
      if (lastClassB.name > lastClassA.name) {
        return -1;
      }
      return 0;
    });

    if (!ascending) {
      traces.reverse();
    }
  }

  @action
  filter(inputEvent: InputEvent) {
    // Case insensitive string filter
    this.filterTerm = (
      inputEvent.target as HTMLInputElement
    ).value.toLowerCase();
  }

  @action
  toggleTraceTimeUnit() {
    const timeUnit = this.traceTimeUnit;

    if (timeUnit === 'ns') {
      this.traceTimeUnit = 'ms';
    } else if (timeUnit === 'ms') {
      this.traceTimeUnit = 's';
    } else if (timeUnit === 's') {
      this.traceTimeUnit = 'ns';
    }
  }

  @action
  sortByProperty(property: any) {
    // Determine order for sorting
    if (this.sortBy === property) {
      // Toggle sorting order
      this.isSortedAsc = !this.isSortedAsc;
    } else {
      // Sort in ascending order by default
      this.isSortedAsc = true;
    }

    this.sortBy = property;
  }
}
