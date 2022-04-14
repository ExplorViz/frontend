import { action } from '@ember/object';
import Service, { inject as service } from '@ember/service';
import Evented from '@ember/object/evented';
import debugLogger from 'ember-debug-logger';
import { tracked } from '@glimmer/tracking';
import ApplicationObject3D from 'explorviz-frontend/view-objects/3d/application/application-object-3d';
import LandscapeListener from 'explorviz-frontend/services/landscape-listener';
import { getDefaultGradient as getSimpleDefaultGradient } from '../utils/simple-heatmap';
import revertKey from '../utils/heatmap-generator';
import { restartableTask } from 'ember-concurrency-decorators';
import AlertifyHandler from 'explorviz-frontend/utils/alertify-handler';

export type Metric = {
  name: string;
  description: string;
  min: number,
  max: number,
  values: Map<string, number>
};

export type ApplicationHeatmaps = {
  applicationId: string,
  metrics: Metric[],
  latestClazzMetricScores: Metric[],
  metricsArray: [Metric[]],
  differenceMetricScores: Map<string, Metric[]>,
  aggregatedMetricScores: Map<string, Metric>,
}

type HeatmapMode = 'snapshotHeatmap' | 'aggregatedHeatmap' | 'windowedHeatmap';

export default class HeatmapConfiguration extends Service.extend(Evented) {
  @service('landscape-listener')
  landscapeListener!: LandscapeListener;

  @service()
  private worker!: any;

  @tracked
  heatmapActive = false;

  @tracked
  currentApplication: ApplicationObject3D | undefined | null;

  // Switch for the legend
  legendActive = true;

  // TODO what to do with this?
  largestValue = 0;


  windowSize: number = 9;

  applicationHeatmaps: Map<string, ApplicationHeatmaps> = new Map<string, ApplicationHeatmaps>();

  @tracked
  selectedMetric?: Metric;

  // Switches and models used by config
  @tracked
  selectedMode: HeatmapMode = 'aggregatedHeatmap';

  useHelperLines = true;

  opacityValue = 0.03;

  heatmapRadius = 2;

  blurRadius = 0;

  showLegendValues = true;

  simpleHeatGradient = getSimpleDefaultGradient();

  debug = debugLogger();

  @action
  toggleHeatmap() {
    this.heatmapActive = !this.heatmapActive;
  }

  get applicationHeatmap() {
    if (this.currentApplication) {
      return this.applicationHeatmaps.get(this.currentApplication.dataModel.id)
    }
    return null;
  }

  get latestClazzMetricScores() {
    const applicationHeatmap = this.applicationHeatmap;
    if (applicationHeatmap) {
      return applicationHeatmap.latestClazzMetricScores;
    }
    return []
  }

  setActiveApplication(applicationObject3D: ApplicationObject3D) {
    this.currentApplication = applicationObject3D;
    const applicationHeatmaps = this.applicationHeatmap;
    if (applicationHeatmaps) {
      this.updateCurrentlyViewedMetric(applicationHeatmaps);
    }
  }

  private setSelectedMetricForCurrentMode(metricName: string) {
    let chosenMetric = null;
    const applicationHeatmap = this.applicationHeatmap;
    if (!applicationHeatmap) {
      return;
    }

    switch (this.selectedMode) {
      case 'snapshotHeatmap':
        if (applicationHeatmap.latestClazzMetricScores) {
          chosenMetric = applicationHeatmap.latestClazzMetricScores
            .find((metric) => metric.name === metricName);
          if (chosenMetric) {
            // console.log('chose snapshot');
            this.selectedMetric = chosenMetric;
          }
        }
        break;
      case 'aggregatedHeatmap':
        if (applicationHeatmap.aggregatedMetricScores) {
          chosenMetric = applicationHeatmap.aggregatedMetricScores.get(metricName);
          if (chosenMetric) {
            // console.log('chose aggregated');
            this.selectedMetric = chosenMetric;
          }
        }
        break;
      case 'windowedHeatmap':
        if (applicationHeatmap.differenceMetricScores) {
          chosenMetric = applicationHeatmap.differenceMetricScores.get(metricName);
          // console.log(this.differenceMetricScores);
          // console.log('chosenMetric', chosenMetric);
          if (chosenMetric && chosenMetric[chosenMetric.length - 1]) {
            // console.log('chose windowed');
            this.selectedMetric = chosenMetric[chosenMetric.length - 1];
            // console.log(this.selectedMetric);
          }
        }
        break;
      default:
        break;
    }
  }

  @restartableTask *
    calculateHeatmapTask(
      applicationObject3D: ApplicationObject3D,
  ) {
    this.debug('Calculate heatmap' + applicationObject3D.id)
    try {
      const workerPayload = {
        structure: applicationObject3D.dataModel,
        dynamic: applicationObject3D.traces,
      };

      const metrics: Metric[] = yield this.worker.postMessage('metrics-worker', workerPayload);


      const applicationHeatmaps = this.getApplicationHeatmaps(applicationObject3D);
      applicationHeatmaps.latestClazzMetricScores = metrics;

      this.saveAndCalculateMetricScores(applicationHeatmaps);
      this.debug('Calculated heatmap')

      if (applicationObject3D == this.currentApplication) {
        this.updateCurrentlyViewedMetric(applicationHeatmaps);
      }

      // return this.updateCurrentlyViewedMetric();
      // this.updateCurrentlyViewedMetric();

      // AlertifyHandler.showAlertifyMessage('Calculated heatmap')
    } catch (e) {
      AlertifyHandler.showAlertifyError('Error calculating heatmap')
      this.debug(e);
    }
  }

  private getApplicationHeatmaps(applicationObject3D: ApplicationObject3D) {
    const applicationId = applicationObject3D.dataModel.id;
    const applicationHeatmaps = this.applicationHeatmaps.get(applicationObject3D.dataModel.id);
    if (!applicationHeatmaps) {

      const newApplicationHeatmaps = {
        applicationId: applicationObject3D.dataModel.id,
        metrics: [] as Metric[],
        metricsArray: [[]] as [Metric[]],
        latestClazzMetricScores: [] as Metric[],
        differenceMetricScores: new Map<string, Metric[]>(),
        aggregatedMetricScores: new Map<string, Metric>(),
      }
      this.applicationHeatmaps.set(applicationId, newApplicationHeatmaps);
      return newApplicationHeatmaps;
    }
    return applicationHeatmaps;

  }

  private updateCurrentlyViewedMetric(applicationHeatmaps: ApplicationHeatmaps) {
    // Update currently viewed metric
    if (this.selectedMetric) {
      let updatedMetric;

      if (this.selectedMode === 'aggregatedHeatmap') {
        const chosenMetric = applicationHeatmaps.aggregatedMetricScores.get(this.selectedMetric?.name);
        if (chosenMetric) {
          updatedMetric = chosenMetric;
          // console.log('updated aggregated', updatedMetric);
        }
      } else if (this.selectedMode === 'windowedHeatmap') {
        const chosenMetric = applicationHeatmaps.differenceMetricScores.get(this.selectedMetric?.name);
        if (chosenMetric && chosenMetric[chosenMetric.length - 1]) {
          // console.log('updated windowed');
          updatedMetric = chosenMetric[chosenMetric.length - 1];
        }
      } else if (this.selectedMode === 'snapshotHeatmap') {
        updatedMetric = applicationHeatmaps.latestClazzMetricScores.find(
          (latestMetric) => latestMetric.name === this.selectedMetric?.name,
        );
      }
      if (updatedMetric) {
        this.selectedMetric = updatedMetric;
      }
      this.debug('Updated currently viewed metric');
    } else {
      this.selectedMetric = this.latestClazzMetricScores.firstObject;
    }
  }

  @action
  updateMetric(metric: Metric) {
    const metricName = metric.name;
    this.setSelectedMetricForCurrentMode(metricName);
  }


  private saveAndCalculateMetricScores(applicationHeatmap: ApplicationHeatmaps) {
    const newScores = applicationHeatmap.latestClazzMetricScores;
    function roundToTwoDecimalPlaces(num: number): number {
      return Math.round((num + Number.EPSILON) * 100) / 100;
    }

    // calculate new aggregated (cont and windowed) metric scores
    newScores.forEach((newMetricScore) => {
      const metricName = newMetricScore.name;
      if (Object.values(newMetricScore)) {
        applicationHeatmap.metrics.push(newMetricScore);

        const newWindowedMetricsMap = new Map<string, number>();

        const oldScoresForMetricType = applicationHeatmap.metricsArray.slice(-this.windowSize);
        const oldScoresForMetricTypeFlattened = oldScoresForMetricType.flat();

        // console.log('all old Scores flattened', oldScoresForMetricTypeFlattened);

        // update values
        newMetricScore.values.forEach((value, key) => {
          // calculate windowed scores

          const oldScoresFilteredMetricType = oldScoresForMetricTypeFlattened
            .filter((metric) => metric.name === metricName);

          // console.log('oldScores', oldScoresFilteredMetricType);

          if (oldScoresFilteredMetricType?.length > 0) {
            let newMetricValue = 0;

            oldScoresFilteredMetricType.forEach((oldMetricScore) => {
              const oldValue = oldMetricScore.values.get(key);
              // console.log('oldValue', key, oldValue);
              if (oldValue) {
                newMetricValue += oldValue;
              }
            });
            newMetricValue += value;
            newMetricValue /= (this.windowSize + 1);
            newWindowedMetricsMap.set(key, roundToTwoDecimalPlaces(newMetricValue));
            // console.log('set new Window', key, newMetricValue);
          } else {
            // console.log('init value');
            newWindowedMetricsMap.set(key, value);
          }

          // calculate continuously aggregated scores

          const oldMetricAggregated = applicationHeatmap.aggregatedMetricScores.get(metricName);
          const oldMetricScores = oldMetricAggregated?.values;

          // Init metrics (first run)
          if (!oldMetricAggregated) {
            // console.log('init agg Metric', newMetricScore.values);
            applicationHeatmap.aggregatedMetricScores.set(metricName, newMetricScore);
          } else if (oldMetricScores) {
            // update metric scores (subsequent runs)
            const oldScore = oldMetricScores.get(key);
            if (oldScore) {
              // console.log('udpate agg Metric', key, value + 0.5 * oldScore);
              applicationHeatmap.aggregatedMetricScores.get(metricName)?.values.set(key,
                roundToTwoDecimalPlaces(value + 0.5 * oldScore));
            }
          }
        });

        // Update min max for continuously aggregated metric scores

        let newMinAgg: number = 0;
        let newMaxAgg: number = 0;

        if (applicationHeatmap.aggregatedMetricScores.get(metricName)) {
          applicationHeatmap.aggregatedMetricScores.get(metricName)!.values.forEach((value) => {
            if (newMinAgg) {
              newMinAgg = value < newMinAgg ? value : newMinAgg;
            } else {
              newMinAgg = value;
            }

            if (newMaxAgg) {
              newMaxAgg = value > newMaxAgg ? value : newMaxAgg;
            } else {
              newMaxAgg = value;
            }
          });

          const newMetricScoreObject = {
            name: metricName,
            mode: 'aggregatedHeatmap',
            description: newMetricScore.description,
            min: roundToTwoDecimalPlaces(newMinAgg),
            max: roundToTwoDecimalPlaces(newMaxAgg),
            values: applicationHeatmap.aggregatedMetricScores.get(metricName)!.values,
          };

          applicationHeatmap.aggregatedMetricScores.set(metricName, newMetricScoreObject);

          // this.aggregatedMetricScores.get(metricName)!.max = newMaxAgg;
          // this.aggregatedMetricScores.get(metricName)!.min = newMinAgg;
        }

        // Finally, set new Metrics for windowed mode

        if (newWindowedMetricsMap.size > 0) {
          // console.log('new window map', newWindowedMetricsMap);

          let newMin: any;
          let newMax: any;

          newWindowedMetricsMap.forEach((value) => {
            if (newMin) {
              newMin = value < newMin ? value : newMin;
            } else {
              newMin = value;
            }

            if (newMax) {
              newMax = value > newMax ? value : newMax;
            } else {
              newMax = value;
            }
          });

          // console.log('new window map objects', Object.values(newWindowedMetricsMap));

          const newMetricScoreObject = {
            name: metricName,
            mode: 'aggregatedHeatmap',
            description: newMetricScore.description,
            min: roundToTwoDecimalPlaces(newMin),
            max: roundToTwoDecimalPlaces(newMax),
            values: newWindowedMetricsMap,
          };
          // console.log('new Metric Score', newMetricScoreObject);

          if (applicationHeatmap.differenceMetricScores && applicationHeatmap.differenceMetricScores.get(metricName)) {
            applicationHeatmap.differenceMetricScores.get(metricName)?.push(newMetricScoreObject);
          } else {
            applicationHeatmap.differenceMetricScores.set(metricName, [newMetricScoreObject]);
          }
          // console.log('new windowed metrics', this.differenceMetricScores);
        }
      }
    });
    applicationHeatmap.metricsArray.push(newScores);
    this.debug('Pushed new metrics');
  }

  switchMode() {
    switch (this.selectedMode) {
      case 'snapshotHeatmap':
        this.selectedMode = 'aggregatedHeatmap';
        break;
      case 'aggregatedHeatmap':
        this.selectedMode = 'windowedHeatmap';
        break;
      case 'windowedHeatmap':
        this.selectedMode = 'snapshotHeatmap';
        break;
      default:
        this.selectedMode = 'snapshotHeatmap';
        break;
    }
  }

  toggleLegend() {
    this.set('legendActive', !this.legendActive);
  }

  /**
   * Return a gradient where the '_' character in the keys is replaced with '.'.
   */
  getSimpleHeatGradient() {
    return revertKey(this.simpleHeatGradient);
  }

  /**
   * Reset the gradient to default values.
   */
  resetSimpleHeatGradient() {
    this.set('simpleHeatGradient', getSimpleDefaultGradient());
  }

  /**
   * Reset all class attribute values to null;
   */
  cleanup() {
    this.set('applicationHeatmaps', null);
    this.set('selectedMetric', null);
    this.set('currentApplication', null);
    this.set('heatmapActive', false);
    this.set('largestValue', 0);
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    'heatmap-configuration': HeatmapConfiguration;
  }
}
