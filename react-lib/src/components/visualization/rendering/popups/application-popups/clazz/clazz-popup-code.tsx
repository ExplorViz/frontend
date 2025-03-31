import React from 'react';

import { useApplicationRepositoryStore } from 'explorviz-frontend/src/stores/repos/application-repository';
import { useEvolutionDataRepositoryStore } from 'explorviz-frontend/src/stores/repos/evolution-data-repository';
import { useCommitTreeStateStore } from 'explorviz-frontend/src/stores/commit-tree-state';
import {
  ApplicationMetricsCode,
  ClassMetricCode,
} from 'explorviz-frontend/src/utils/metric-schemes/metric-data';
import PopupData from 'explorviz-frontend/src/components/visualization/rendering/popups/popup-data';
import { Class } from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import { calculateFqn } from 'explorviz-frontend/src/utils/landscape-structure-helpers';
import HelpTooltip from 'explorviz-frontend/src/components/help-tooltip.tsx';

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

  const fileName = (popupData.entity as Class).name;

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

  const getNumOfCurrentSelectedCommits = (() => {
    if (!appName) {
      return [];
    }

    const selectedCommits = getSelectedCommits().get(appName) ?? [];

    return selectedCommits.length;
  })();

  const classnameToCommitAndClassMetricsArray = (() => {
    const classnameToCommitAndClassMetricsArray: Map<
      string,
      { commitId: string; classMetric: ClassMetricCode }[]
    > = new Map();

    const commitIdToClassMetricsMap: Map<
      string,
      Map<string, ClassMetricCode>
    > = new Map();

    const fqnForClass = calculateFqn(popupData.entity as Class, '/');

    for (const [commitId, appMetricsCode] of commitToAppMetricsCodeMap) {
      const indexOfFileName = appMetricsCode.files.findIndex((file) =>
        file.includes(fqnForClass)
      );

      if (indexOfFileName === -1) {
        //return commitIdToClassMetricsMap;
        continue;
      }

      const classMetric = appMetricsCode.classMetrics[indexOfFileName];

      for (const [classFqn, metricsData] of Object.entries(classMetric)) {
        const fqnDelimited = classFqn.split('.');
        const simpleClassName = fqnDelimited[fqnDelimited.length - 1];

        if (classnameToCommitAndClassMetricsArray.has(simpleClassName)) {
          classnameToCommitAndClassMetricsArray
            .get(simpleClassName)
            ?.push({ commitId, classMetric: metricsData });
        } else {
          classnameToCommitAndClassMetricsArray.set(simpleClassName, [
            { commitId, classMetric: metricsData },
          ]);
        }

        commitIdToClassMetricsMap.set(
          commitId,
          new Map([[simpleClassName, metricsData]])
        );
      }
    }

    return classnameToCommitAndClassMetricsArray;
  })();

  const keyValuePairs = Array.from(
    classnameToCommitAndClassMetricsArray.entries()
  );

  return (
    <>
      {keyValuePairs.map(([classname, commitAndClassMetricsArray]) => {
        return (
          <div className="card mb-4">
            <div className="card-header">
              <strong>Class Name:</strong>
              {classname}
            </div>
            <div className="card-body">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Commit:</th>
                    {commitAndClassMetricsArray.map(
                      (commitAndClassMetricsObject, index) => {
                        return (
                          <th className="text-left">
                            {shortCommitIdentifierForTable(index)}
                            <HelpTooltip
                              title={commitAndClassMetricsObject.commitId}
                            />
                          </th>
                        );
                      }
                    )}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th>LOC:</th>
                    {commitAndClassMetricsArray.map(
                      (commitAndClassMetricsObject) => {
                        return (
                          <th className="text-left">
                            {commitAndClassMetricsObject.classMetric.loc}
                          </th>
                        );
                      }
                    )}
                  </tr>
                  <tr>
                    <th>LCOM4:</th>
                    {commitAndClassMetricsArray.map(
                      (commitAndClassMetricsObject) => {
                        return (
                          <th className="text-left">
                            {commitAndClassMetricsObject.classMetric.LCOM4}
                          </th>
                        );
                      }
                    )}
                  </tr>
                  <tr>
                    <th>Cyclomatic complexity:</th>
                    {commitAndClassMetricsArray.map(
                      (commitAndClassMetricsObject) => {
                        return (
                          <th className="text-left">
                            {
                              commitAndClassMetricsObject.classMetric
                                .cyclomatic_complexity
                            }
                          </th>
                        );
                      }
                    )}
                  </tr>
                  <tr>
                    <th>Cyclomatic complexity (weighted):</th>
                    {commitAndClassMetricsArray.map(
                      (commitAndClassMetricsObject) => {
                        return (
                          <th className="text-left">
                            {
                              commitAndClassMetricsObject.classMetric
                                .cyclomatic_complexity_weighted
                            }
                          </th>
                        );
                      }
                    )}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </>
  );
}

function shortCommitIdentifierForTable(tableIndex: number) {
  return `C-${tableIndex + 1}`;
}
