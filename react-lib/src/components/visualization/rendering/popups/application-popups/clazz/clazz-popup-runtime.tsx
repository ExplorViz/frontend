import React from 'react';

import { useHeatmapConfigurationStore } from 'react-lib/src/stores/heatmap/heatmap-configuration';
import { useApplicationRepositoryStore } from 'react-lib/src/stores/repos/application-repository';
import { Class } from 'react-lib/src/utils/landscape-schemes/structure-data';

type AllMetricScoresObject = {
  metricName: string;
  snapshotVal: number | undefined;
  contAggVal: number | undefined;
  winVal: number | undefined;
};

interface ClazzPopupRuntimeProps {
  clazz: Class;
  applicationId: string;
}

export default function ClazzPopupRuntime({
  clazz,
  applicationId,
}: ClazzPopupRuntimeProps) {
  const selectedMetric = useHeatmapConfigurationStore(
    (state) => state.getSelectedMetric
  )();
  const getById = useApplicationRepositoryStore((state) => state.getById);
  useHeatmapConfigurationStore((state) => state.selectedMetricName); // For reactivity on metric selection

  const name = clazz.name;
  const applicationMetricsForEncompassingApplication =
    getById(applicationId)?.applicationMetrics;

  const allMetrics = (() => {
    const applicationMetricsForCurrentApplication =
      applicationMetricsForEncompassingApplication;
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
          winValToShow = newestWinMetricScores.values.get(clazz.id);
        }

        const newEntry = {
          metricName: metric.name,
          snapshotVal: metric.values.get(clazz.id),
          contAggVal: aggMetrics?.values.get(clazz.id),
          winVal: winValToShow,
        };
        allClassMetricScores.push(newEntry);
      });
    }

    return allClassMetricScores;
  })();

  const metrics = (() => {
    const applicationMetricsForCurrentApplication =
      applicationMetricsForEncompassingApplication;
    const classMetrics: { name: string; value: number | undefined }[] = [];

    if (applicationMetricsForCurrentApplication) {
      const metrics =
        applicationMetricsForCurrentApplication.latestClazzMetricScores;
      metrics.forEach((metric) => {
        classMetrics.push({
          name: metric.name,
          value: metric.values.get(clazz.id),
        });
      });
    }
    return classMetrics;
  })();

  const contAggregatedMetrics = (() => {
    const applicationMetricsForCurrentApplication =
      applicationMetricsForEncompassingApplication;
    const classMetrics: { name: string; value: number | undefined }[] = [];

    if (applicationMetricsForCurrentApplication) {
      const metrics =
        applicationMetricsForCurrentApplication.aggregatedMetricScores;
      metrics.forEach((metric) => {
        classMetrics.push({
          name: metric.name,
          value: metric.values.get(clazz.id),
        });
      });
    }
    return classMetrics;
  })();

  const windowedMetrics = (() => {
    const applicationMetricsForCurrentApplication =
      applicationMetricsForEncompassingApplication;
    const classMetrics: { name: string; value: number | undefined }[] = [];

    if (applicationMetricsForCurrentApplication) {
      const metrics =
        applicationMetricsForCurrentApplication.differenceMetricScores;
      metrics.forEach((metric) => {
        const newWindowedScores = metric.at(-1);
        if (newWindowedScores) {
          classMetrics.push({
            name: newWindowedScores.name,
            value: newWindowedScores.values.get(clazz.id),
          });
        }
      });
    }
    return classMetrics;
  })();

  return (
    <table className="w-100">
      <thead>
        <tr>
          <th>Metric Name</th>
          <th className="pl-1 pr-1">{/* Snapshot */}</th>
          {/* <th className="pl-1 pr-1">Aggregated</th>
        <th>Windowed</th> */}
        </tr>
      </thead>
      <tbody>
        {allMetrics.map((metric) => {
          return selectedMetric!.name == metric.metricName ? (
            <tr>
              <td className="font-weight-bold text-primary">
                {metric.metricName}:
              </td>
              <td className="text-center font-weight-bold text-primary">
                {metric.snapshotVal}
              </td>
              {/* <td className="text-center font-weight-bold text-primary">
          {metric.contAggVal}
        </td>
        <td className="text-center font-weight-bold text-primary">
          {metric.winVal}
        </td> */}
            </tr>
          ) : (
            <tr>
              <td>{metric.metricName}:</td>
              <td className="text-center">{metric.snapshotVal}</td>
              {/* <td className="text-center">
              {metric.contAggVal}
            </td>
            <td className="text-center">
              {metric.winVal}
            </td> */}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
