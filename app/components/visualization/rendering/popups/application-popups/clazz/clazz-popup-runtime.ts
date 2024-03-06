import Component from '@glimmer/component';
import { Class } from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import { inject as service } from '@ember/service';
import LandscapeRestructure from 'explorviz-frontend/services/landscape-restructure';
import ApplicationRepository from 'explorviz-frontend/services/repos/application-repository';
import HeatmapConfiguration from 'heatmap/services/heatmap-configuration';
import { staticMetricNames } from 'explorviz-frontend/services/repos/static-metrics-repository';
import { SelectedCommit } from 'explorviz-frontend/controllers/visualization';

interface Args {
  clazz: Class;
  applicationId: string;
  readonly selectedCommits: Map<string, SelectedCommit[]>;
  readonly selectedApplication: string | undefined;
}

type AllMetricScoresObject = {
  metricName: string;
  snapshotVal: number | undefined;
  contAggVal: number | undefined;
  winVal: number | undefined;
};

export default class ClazzPopup extends Component<Args> {
  @service('repos/application-repository')
  applicationRepo!: ApplicationRepository;

  @service('heatmap-configuration')
  heatmapConf!: HeatmapConfiguration;

  @service('landscape-restructure')
  landscapeRestructure!: LandscapeRestructure;

  get firstSelectedCommitMetrics() {
    const commitMetrics = this.allMetrics.filter((metric) => {
      return metric.metricName.endsWith('(#1 sel. commit)');
    });
    // TODO: get rid of the #1 selected commit suffix
    return commitMetrics.map((metric) => {
      const metricNameSplit = metric.metricName.split('(#');
      metric.metricName = metricNameSplit[0];
      return metric;
    });
  }

  get selectedMetricNameFromFirstCommit() {
    return this.heatmapConf.selectedMetricName.endsWith('(#1 sel. commit)');
  }

  get getNumOfCurrentSelectedCommits() {
    if (!this.args.selectedApplication) {
      return 0;
    }
    return (
      this.args.selectedCommits.get(this.args.selectedApplication)?.length || 0
    );
  }

  get firstSelectedCommitId() {
    return (
      this.args.selectedCommits
        .get(this.args.selectedApplication!)![0]
        .commitId.slice(0, 5) + '...'
    );
  }

  get secondSelectedCommitId() {
    return (
      this.args.selectedCommits
        .get(this.args.selectedApplication!)![1]
        .commitId.slice(0, 5) + '...'
    );
  }

  get isSelectedMetricFromFirstSelectedCommit() {
    const currentSelectedMetricName = this.heatmapConf.selectedMetricName;
    return currentSelectedMetricName.endsWith('(#1 sel. commit)');
  }

  get isSelectedMetricFromSecondSelectedCommit() {
    return !this.isSelectedMetricFromFirstSelectedCommit;
  }

  get selectedMetricName() {
    const selectedMetricNameSplit =
      this.heatmapConf.selectedMetricName.split('(#');
    return selectedMetricNameSplit[0];
  }

  get isSelectedApplication() {
    const applicationData = this.applicationRepo.getById(
      this.args.applicationId
    );
    return applicationData?.application.name === this.args.selectedApplication;
  }

  get secondSelectedCommitMetrics() {
    const numOfCurrentSelectedCommits = this.getNumOfCurrentSelectedCommits;
    if (numOfCurrentSelectedCommits === 2) {
      const commitMetrics = this.allMetrics.filter((metric) => {
        return metric.metricName.endsWith('(#2 sel. commit)');
      });
      return commitMetrics.map((metric) => {
        const metricNameSplit = metric.metricName.split('(#');
        metric.metricName = metricNameSplit[0];
        return metric;
      });
    }
    return [];
  }

  get name() {
    return this.args.clazz.name;
  }

  get applicationHeatmapData() {
    return this.applicationRepo.getById(this.args.applicationId)?.heatmapData;
  }

  get allMetrics() {
    const currentApplicationHeatmapData = this.applicationHeatmapData;
    const allClassMetricScores: AllMetricScoresObject[] = [];

    // snapshot
    if (currentApplicationHeatmapData) {
      const metrics =
        currentApplicationHeatmapData.latestClazzMetricScores.filter(
          (metric) => {
            return !staticMetricNames.includes(metric.name);
          }
        );

      metrics.forEach((metric) => {
        const aggMetrics =
          currentApplicationHeatmapData.aggregatedMetricScores.get(metric.name);

        let winValToShow;

        const winMetrics =
          currentApplicationHeatmapData.differenceMetricScores.get(metric.name);

        if (winMetrics) {
          const newestWinMetricScores = winMetrics[winMetrics?.length - 1];
          winValToShow = newestWinMetricScores.values.get(this.args.clazz.id);
        }

        const newEntry = {
          metricName: metric.name,
          snapshotVal: metric.values.get(this.args.clazz.id),
          contAggVal: aggMetrics?.values.get(this.args.clazz.id),
          winVal: winValToShow,
        };
        allClassMetricScores.push(newEntry);
      });
    }

    return allClassMetricScores;
  }

  get metrics() {
    const currentApplicationHeatmapData = this.applicationHeatmapData;
    const classMetrics: { name: string; value: number | undefined }[] = [];

    if (currentApplicationHeatmapData) {
      const metrics = currentApplicationHeatmapData.latestClazzMetricScores;
      metrics.forEach((metric) => {
        classMetrics.push({
          name: metric.name,
          value: metric.values.get(this.args.clazz.id),
        });
      });
    }
    return classMetrics;
  }

  get contAggregatedMetrics() {
    const currentApplicationHeatmapData = this.applicationHeatmapData;
    const classMetrics: { name: string; value: number | undefined }[] = [];

    if (currentApplicationHeatmapData) {
      const metrics = currentApplicationHeatmapData.aggregatedMetricScores;
      metrics.forEach((metric) => {
        classMetrics.push({
          name: metric.name,
          value: metric.values.get(this.args.clazz.id),
        });
      });
    }
    return classMetrics;
  }

  get windowedMetrics() {
    const currentApplicationHeatmapData = this.applicationHeatmapData;
    const classMetrics: { name: string; value: number | undefined }[] = [];

    if (currentApplicationHeatmapData) {
      const metrics = currentApplicationHeatmapData.differenceMetricScores;
      metrics.forEach((metric) => {
        const newWindowedScores = metric.lastObject;
        if (newWindowedScores) {
          classMetrics.push({
            name: newWindowedScores.name,
            value: newWindowedScores.values.get(this.args.clazz.id),
          });
        }
      });
    }
    return classMetrics;
  }
}
