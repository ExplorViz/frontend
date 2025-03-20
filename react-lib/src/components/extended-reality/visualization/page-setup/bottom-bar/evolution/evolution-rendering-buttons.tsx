import React, { useEffect, useRef } from 'react';
import {
  useCommitTreeStateStore,
  SelectedCommit,
} from 'react-lib/src/stores/commit-tree-state';
import { useRenderingServiceStore } from 'react-lib/src/stores/rendering-service';
import { useVisibilityServiceStore } from 'react-lib/src/stores/visibility-service';

interface IArgs {
  selectedAppName: string;
  selectedCommits: Map<string, SelectedCommit[]>;
}

export default function EvolutionRenderingButtons(args: IArgs) {
  const showSelectionButton = useRenderingServiceStore(
    (state) => state._userInitiatedStaticDynamicCombination
  );
  const checkboxValues = useVisibilityServiceStore((state) =>
    state.getCloneOfEvolutionModeRenderingConfiguration()
  );

  const unselectAllSelectedCommits = () => {
    useCommitTreeStateStore.getState().resetSelectedCommits();
    useRenderingServiceStore.getState().triggerRenderingForSelectedCommits();
  };

  const changeAnalysisMode = (x: any) => {
    const newEvolutionModeRenderingConfiguration = useVisibilityServiceStore
      .getState()
      .getCloneOfEvolutionModeRenderingConfiguration();
    if (x === 'dynamic') {
      if (newEvolutionModeRenderingConfiguration.renderDynamic) {
        newEvolutionModeRenderingConfiguration.renderDynamic = false;
      } else {
        newEvolutionModeRenderingConfiguration.renderDynamic = true;
      }
    } else if (x === 'static') {
      if (newEvolutionModeRenderingConfiguration.renderStatic) {
        newEvolutionModeRenderingConfiguration.renderStatic = false;
      } else {
        newEvolutionModeRenderingConfiguration.renderStatic = true;
      }
    } else if (x === 'difference') {
      if (newEvolutionModeRenderingConfiguration.renderOnlyDifferences) {
        newEvolutionModeRenderingConfiguration.renderOnlyDifferences = false;
      } else {
        newEvolutionModeRenderingConfiguration.renderOnlyDifferences = true;
      }
    }
    useVisibilityServiceStore
      .getState()
      .applyEvolutionModeRenderingConfiguration(
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
                  onClick={unselectAllSelectedCommits}
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
                      checked={checkboxValues.renderDynamic}
                      onClick={() => changeAnalysisMode('dynamic')}
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
                      checked={checkboxValues.renderStatic}
                      onClick={() => changeAnalysisMode('static')}
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
                <div className="mr-2">Only show differences</div>
                <div className="d-flex">
                  <label className="wide-checkbox-container">
                    <input
                      type="checkbox"
                      checked={checkboxValues.renderOnlyDifferences}
                      onClick={() => changeAnalysisMode('difference')}
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
