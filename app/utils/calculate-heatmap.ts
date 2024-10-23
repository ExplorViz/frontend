import debugLogger from 'ember-debug-logger';
import { ApplicationMetrics, Metric } from './metric-schemes/metric-data';

const windowSize = 9;

const debug = debugLogger('calculate-heatmap');

export default function calculateHeatmap(
  applicationMetrics: ApplicationMetrics,
  newScores: Metric[]
) {
  applicationMetrics.latestClazzMetricScores = newScores;
  function roundToTwoDecimalPlaces(num: number): number {
    return Math.round((num + Number.EPSILON) * 100) / 100;
  }

  // calculate new aggregated (cont and windowed) metric scores
  newScores.forEach((newMetricScore) => {
    const metricName = newMetricScore.name;
    if (Object.values(newMetricScore)) {
      applicationMetrics.metrics.push(newMetricScore);

      const newWindowedMetricsMap = new Map<string, number>();

      const oldScoresForMetricType =
        applicationMetrics.metricsArray.slice(-windowSize);
      const oldScoresForMetricTypeFlattened = oldScoresForMetricType.flat();

      debug('All old Scores flattened', oldScoresForMetricTypeFlattened);

      // update values
      newMetricScore.values.forEach((value, key) => {
        // calculate windowed scores

        const oldScoresFilteredMetricType =
          oldScoresForMetricTypeFlattened.filter(
            (metric) => metric.name === metricName
          );

        debug('oldScores', oldScoresFilteredMetricType);

        if (oldScoresFilteredMetricType?.length > 0) {
          let newMetricValue = 0;

          oldScoresFilteredMetricType.forEach((oldMetricScore) => {
            const oldValue = oldMetricScore.values.get(key);
            debug('oldValue', key, oldValue);
            if (oldValue) {
              newMetricValue += oldValue;
            }
          });
          newMetricValue += value;
          newMetricValue /= windowSize + 1;
          newWindowedMetricsMap.set(
            key,
            roundToTwoDecimalPlaces(newMetricValue)
          );
          debug('set new Window', key, newMetricValue);
        } else {
          debug('init value');
          newWindowedMetricsMap.set(key, value);
        }

        // calculate continuously aggregated scores

        const oldMetricAggregated =
          applicationMetrics.aggregatedMetricScores.get(metricName);
        const oldMetricScores = oldMetricAggregated?.values;

        // Init metrics (first run)
        if (!oldMetricAggregated) {
          debug('init agg Metric', newMetricScore.values);
          applicationMetrics.aggregatedMetricScores.set(
            metricName,
            newMetricScore
          );
        } else if (oldMetricScores) {
          // update metric scores (subsequent runs)
          const oldScore = oldMetricScores.get(key);
          if (oldScore) {
            debug('udpate agg Metric', key, value + 0.5 * oldScore);
            applicationMetrics.aggregatedMetricScores
              .get(metricName)
              ?.values.set(
                key,
                roundToTwoDecimalPlaces(value + 0.5 * oldScore)
              );
          }
        }
      });

      // Update min max for continuously aggregated metric scores

      let newMinAgg: number = 0;
      let newMaxAgg: number = 0;

      if (applicationMetrics.aggregatedMetricScores.get(metricName)) {
        applicationMetrics.aggregatedMetricScores
          .get(metricName)!
          .values.forEach((value) => {
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
          values:
            applicationMetrics.aggregatedMetricScores.get(metricName)!.values,
        };

        applicationMetrics.aggregatedMetricScores.set(
          metricName,
          newMetricScoreObject
        );

        // this.aggregatedMetricScores.get(metricName)!.max = newMaxAgg;
        // this.aggregatedMetricScores.get(metricName)!.min = newMinAgg;
      }

      // Finally, set new Metrics for windowed mode

      if (newWindowedMetricsMap.size > 0) {
        debug('new window map', newWindowedMetricsMap);

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

        debug('new window map objects', Object.values(newWindowedMetricsMap));

        const newMetricScoreObject = {
          name: metricName,
          mode: 'aggregatedHeatmap',
          description: newMetricScore.description,
          min: roundToTwoDecimalPlaces(newMin),
          max: roundToTwoDecimalPlaces(newMax),
          values: newWindowedMetricsMap,
        };
        debug('new Metric Score', newMetricScoreObject);

        if (applicationMetrics.differenceMetricScores?.get(metricName)) {
          applicationMetrics.differenceMetricScores
            .get(metricName)
            ?.push(newMetricScoreObject);
        } else {
          applicationMetrics.differenceMetricScores.set(metricName, [
            newMetricScoreObject,
          ]);
        }
        debug('Windowed metrics', applicationMetrics.differenceMetricScores);
      }
    }
  });
  applicationMetrics.metricsArray.push(newScores);
}
