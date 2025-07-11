import HelpTooltip from 'explorviz-frontend/src/components/help-tooltip.tsx';
import PopupData from 'explorviz-frontend/src/components/visualization/rendering/popups/popup-data';
import { useApplicationRepositoryStore } from 'explorviz-frontend/src/stores/repos/application-repository';
import { useEvolutionDataRepositoryStore } from 'explorviz-frontend/src/stores/repos/evolution-data-repository';
import { Class } from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import {
  ApplicationMetricsCode,
  ClassMetricCode,
} from 'explorviz-frontend/src/utils/metric-schemes/metric-data';

interface ClazzPopupCodeProps {
  popupData: PopupData;
}

export default function ClazzPopupCode({ popupData }: ClazzPopupCodeProps) {
  const getById = useApplicationRepositoryStore((state) => state.getById);
  const appNameToCommitIdToApplicationMetricsCodeMap =
    useEvolutionDataRepositoryStore(
      (state) => state._appNameToCommitIdToApplicationMetricsCodeMap
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

  const classnameToCommitAndClassMetricsArray = (() => {
    const classnameToCommitAndClassMetricsArray: Map<
      string,
      { commitId: string; classMetric: ClassMetricCode }[]
    > = new Map();

    const commitIdToClassMetricsMap: Map<
      string,
      Map<string, ClassMetricCode>
    > = new Map();

    const fqnForClass = (popupData.entity as Class).fqn!;

    for (const [commitId, appMetricsCode] of commitToAppMetricsCodeMap) {
      const classMetric = appMetricsCode.classMetrics.find((obj) =>
        obj.hasOwnProperty(fqnForClass)
      );

      if (!classMetric) {
        //return commitIdToClassMetricsMap;
        continue;
      }

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
          <div className="card mb-4" key={classname}>
            <div className="card-header">
              <strong>Name:</strong>
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
                          <th className="text-left" key={index}>
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
                          <th
                            className="text-left"
                            key={commitAndClassMetricsObject.commitId}
                          >
                            {commitAndClassMetricsObject.classMetric.loc}
                          </th>
                        );
                      }
                    )}
                  </tr>
                  {/* <tr>
                    <th>LCOM4:</th>
                    {commitAndClassMetricsArray.map(
                      (commitAndClassMetricsObject) => {
                        return (
                          <th
                            className="text-left"
                            key={commitAndClassMetricsObject.commitId}
                          >
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
                          <th
                            className="text-left"
                            key={commitAndClassMetricsObject.commitId}
                          >
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
                          <th
                            className="text-left"
                            key={commitAndClassMetricsObject.commitId}
                          >
                            {
                              commitAndClassMetricsObject.classMetric
                                .cyclomatic_complexity_weighted
                            }
                          </th>
                        );
                      }
                    )}
                  </tr> */}
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
