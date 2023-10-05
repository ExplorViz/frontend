import Component from '@glimmer/component';
import { Class } from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import { inject as service } from '@ember/service';
import LandscapeRestructure from 'explorviz-frontend/services/landscape-restructure';
import ApplicationRepository from 'explorviz-frontend/services/repos/application-repository';
import HeatmapConfiguration from 'heatmap/services/heatmap-configuration';

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

  @service('heatmap-configuration')
  heatmapConf!: HeatmapConfiguration;

  @service('landscape-restructure')
  landscapeRestructure!: LandscapeRestructure;

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
      const metrics = currentApplicationHeatmapData.latestClazzMetricScores;
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
