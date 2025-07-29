import { useApplicationRepositoryStore } from 'explorviz-frontend/src/stores/repos/application-repository';
import { useEvolutionDataRepositoryStore } from 'explorviz-frontend/src/stores/repos/evolution-data-repository';
import {
  ApplicationMetricsCode,
  ClassMetricCode,
} from 'explorviz-frontend/src/utils/metric-schemes/metric-data';
import PopupData from 'explorviz-frontend/src/components/visualization/rendering/popups/popup-data';
import { Class } from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import { calculateFqn } from 'explorviz-frontend/src/utils/landscape-structure-helpers';
import HelpTooltip from 'explorviz-frontend/src/components/help-tooltip.tsx';
import { useCommitTreeStateStore } from 'explorviz-frontend/src/stores/commit-tree-state';

interface ClazzPopupCodeProps {
  popupData: PopupData;
}

export default function ClazzPopupCode({ popupData }: ClazzPopupCodeProps) {
  const getById = useApplicationRepositoryStore((state) => state.getById);
  const appNameToCommitIdToApplicationMetricsCodeMap =
    useEvolutionDataRepositoryStore(
      (state) => state._appNameToCommitIdToApplicationMetricsCodeMap
    );

  const getSelectedCommits = useCommitTreeStateStore(
    (state) => state.getSelectedCommits
  );

  const appName: string | undefined = (() => {
    const { applicationId: appId } = popupData;

    if (!appId?.length) {
      return undefined;
    }

    const appData = getById(appId);

    if (!appData) {
      return undefined;
    }

    return appData.application.name;
  })();

  const commitToAppMetricsCodeMap: Map<string, ApplicationMetricsCode> =
    (() => {
      if (!appName) {
        return new Map();
      }

      const selectedCommitToApplicationMetricsCodeMap =
        appNameToCommitIdToApplicationMetricsCodeMap.get(appName);

      if (!selectedCommitToApplicationMetricsCodeMap) {
        return new Map();
      }

      return selectedCommitToApplicationMetricsCodeMap;
    })();

  const commitIdToClassMetrics = (() => {
    const commitIdToClassMetric: Map<string, ClassMetricCode> = new Map();

    const fqnForClass = calculateFqn(popupData.entity as Class, '.');

    for (const [commitId, appMetricsCode] of commitToAppMetricsCodeMap) {
      const classMetric = appMetricsCode.classMetrics[fqnForClass];
      if (!classMetric) {
        continue;
      }
      commitIdToClassMetric.set(commitId, classMetric);
    }

    return commitIdToClassMetric;
  })();

  const keyValuePairs = Array.from(commitIdToClassMetrics.entries());

  // Extract all unique metric keys to use as row headers
  const allMetricKeys = Array.from(
    new Set(
      keyValuePairs.flatMap(([, classMetric]) => Object.keys(classMetric))
    )
  );

  if (keyValuePairs.length === 0) {
    return (
      <div className="card mb-4">
        <div className="card-body">
          <p>No class metrics found for this entity across commits.</p>
        </div>
      </div>
    );
  }

  const isFirstCommitId = (commitId: string) => {
    if (!appName) {
      return false;
    }
    const firstCommit = getSelectedCommits().get(appName);
    if (!firstCommit || firstCommit.length === 0) {
      return false;
    }
    return firstCommit[0].commitId === commitId;
  };

  const getMetricDiff = (metricKey: string) => {
    if (keyValuePairs.length < 2) {
      return '';
    }
    const firstValue = keyValuePairs[0][1][metricKey as keyof ClassMetricCode];
    const secondValue = keyValuePairs[1][1][metricKey as keyof ClassMetricCode];
    if (firstValue === undefined || secondValue === undefined) {
      return '';
    }
    const diff = Number.parseInt(secondValue) - Number.parseInt(firstValue);
    return diff !== 0 ? ` (${diff > 0 ? '+' : ''}${diff})` : '';
  };

  return (
    <div className="card mb-4">
      <div className="card-body">
        <table className="table table-sm">
          <thead>
            <tr>
              {/* First header cell for the metric names */}
              <th>Metric</th>
              {/* Headers for each commit */}
              {keyValuePairs.map(([commitId, _]) => (
                <th className="text-left" key={commitId + '-tooltip'}>
                  {'C-' + (isFirstCommitId(commitId) ? '1' : '2')}
                  <HelpTooltip title={commitId} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Rows for each metric */}
            {allMetricKeys.map((metricKey) => (
              <tr key={metricKey}>
                <th>{metricKey}:</th>
                {/* Data cells for each commit's metric value */}
                {keyValuePairs.map(([commitId, classMetric], index) => (
                  <td key={commitId + '-' + metricKey} className="text-left">
                    {/* Check if the metric exists for this commit, otherwise display N/A*/}
                    {classMetric[metricKey as keyof ClassMetricCode] !==
                    undefined
                      ? String(
                          classMetric[metricKey as keyof ClassMetricCode]
                        ) + (index == 1 ? getMetricDiff(metricKey) : '')
                      : 'N/A'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
