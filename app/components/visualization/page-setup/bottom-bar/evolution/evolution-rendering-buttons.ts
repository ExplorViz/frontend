import Component from '@glimmer/component';
import CommitTreeStateService, {
  SelectedCommit,
} from 'explorviz-frontend/services/commit-tree-state';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import RenderingService from 'explorviz-frontend/services/rendering-service';
import VisibilityService from 'explorviz-frontend/services/visibility-service';

interface IArgs {
  selectedAppName: string;
  selectedCommits: Map<string, SelectedCommit[]>;
}

export default class EvolutionRenderingButtons extends Component<IArgs> {
  @service('rendering-service')
  renderingService!: RenderingService;

  @service('visibility-service')
  visibilityService!: VisibilityService;

  @service('commit-tree-state')
  commitTreeStateService!: CommitTreeStateService;

  get showSelectionButton() {
    return this.renderingService.userInitiatedStaticDynamicCombination;
  }

  get checkboxValues() {
    return this.visibilityService.getCloneOfEvolutionModeRenderingConfiguration();
  }

  get numberOfSelectedCommitsForCurrentApp() {
    return this.args.selectedCommits.get(this.args.selectedAppName)?.length;
  }

  @action
  unselectAllSelectedCommits() {
    this.commitTreeStateService.resetSelectedCommits();
    this.renderingService.triggerRenderingForSelectedCommits();
  }

  @action
  changeRenderingMode(x: any) {
    const newEvolutionModeRenderingConfiguration =
      this.visibilityService.getCloneOfEvolutionModeRenderingConfiguration();
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
    this.visibilityService.applyEvolutionModeRenderingConfiguration(
      newEvolutionModeRenderingConfiguration
    );
  }
}
