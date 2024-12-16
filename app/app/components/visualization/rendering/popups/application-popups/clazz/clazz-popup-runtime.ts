import Component from '@glimmer/component';
import { Class } from 'react-lib/src/utils/landscape-schemes/structure-data';
import { inject as service } from '@ember/service';
import LandscapeRestructure from 'explorviz-frontend/services/landscape-restructure';
import ApplicationRepository from 'explorviz-frontend/services/repos/application-repository';
import HeatmapConfiguration from 'explorviz-frontend/services/heatmap/heatmap-configuration';

interface Args {
  clazz: Class;
  applicationId: string;
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

  @service('heatmap/heatmap-configuration')
  heatmapConf!: HeatmapConfiguration;

  @service('landscape-restructure')
  landscapeRestructure!: LandscapeRestructure;

  get name() {
    return this.args.clazz.name;
  }

  get applicationMetricsForEncompassingApplication() {
    return this.applicationRepo.getById(this.args.applicationId)
      ?.applicationMetrics;
  }

  get allMetrics() {
    const applicationMetricsForCurrentApplication =
      this.applicationMetricsForEncompassingApplication;
    const allClassMetricScores: AllMetricScoresObject[] = [];

    // snapshot
    if (applicationMetricsForCurrentApplication) {
      const metrics =
        applicationMetricsForCurrentApplication.latestClazzMetricScores;
      metrics.forEach((metric) => {
        const aggMetrics =
          applicationMetricsForCurrentApplication.aggregatedMetricScores.get(
            metric.name
          );

        let winValToShow;

        const winMetrics =
          applicationMetricsForCurrentApplication.differenceMetricScores.get(
            metric.name
          );

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
    const applicationMetricsForCurrentApplication =
      this.applicationMetricsForEncompassingApplication;
    const classMetrics: { name: string; value: number | undefined }[] = [];

    if (applicationMetricsForCurrentApplication) {
      const metrics =
        applicationMetricsForCurrentApplication.latestClazzMetricScores;
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
    const applicationMetricsForCurrentApplication =
      this.applicationMetricsForEncompassingApplication;
    const classMetrics: { name: string; value: number | undefined }[] = [];

    if (applicationMetricsForCurrentApplication) {
      const metrics =
        applicationMetricsForCurrentApplication.aggregatedMetricScores;
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
    const applicationMetricsForCurrentApplication =
      this.applicationMetricsForEncompassingApplication;
    const classMetrics: { name: string; value: number | undefined }[] = [];

    if (applicationMetricsForCurrentApplication) {
      const metrics =
        applicationMetricsForCurrentApplication.differenceMetricScores;
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
