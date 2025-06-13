import { useRef } from 'react';
import {
  useCommitTreeStateStore,
  SelectedCommit,
} from 'explorviz-frontend/src/stores/commit-tree-state';
import { useRenderingServiceStore } from 'explorviz-frontend/src/stores/rendering-service';
import { useVisibilityServiceStore } from 'explorviz-frontend/src/stores/visibility-service';
import { useShallow } from 'zustand/react/shallow';
import Dropdown from 'react-bootstrap/Dropdown';
import { DropdownButton } from 'react-bootstrap';

interface IArgs {
  selectedAppName: string;
  selectedCommits: Map<string, SelectedCommit[]>;
}

export default function EvolutionRenderingButtons(args: IArgs) {
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
    const evolutionMode =
      visService.getCloneOfEvolutionModeRenderingConfiguration();

    if (x === 'dynamic') {
      evolutionMode.renderDynamic = true;
      evolutionMode.renderStatic = false;
      evolutionMode.renderOnlyDifferences = false;
    } else if (x === 'static') {
      evolutionMode.renderDynamic = false;
      evolutionMode.renderStatic = true;
      evolutionMode.renderOnlyDifferences = false;
    } else if (x === 'static+dynamic') {
      evolutionMode.renderDynamic = true;
      evolutionMode.renderStatic = true;
      evolutionMode.renderOnlyDifferences = false;
    } else if (x === 'difference') {
      evolutionMode.renderStatic = true;
      evolutionMode.renderOnlyDifferences = true;
    }
    visService.applyEvolutionModeRenderingConfiguration(evolutionMode);
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
          {args.selectedCommits.size > 0 && (
            <div className="col-md-auto">
              <DropdownButton
                id="dropdown-basic-button"
                title="Dropdown button"
                variant="secondary"
                drop="end"
              >
                <Dropdown.Item
                  key="Show Runtime Only"
                  onClick={() => changeAnalysisMode('dynamic')}
                >
                  Show Runtime Only
                </Dropdown.Item>
                <Dropdown.Item
                  key="Show Evolution Only"
                  onClick={() => changeAnalysisMode('static')}
                >
                  Show Evolution Only
                </Dropdown.Item>
                <Dropdown.Item
                  key="Show Runtime + Evolution"
                  onClick={() => changeAnalysisMode('static+dynamic')}
                >
                  Show Runtime + Evolution
                </Dropdown.Item>
                <Dropdown.Item
                  key="Evolution (Differences Only)"
                  onClick={() => changeAnalysisMode('difference')}
                >
                  Evolution (Differences Only)
                </Dropdown.Item>
              </DropdownButton>
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
