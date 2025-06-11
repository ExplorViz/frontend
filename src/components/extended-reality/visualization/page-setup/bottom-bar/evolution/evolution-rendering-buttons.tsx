import { useRef } from 'react';
import {
  useCommitTreeStateStore,
  SelectedCommit,
} from 'explorviz-frontend/src/stores/commit-tree-state';
import { useRenderingServiceStore } from 'explorviz-frontend/src/stores/rendering-service';
import { useVisibilityServiceStore } from 'explorviz-frontend/src/stores/visibility-service';
import { useShallow } from 'zustand/react/shallow';

interface IArgs {
  selectedAppName: string;
  selectedCommits: Map<string, SelectedCommit[]>;
}

export default function EvolutionRenderingButtons(args: IArgs) {
  const showSelectionButton = useRenderingServiceStore(
    (state) => state._userInitiatedStaticDynamicCombination
  );

  const commitTreeState = useCommitTreeStateStore(
    useShallow((state) => ({
      resetSelectedCommits: state.resetSelectedCommits,
    }))
  );

  const renderingService = useRenderingServiceStore(
    useShallow((state) => ({
      triggerRenderingForSelectedCommits:
        state.triggerRenderingForSelectedCommits,
    }))
  );

  const visService = useVisibilityServiceStore(
    useShallow((state) => ({
      configuration: state._evolutionModeRenderingConfiguration,
      applyEvolutionModeRenderingConfiguration:
        state.applyEvolutionModeRenderingConfiguration,
      getCloneOfEvolutionModeRenderingConfiguration:
        state.getCloneOfEvolutionModeRenderingConfiguration,
    }))
  );

  const checkboxValues = useRef(
    visService.getCloneOfEvolutionModeRenderingConfiguration()
  );

  const unselectAllSelectedCommits = () => {
    commitTreeState.resetSelectedCommits();
    renderingService.triggerRenderingForSelectedCommits();
  };

  const changeAnalysisMode = (x: any) => {
    const newEvolutionModeRenderingConfiguration =
      visService.getCloneOfEvolutionModeRenderingConfiguration();

    if (x === 'dynamic') {
      newEvolutionModeRenderingConfiguration.renderDynamic =
        !newEvolutionModeRenderingConfiguration.renderDynamic;
    } else if (x === 'static') {
      newEvolutionModeRenderingConfiguration.renderStatic =
        !newEvolutionModeRenderingConfiguration.renderStatic;
    } else if (x === 'difference') {
      newEvolutionModeRenderingConfiguration.renderOnlyDifferences =
        !newEvolutionModeRenderingConfiguration.renderOnlyDifferences;
    }
    visService.applyEvolutionModeRenderingConfiguration(
      newEvolutionModeRenderingConfiguration
    );
  };

  return (
    <div className="col-md-auto">
      {args.selectedAppName && (
        <div className="row justify-content-md-center">
          {(args.selectedCommits.get(args.selectedAppName)?.length === 1 ||
            args.selectedCommits.get(args.selectedAppName)?.length === 2) && (
            <div className="col-md-auto">
              <div className="d-flex">
                <button
                  type="button"
                  className="btn btn-outline-dark"
                  onClick={() => unselectAllSelectedCommits()}
                >
                  Unselect all commits
                </button>
              </div>
            </div>
          )}
          {showSelectionButton && (
            <div className="col-md-auto">
              <div className="d-flex">
                <div className="mr-2">Show Runtime</div>
                <div className="d-flex">
                  <label className="wide-checkbox-container">
                    <input
                      type="checkbox"
                      checked={checkboxValues.current.renderDynamic}
                      onChange={() => changeAnalysisMode('dynamic')}
                    />
                    <span className="wide-checkbox"></span>
                  </label>
                </div>
              </div>
            </div>
          )}
          {showSelectionButton && (
            <div className="col-md-auto">
              <div className="d-flex">
                <div className="mr-2">Show Code</div>
                <div className="d-flex">
                  <label className="wide-checkbox-container">
                    <input
                      type="checkbox"
                      checked={checkboxValues.current.renderStatic}
                      onChange={() => changeAnalysisMode('static')}
                    />
                    <span className="wide-checkbox"></span>
                  </label>
                </div>
              </div>
            </div>
          )}
          {args.selectedCommits.get(args.selectedAppName)?.length === 2 && (
            <div className="col-md-auto">
              <div className="d-flex">
                <div style={{ marginRight: '4rem' }}>Only show differences</div>
                <div className="d-flex">
                  <label className="wide-checkbox-container">
                    <input
                      type="checkbox"
                      checked={visService.configuration.renderOnlyDifferences}
                      onChange={() => changeAnalysisMode('difference')}
                    />
                    <span className="wide-checkbox"></span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
