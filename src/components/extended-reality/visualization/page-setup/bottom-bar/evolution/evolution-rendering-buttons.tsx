import { useCommitTreeStateStore } from 'explorviz-frontend/src/stores/commit-tree-state';
import { useRenderingServiceStore } from 'explorviz-frontend/src/stores/rendering-service';
import { useVisibilityServiceStore } from 'explorviz-frontend/src/stores/visibility-service';
import { useEffect, useState } from 'react';
import { DropdownButton } from 'react-bootstrap';
import Dropdown from 'react-bootstrap/Dropdown';
import { useShallow } from 'zustand/react/shallow';

export default function EvolutionRenderingButtons() {
  const commitTreeState = useCommitTreeStateStore(
    useShallow((state) => ({
      resetSelectedCommits: state.resetSelectedCommits,
    }))
  );

  const [modeLabel, setModeLabel] = useState<string>('');

  const { evoConfig } = useVisibilityServiceStore(
    useShallow((state) => ({
      evoConfig: state._evolutionModeRenderingConfiguration,
    }))
  );

  useEffect(() => {
    if (evoConfig.renderOnlyDifferences) {
      setModeLabel('Evolution (Differences Only)');
    } else if (evoConfig.renderDynamic && evoConfig.renderStatic) {
      setModeLabel('Show Runtime + Evolution');
    } else if (evoConfig.renderDynamic) {
      setModeLabel('Show Runtime Only');
    } else {
      setModeLabel('Show Evolution Only');
    }
  }, [evoConfig]);

  const renderingService = useRenderingServiceStore(
    useShallow((state) => ({
      triggerRenderingForSelectedCommits:
        state.triggerRenderingForSelectedCommits,
    }))
  );

  const getCurrentSelectedApplicationName = useCommitTreeStateStore(
    (state) => state.getCurrentSelectedApplicationName
  );

  const { getSelectedCommits } = useCommitTreeStateStore(
    useShallow((state) => ({
      getSelectedCommits: state.getSelectedCommits,
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
      evolutionMode.renderDynamic = false;
      evolutionMode.renderOnlyDifferences = true;
    }
    visService.applyEvolutionModeRenderingConfiguration(evolutionMode);
  };

  return (
    <div className="col-md-auto">
      {getCurrentSelectedApplicationName() && (
        <div className="row justify-content-md-center">
          {(getSelectedCommits().get(getCurrentSelectedApplicationName())
            ?.length === 1 ||
            getSelectedCommits().get(getCurrentSelectedApplicationName())
              ?.length === 2) && (
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
          {getSelectedCommits().size > 0 && (
            <div className="col-md-auto">
              <DropdownButton
                id="dropdown-basic-button"
                title={modeLabel}
                variant="secondary"
                drop="end"
              >
                <Dropdown.Item
                  key="Show Evolution Only"
                  onClick={() => {
                    changeAnalysisMode('static');
                  }}
                >
                  Show Evolution Only
                </Dropdown.Item>
                <Dropdown.Item
                  key="Show Runtime Only"
                  onClick={() => {
                    changeAnalysisMode('dynamic');
                  }}
                >
                  Show Runtime Only
                </Dropdown.Item>
                <Dropdown.Item
                  key="Show Runtime + Evolution"
                  onClick={() => {
                    changeAnalysisMode('static+dynamic');
                  }}
                >
                  Show Runtime + Evolution
                </Dropdown.Item>
                <Dropdown.Item
                  key="Evolution (Differences Only)"
                  onClick={() => {
                    changeAnalysisMode('difference');
                  }}
                >
                  Evolution (Differences Only)
                </Dropdown.Item>
              </DropdownButton>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
