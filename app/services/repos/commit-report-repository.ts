import Service from '@ember/service';
import Evented from '@ember/object/evented';
import { tracked } from '@glimmer/tracking';

type FileMetric = {
  // file-wise metric (can be visualized in commit tree)
  fileName: string;
  loc: number;
  cyclomaticComplexity: number | undefined;
  numberOfMethods: number | undefined;
};

export type CommitReport = {
  commitId: string;
  parentCommitId: string;
  branchName: string;
  modified: string[] | undefined;
  deleted: string[] | undefined;
  added: string[] | undefined;
  fileMetric: FileMetric[];
};

export function isCommitReport(
  commitReport: any
): commitReport is CommitReport {
  return (
    commitReport !== null &&
    typeof commitReport === 'object' &&
    typeof commitReport.commitId === 'string' &&
    typeof commitReport.parentCommitId === 'string' &&
    typeof commitReport.branchName === 'string' &&
    (typeof commitReport.modified === 'undefined' ||
      typeof commitReport.modified.every((x: any) => typeof x === 'string')) &&
    (typeof commitReport.deleted === 'undefined' ||
      typeof commitReport.deleted.every((x: any) => typeof x === 'string')) &&
    (typeof commitReport.added === 'undefined' ||
      typeof commitReport.added.every((x: any) => typeof x === 'string')) &&
    commitReport.fileMetric.every(isFileMetricType)
  );
}

function isFileMetricType(fileMetric: any): fileMetric is FileMetric {
  return (
    fileMetric !== null &&
    typeof fileMetric === 'object' &&
    typeof fileMetric.fileName === 'string' &&
    typeof fileMetric.loc === 'number' &&
    (typeof fileMetric.cyclomaticComplexity === 'number' ||
      typeof fileMetric.cyclomaticComplexity === 'undefined') &&
    (typeof fileMetric.numberOfMethods === 'number' ||
      typeof fileMetric.numberOfMethods === 'undefined')
  );
}

export default class CommitReportRepository extends Service.extend(Evented) {
  //@tracked
  commitReports: Map<string, CommitReport> = new Map<string, CommitReport>();

  getById(id: string) {
    return this.commitReports.get(id);
  }

  add(id: string, commitReport: CommitReport) {
    this.commitReports.set(id, commitReport);
    //this.notifyPropertyChange('commitReports');
  }

  cleanup() {
    this.commitReports.clear();
    //this.notifyPropertyChange('commitReports');
  }

  triggerCommitReportUpdate() {
    this.trigger('updated');
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    'repos/commit-report-repository': CommitReportRepository;
  }
}
