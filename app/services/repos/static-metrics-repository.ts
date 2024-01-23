import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';

export interface Metrics {
    files: string[]; // fileMetrics, classMetrics and methodMetrics should have
    // the size of the files list to provide a mapping logic
    fileMetrics: {
      "loc": string;
      "cyclomatic_complexity": string;
    }[];
    classMetrics: {
      [fullQualifiedClassName: string]: { // a file can consist of multiple classes
      "loc": string;
      "LCOM4": string;
      "cyclomatic_complexity_weighted": string;
      "cyclomatic_complexity": string;
      };
    }[];
    methodMetrics: {
      "loc": string;
      "nestedBlockDepth": string;
      "cyclomatic_complexity": string;
    }[];
  }

const staticMetricNames = ["loc", "cyclomatic_complexity", "LCOM4", "cyclomatic_complexity_weighted", "cyclomatic_complexity", "nestedBlockDepth"];
export { staticMetricNames };
export default class StaticMetricsRepository extends Service.extend({
    // anything which *must* be merged to prototype here
  }) {

  @tracked
  staticMetrics: Map<string, Metrics> = new Map<
    string,
    Metrics
  >();

  getById(id: string) {
    return this.staticMetrics.get(id);
  }

  add(id: string, metrics: Metrics) {
    console.log("add metrics with id ", id, " ::: ", metrics);
    this.staticMetrics.set(id, metrics);
    this.notifyPropertyChange('staticMetrics');
  }

  cleanup() {
    this.staticMetrics.clear();
    //this.notifyPropertyChange('commitComparisons');
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    'repos/static-metrics-repository': StaticMetricsRepository;
  }
}