import { staticMetricNames } from 'explorviz-frontend/services/repos/static-metrics-repository';
import {
  ApplicationHeatmapData,
  Metric,
} from 'heatmap/services/heatmap-configuration';

const windowSize = 9;


export default function calculateHeatmap(
  applicationHeatmap: ApplicationHeatmapData,
  newScores: Metric[],
) {
  applicationHeatmap.latestClazzMetricScores = newScores;
  function roundToTwoDecimalPlaces(num: number): number {
    return Math.round((num + Number.EPSILON) * 100) / 100;
  }

  // calculate new aggregated (cont and windowed) metric scores
  newScores.forEach((newMetricScore) => {
    const metricName = newMetricScore.name;
    if(!staticMetricNames.includes(metricName)) { // Do not apply this aggregated logic for static metrics
      console.log("neswScore");
      if (Object.values(newMetricScore)) {
        applicationHeatmap.metrics.push(newMetricScore);
  
        const newWindowedMetricsMap = new Map<string, number>();
  
        const oldScoresForMetricType =
          applicationHeatmap.metricsArray.slice(-windowSize);
        const oldScoresForMetricTypeFlattened = oldScoresForMetricType.flat();
  
        // console.log('all old Scores flattened', oldScoresForMetricTypeFlattened);
  
        // update values
        newMetricScore.values.forEach((value, key) => {
          // calculate windowed scores
  
          const oldScoresFilteredMetricType =
            oldScoresForMetricTypeFlattened.filter(
              (metric) => metric.name === metricName
            );
  
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
            newMetricValue /= windowSize + 1;
            newWindowedMetricsMap.set(
              key,
              roundToTwoDecimalPlaces(newMetricValue)
            );
            // console.log('set new Window', key, newMetricValue);
          } else {
            // console.log('init value');
            newWindowedMetricsMap.set(key, value);
          }
  
          // calculate continuously aggregated scores
  
          const oldMetricAggregated =
            applicationHeatmap.aggregatedMetricScores.get(metricName);
          const oldMetricScores = oldMetricAggregated?.values;
  
          // Init metrics (first run)
          if (!oldMetricAggregated) {
            // console.log('init agg Metric', newMetricScore.values);
            applicationHeatmap.aggregatedMetricScores.set(
              metricName,
              newMetricScore
            );
          } else if (oldMetricScores) {
            // update metric scores (subsequent runs)
            const oldScore = oldMetricScores.get(key);
            if (oldScore) {
              // console.log('udpate agg Metric', key, value + 0.5 * oldScore);
              applicationHeatmap.aggregatedMetricScores
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
  
        if (applicationHeatmap.aggregatedMetricScores.get(metricName)) {
          applicationHeatmap.aggregatedMetricScores
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
              applicationHeatmap.aggregatedMetricScores.get(metricName)!.values,
          };
  
          applicationHeatmap.aggregatedMetricScores.set(
            metricName,
            newMetricScoreObject
          );
  
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
  
          if (applicationHeatmap.differenceMetricScores?.get(metricName)) {
            applicationHeatmap.differenceMetricScores
              .get(metricName)
              ?.push(newMetricScoreObject);
          } else {
            applicationHeatmap.differenceMetricScores.set(metricName, [
              newMetricScoreObject,
            ]);
          }
          // console.log('new windowed metrics', this.differenceMetricScores);
        }
      }
    }
  });
  applicationHeatmap.metricsArray.push(newScores);
}
