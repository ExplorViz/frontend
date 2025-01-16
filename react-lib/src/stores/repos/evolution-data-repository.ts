import { createStore } from "zustand/vanilla";
import {
  CommitTree,
  AppNameCommitTreeMap,
  CommitComparison,
} from "react-lib/src/utils/evolution-schemes/evolution-data";
import { StructureLandscapeData } from "../../utils/landscape-schemes/structure-data";
import {
  combineStructureLandscapeData,
  createEmptyStructureLandscapeData,
} from "react-lib/src/utils/landscape-structure-helpers";
import {
  ApplicationMetrics,
  ApplicationMetricsCode,
} from "../../utils/metric-schemes/metric-data";

interface EvolutionDataRepositoryState {
  _appNameCommitTreeMap: AppNameCommitTreeMap;
  _evolutionStructureLandscapeData: Map<string, StructureLandscapeData>;
  _combinedStructureLandscapeData: StructureLandscapeData;
  _appNameToCommitIdToApplicationMetricsCodeMap: Map<
    string,
    Map<string, ApplicationMetricsCode>
  >;
  _commitsToCommitComparisonMap: Map<string, CommitComparison>;
  resetAppNameToCommitIdToApplicationMetricsCodeMap: () => void;
  resetEvolutionStructureLandscapeData: () => void;
  resetAppNameCommitTreeMap: () => void;
  resetCommitsToCommitComparisonMap: () => void;
}

export const useEvolutionDataRepositoryeState =
  createStore<EvolutionDataRepositoryState>((set, get) => ({
    _appNameCommitTreeMap: new Map<string, CommitTree>(),
    _evolutionStructureLandscapeData: new Map<string, StructureLandscapeData>(),
    _combinedStructureLandscapeData: createEmptyStructureLandscapeData(),
    _appNameToCommitIdToApplicationMetricsCodeMap: new Map<
      string,
      Map<string, ApplicationMetricsCode>
    >(),
    _commitsToCommitComparisonMap: new Map<string, CommitComparison>(),
    resetAppNameToCommitIdToApplicationMetricsCodeMap: () => {
      get()._appNameToCommitIdToApplicationMetricsCodeMap = new Map();
    },
    resetEvolutionStructureLandscapeData: () => {
      get()._evolutionStructureLandscapeData = new Map();
      get()._combinedStructureLandscapeData =
        createEmptyStructureLandscapeData();
    },
    resetAppNameCommitTreeMap: () => {
      get()._appNameCommitTreeMap = new Map();
    },
    resetCommitsToCommitComparisonMap: () => {
      get()._commitsToCommitComparisonMap = new Map();
    },
  }));
