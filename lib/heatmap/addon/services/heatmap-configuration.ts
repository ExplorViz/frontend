import Service, { inject as service } from '@ember/service';
import Evented from '@ember/object/evented';
import debugLogger from 'ember-debug-logger';
import { tracked } from '@glimmer/tracking';
import ApplicationObject3D from 'explorviz-frontend/view-objects/3d/application/application-object-3d';
import LandscapeListener from 'explorviz-frontend/services/landscape-listener';
import { getDefaultGradient as getSimpleDefaultGradient } from '../utils/simple-heatmap';
import revertKey from '../utils/heatmap-generator';

export type Metric = {
  name: string;
  description: string;
  min: number,
  max: number,
  values: Map<string, number>
};

type HeatmapMode = 'snapshotHeatmap' | 'aggregatedHeatmap' | 'windowedHeatmap';

export default class HeatmapConfiguration extends Service.extend(Evented) {
  @service('landscape-listener')
  landscapeListener!: LandscapeListener;

  @tracked
  heatmapActive = false;

  currentApplication: ApplicationObject3D | undefined | null;

  // Switch for the legend
  legendActive = true;

  @tracked
  latestClazzMetricScores: Metric[] = [];

  largestValue = 0;

  metrics: Metric[] = [];

  metricsArray: [Metric[]] = [[]];

  differenceMetricScores: Map<string, Metric[]> = new Map<string, Metric[]>();

  aggregatedMetricScores: Map<string, Metric> = new Map<string, Metric>();

  windowSize: number = 9;

  @tracked
  selectedMetric: Metric | null = null;

  applicationID: string | null = null;

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

  setSelectedMetricForCurrentMode(metricName: string) {
    let chosenMetric = null;

    switch (this.selectedMode) {
      case 'snapshotHeatmap':
        if (this.latestClazzMetricScores) {
          chosenMetric = this.latestClazzMetricScores
            .find((metric) => metric.name === metricName);
          if (chosenMetric) {
            // console.log('chose snapshot');
            this.selectedMetric = chosenMetric;
          }
        }
        break;
      case 'aggregatedHeatmap':
        if (this.aggregatedMetricScores) {
          chosenMetric = this.aggregatedMetricScores.get(metricName);
          if (chosenMetric) {
            // console.log('chose aggregated');
            this.selectedMetric = chosenMetric;
          }
        }
        break;
      case 'windowedHeatmap':
        if (this.differenceMetricScores) {
          chosenMetric = this.differenceMetricScores.get(metricName);
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
    // console.log('selected metric', this.selectedMetric);
    this.triggerMetricUpdate();
  }

  updateCurrentlyViewedMetric() {
    // Update currently viewed metric
    this.debug('SelctedMetric:' + this.selectedMetric)
    if (this.selectedMetric) {
      this.debug('SelctedMetric:' + this.selectedMetric.name)
      let updatedMetric;

      if (this.selectedMode === 'aggregatedHeatmap') {
        const chosenMetric = this.aggregatedMetricScores.get(this.selectedMetric?.name);
        if (chosenMetric) {
          updatedMetric = chosenMetric;
          // console.log('updated aggregated', updatedMetric);
        }
      } else if (this.selectedMode === 'windowedHeatmap') {
        const chosenMetric = this.differenceMetricScores.get(this.selectedMetric?.name);
        if (chosenMetric && chosenMetric[chosenMetric.length - 1]) {
          // console.log('updated windowed');
          updatedMetric = chosenMetric[chosenMetric.length - 1];
        }
      } else if (this.selectedMode === 'snapshotHeatmap') {
        updatedMetric = this.latestClazzMetricScores.find(
          (latestMetric) => latestMetric.name === this.selectedMetric?.name,
        );
        if (updatedMetric) {
          // console.log('updated snapshot');
        }
      }
      if (updatedMetric) {
        this.selectedMetric = updatedMetric;
      }
    }
  }

  saveAndCalculateMetricScores(newScores: Metric[]) {
    function roundToTwoDecimalPlaces(num: number): number {
      return Math.round((num + Number.EPSILON) * 100) / 100;
    }

    // calculate new aggregated (cont and windowed) metric scores
    newScores.forEach((newMetricScore) => {
      const metricName = newMetricScore.name;
      if (Object.values(newMetricScore)) {
        this.metrics.push(newMetricScore);

        const newWindowedMetricsMap = new Map<string, number>();

        const oldScoresForMetricType = this.metricsArray.slice(-this.windowSize);
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

          const oldMetricAggregated = this.aggregatedMetricScores.get(metricName);
          const oldMetricScores = oldMetricAggregated?.values;

          // Init metrics (first run)
          if (!oldMetricAggregated) {
            // console.log('init agg Metric', newMetricScore.values);
            this.aggregatedMetricScores.set(metricName, newMetricScore);
          } else if (oldMetricScores) {
            // update metric scores (subsequent runs)
            const oldScore = oldMetricScores.get(key);
            if (oldScore) {
              // console.log('udpate agg Metric', key, value + 0.5 * oldScore);
              this.aggregatedMetricScores.get(metricName)?.values.set(key,
                roundToTwoDecimalPlaces(value + 0.5 * oldScore));
            }
          }
        });

        // Update min max for continuously aggregated metric scores

        let newMinAgg: number = 0;
        let newMaxAgg: number = 0;

        if (this.aggregatedMetricScores.get(metricName)) {
          this.aggregatedMetricScores.get(metricName)!.values.forEach((value) => {
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
            values: this.aggregatedMetricScores.get(metricName)!.values,
          };

          this.aggregatedMetricScores.set(metricName, newMetricScoreObject);

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

          if (this.differenceMetricScores && this.differenceMetricScores.get(metricName)) {
            this.differenceMetricScores.get(metricName)?.push(newMetricScoreObject);
          } else {
            this.differenceMetricScores.set(metricName, [newMetricScoreObject]);
          }
          // console.log('new windowed metrics', this.differenceMetricScores);
        }
      }
    });
    this.metricsArray.push(newScores);
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
    if (this.selectedMetric?.name) {
      this.setSelectedMetricForCurrentMode(this.selectedMetric?.name);
    }
  }

  triggerHeatmapMode() {
    this.debug('triggerHeadmapMode')
    if (this.applicationID) {
      if (this.latestClazzMetricScores !== null) {
        // TODO ask this is not used?
        this.trigger('updatedHeatMapMode', this.selectedMode);
      }
    }
  }

  triggerLatestHeatmapUpdate() {
    this.debug('triggerHeadmapUpdate')
    if (this.applicationID) {
      if (this.latestClazzMetricScores !== null) {
        this.trigger('updatedClazzMetrics', this.latestClazzMetricScores);
      }
    }
  }

  triggerMetricUpdate() {
    this.debug('triggerMetricUpdate')
    if (this.applicationID) {
      if (this.latestClazzMetricScores !== null) {
        // TODO ask this is not used?
        this.trigger('newSelectedMetric', this.selectedMetric);
      }
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
    this.set('latestClazzMetricScores', null);
    this.set('selectedMetric', null);
    this.set('applicationID', null);
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
