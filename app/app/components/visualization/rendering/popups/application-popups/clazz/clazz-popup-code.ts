import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import EvolutionDataRepository from 'explorviz-frontend/services/repos/evolution-data-repository';
import { useCommitTreeStateStore } from 'react-lib/src/stores/commit-tree-state';
// import ApplicationRepository from 'explorviz-frontend/services/repos/application-repository';
import { useApplicationRepositoryStore } from 'react-lib/src/stores/repos/application-repository';
import {
  ApplicationMetricsCode,
  ClassMetricCode,
} from 'react-lib/src/utils/metric-schemes/metric-data';
import PopupData from '../../popup-data';
import { Class } from 'react-lib/src/utils/landscape-schemes/structure-data';
import { calculateFqn } from 'react-lib/src/utils/landscape-structure-helpers';
import HelpTooltip from 'react-lib/src/components/help-tooltip.tsx';

interface Args {
  popupData: PopupData;
}

export default class ClazzPopup extends Component<Args> {
  helpTooltipComponent = HelpTooltip;

  @service('repos/evolution-data-repository')
  evolutionDataRepository!: EvolutionDataRepository;

  // @service('repos/application-repository')
  // applicationRepo!: ApplicationRepository;

  // @service('commit-tree-state')
  // commitTreeStateService!: CommitTreeStateService;

  get fileName() {
    return (this.args.popupData.entity as Class).name;
  }

  get classnameToCommitAndClassMetricsArray() {
    const commitToAppMetricsCodeMap = this.commitToAppMetricsCodeMap;

    const classnameToCommitAndClassMetricsArray: Map<
      string,
      { commitId: string; classMetric: ClassMetricCode }[]
    > = new Map();

    const commitIdToClassMetricsMap: Map<
      string,
      Map<string, ClassMetricCode>
    > = new Map();

    const fqnForClass = calculateFqn(this.args.popupData.entity as Class, '/');

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
  }

  get commitToAppMetricsCodeMap(): Map<string, ApplicationMetricsCode> {
    if (!this.appName) {
      return new Map();
    }

    const selectedCommitToApplicationMetricsCodeMap =
      this.evolutionDataRepository.appNameToCommitIdToApplicationMetricsCodeMap.get(
        this.appName
      );

    if (!selectedCommitToApplicationMetricsCodeMap) {
      return new Map();
    }

    return selectedCommitToApplicationMetricsCodeMap;
  }

  get getNumOfCurrentSelectedCommits() {
    if (!this.appName) {
      return [];
    }

    const selectedCommits =
      useCommitTreeStateStore
        .getState()
        .getSelectedCommits()
        .get(this.appName) ?? [];

    return selectedCommits.length;
  }

  get appName(): string | undefined {
    const { applicationId: appId } = this.args.popupData;

    if (!appId?.length) {
      return undefined;
    }
    const appData = useApplicationRepositoryStore.getState().getById(appId);
    // const appData = this.applicationRepo.getById(appId);

    if (!appData) {
      return undefined;
    }

    return appData.application.name;
  }

  // local helper function
  shortCommitIdentifierForTable = (tableIndex: number) => {
    return `C-${tableIndex + 1}`;
  };
}
